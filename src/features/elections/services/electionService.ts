import prisma from "@/lib/prisma";
import { ElectionStatus } from "@/generated/prisma/client";
import {
    GroupElectionDTO,
    GroupStudentDTO,
    ElectionCandidateDTO,
    ElectionTallyDTO,
    ElectionWinnersDTO,
    TeacherElectionGroupSummary
} from "../types";

export class ElectionService {
    /**
     * Get all groups of a teacher with active/recent election status
     */
    async getTeacherGroupsWithElections(teacherId: string): Promise<TeacherElectionGroupSummary[]> {
        const groups = await prisma.group.findMany({
            where: {
                OR: [
                    { teachers: { some: { id: teacherId } } },
                    { courses: { some: { teacherId: teacherId } } }
                ]
            },
            orderBy: { name: "asc" },
            include: {
                program: {
                    select: { name: true }
                },
                students: {
                    where: { banned: { not: true } },
                    select: { id: true }
                },
                groupEnrollments: {
                    where: { isCurrent: true, status: "ACTIVE" },
                    select: { studentId: true }
                },
                elections: {
                    where: {
                        status: { not: "CANCELLED" }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });

        // Map and load active election for each group
        const results: TeacherElectionGroupSummary[] = [];

        for (const g of groups) {
            // Distinct student count
            const studentIds = new Set<string>();
            g.students.forEach(s => studentIds.add(s.id));
            g.groupEnrollments.forEach(e => studentIds.add(e.studentId));
            const totalStudents = studentIds.size;

            let activeElection: GroupElectionDTO | null = null;
            if (g.elections.length > 0) {
                activeElection = await this.getGroupElectionDetails(g.id, teacherId);
            }

            results.push({
                id: g.id,
                name: g.name,
                programName: g.program?.name,
                totalStudents,
                activeElection
            });
        }

        return results;
    }

    /**
     * Get election details for a specific group with full transparency tally
     */
    async getGroupElectionDetails(groupId: string, currentUserId?: string): Promise<GroupElectionDTO | null> {
        // Find latest active election or latest closed election
        const election = await prisma.groupElection.findFirst({
            where: {
                groupId,
                status: { not: "CANCELLED" }
            },
            orderBy: [
                // Prioritize POSTULATION or VOTING, then latest createdAt
                { createdAt: "desc" }
            ],
            include: {
                group: {
                    include: {
                        program: { select: { name: true } },
                        environment: { select: { name: true, location: true } },
                        courses: { select: { title: true }, take: 1 },
                        students: {
                            where: { banned: { not: true } },
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                                profile: { select: { identificacion: true } }
                            },
                            orderBy: { name: "asc" }
                        },
                        groupEnrollments: {
                            where: { isCurrent: true, status: "ACTIVE" },
                            include: {
                                student: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        image: true,
                                        profile: { select: { identificacion: true } }
                                    }
                                }
                            }
                        }
                    }
                },
                createdByTeacher: {
                    select: {
                        name: true,
                        email: true,
                        profile: { select: { identificacion: true } }
                    }
                },
                candidates: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                                profile: {
                                    select: { identificacion: true }
                                }
                            }
                        },
                        votes: {
                            select: { id: true }
                        }
                    },
                    orderBy: { createdAt: "asc" }
                },
                votes: {
                    select: {
                        id: true,
                        studentId: true,
                        candidateId: true,
                        isBlankVote: true
                    }
                }
            }
        });

        if (!election) return null;

        // Map all unique eligible students in group
        const studentMap = new Map<string, { id: string; name: string; email: string; image?: string | null; identificacion?: string }>();
        election.group.students.forEach(s => {
            studentMap.set(s.id, {
                id: s.id,
                name: s.name,
                email: s.email,
                image: s.image,
                identificacion: s.profile?.identificacion
            });
        });
        election.group.groupEnrollments.forEach(e => {
            if (e.student) {
                studentMap.set(e.student.id, {
                    id: e.student.id,
                    name: e.student.name,
                    email: e.student.email,
                    image: e.student.image,
                    identificacion: e.student.profile?.identificacion
                });
            }
        });
        const totalEligibleStudents = studentMap.size;

        // Tally votes
        const totalVotes = election.votes.length;
        const blankVotes = election.votes.filter(v => v.isBlankVote).length;
        const blankVotesPercentage = totalVotes > 0 ? Math.round((blankVotes / totalVotes) * 100) : 0;
        const participationRate = totalEligibleStudents > 0 ? Math.round((totalVotes / totalEligibleStudents) * 100) : 0;

        // Build candidate DTOs
        const candidatesDTO: ElectionCandidateDTO[] = election.candidates.map(c => {
            const votesCount = c.votes.length;
            const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
            return {
                id: c.id,
                studentId: c.studentId,
                name: c.student.name,
                email: c.student.email,
                image: c.student.image,
                identificacion: c.student.profile?.identificacion,
                proposal: c.proposal,
                createdAt: c.createdAt.toISOString(),
                votesCount,
                percentage
            };
        });

        // Sort candidates by votes descending for ranking
        const sortedCandidates = [...candidatesDTO].sort((a, b) => b.votesCount - a.votesCount);

        const tallyDTO: ElectionTallyDTO = {
            totalVotes,
            totalEligibleStudents,
            participationRate,
            blankVotes,
            blankVotesPercentage,
            candidatesTally: candidatesDTO.map(c => ({
                candidateId: c.id,
                candidateName: c.name,
                votes: c.votesCount,
                percentage: c.percentage
            }))
        };

        // Check current user state
        let hasVoted = false;
        let userVoteCandidateId: string | null = null;
        let isUserVotedBlank = false;
        let isUserPostulated = false;
        let userCandidacyId: string | null = null;

        if (currentUserId) {
            const userVote = election.votes.find(v => v.studentId === currentUserId);
            if (userVote) {
                hasVoted = true;
                userVoteCandidateId = userVote.candidateId;
                isUserVotedBlank = userVote.isBlankVote;
            }

            const userCandidate = election.candidates.find(c => c.studentId === currentUserId);
            if (userCandidate) {
                isUserPostulated = true;
                userCandidacyId = userCandidate.id;
            }
        }

        // Calculate winners if CLOSED (or display provisional leaders in tally)
        let winners: ElectionWinnersDTO | undefined = undefined;
        if (election.status === "CLOSED" || totalVotes > 0) {
            const first = sortedCandidates[0] || null;
            const second = sortedCandidates[1] || null;

            const isBlankVoteWinner = blankVotes > (first?.votesCount || 0);
            const isTieForFirst = Boolean(first && second && first.votesCount === second.votesCount && first.votesCount > 0);
            const third = sortedCandidates[2] || null;
            const isTieForSecond = Boolean(second && third && second.votesCount === third.votesCount && second.votesCount > 0);

            let summaryMessage = "";
            if (isBlankVoteWinner) {
                summaryMessage = "El Voto en Blanco obtuvo la mayoría de los votos emitidos.";
            } else if (isTieForFirst) {
                summaryMessage = "Existe un empate en el primer lugar entre los candidatos más votados.";
            } else if (first) {
                summaryMessage = `Vocero Principal: ${first.name}${second ? ` | Vocero Suplente: ${second.name}` : ""}`;
            }

            winners = {
                voceroPrincipal: isBlankVoteWinner ? null : first,
                voceroSuplente: isBlankVoteWinner ? null : (isTieForFirst ? null : second),
                isBlankVoteWinner,
                isTieForFirst,
                isTieForSecond,
                summaryMessage
            };
        }

        let currentVoceroPrincipalId = election.group.voceroPrincipalId;
        let currentVoceroSuplenteId = election.group.voceroSuplenteId;

        if (election.status === "CLOSED" && winners?.voceroPrincipal) {
            if (election.group.voceroPrincipalId !== winners.voceroPrincipal.studentId) {
                currentVoceroPrincipalId = winners.voceroPrincipal.studentId;
                currentVoceroSuplenteId = winners.voceroSuplente?.studentId || null;
                await prisma.group.update({
                    where: { id: election.groupId },
                    data: {
                        voceroPrincipalId: currentVoceroPrincipalId,
                        voceroSuplenteId: currentVoceroSuplenteId
                    }
                }).catch(() => {});
            }
        }

        return {
            id: election.id,
            groupId: election.groupId,
            groupName: election.group.name,
            programName: election.group.program?.name,
            createdByTeacherId: election.createdByTeacherId,
            createdByTeacherName: election.createdByTeacher.name,
            createdByTeacherEmail: election.createdByTeacher.email || undefined,
            createdByTeacherDoc: election.createdByTeacher.profile?.identificacion || undefined,
            environmentName: election.group.environment?.name ? (election.group.environment.location ? `${election.group.environment.name} (${election.group.environment.location})` : election.group.environment.name) : null,
            courseName: election.group.courses?.[0]?.title || null,
            title: election.title,
            description: election.description,
            status: election.status,
            allowBlankVote: election.allowBlankVote,
            minCandidates: election.minCandidates,
            startedAt: election.startedAt?.toISOString() || null,
            endedAt: election.endedAt?.toISOString() || null,
            voceroPrincipalId: currentVoceroPrincipalId,
            voceroSuplenteId: currentVoceroSuplenteId,
            createdAt: election.createdAt.toISOString(),
            updatedAt: election.updatedAt.toISOString(),
            candidates: candidatesDTO,
            tally: tallyDTO,
            hasVoted,
            userVoteCandidateId,
            isUserVotedBlank,
            isUserPostulated,
            userCandidacyId,
            winners,
            groupStudents: Array.from(studentMap.values()).map(st => {
                const isPrincipal = Boolean(currentVoceroPrincipalId && currentVoceroPrincipalId === st.id);
                const isSuplente = Boolean(currentVoceroSuplenteId && currentVoceroSuplenteId === st.id);
                const isCandidate = election.candidates.some(c => c.studentId === st.id);
                const voted = election.votes.some(v => v.studentId === st.id);
                return {
                    id: st.id,
                    name: st.name,
                    email: st.email,
                    image: st.image,
                    identificacion: st.identificacion,
                    hasVoted: voted,
                    isCandidate,
                    isVocero: isPrincipal,
                    isSuplente: isSuplente
                };
            }).sort((a, b) => {
                if (a.isVocero) return -1;
                if (b.isVocero) return 1;
                if (a.isSuplente) return -1;
                if (b.isSuplente) return 1;
                if (a.isCandidate && !b.isCandidate) return -1;
                if (!a.isCandidate && b.isCandidate) return 1;
                return a.name.localeCompare(b.name);
            })
        };
    }

    /**
     * Get election details for a student according to their active group
     */
    async getStudentElection(studentId: string): Promise<{
        election: GroupElectionDTO | null;
        group: { id: string; name: string; programName?: string } | null;
    }> {
        // Resolve student's group
        const student = await prisma.user.findUnique({
            where: { id: studentId },
            select: {
                groupId: true,
                group: {
                    select: {
                        id: true,
                        name: true,
                        program: { select: { name: true } }
                    }
                },
                groupEnrollments: {
                    where: { isCurrent: true, status: "ACTIVE" },
                    include: {
                        group: {
                            select: {
                                id: true,
                                name: true,
                                program: { select: { name: true } }
                            }
                        }
                    },
                    take: 1
                }
            }
        });

        const activeGroup = student?.group || student?.groupEnrollments[0]?.group || null;

        if (!activeGroup) {
            return { election: null, group: null };
        }

        const election = await this.getGroupElectionDetails(activeGroup.id, studentId);

        return {
            election,
            group: {
                id: activeGroup.id,
                name: activeGroup.name,
                programName: activeGroup.program?.name
            }
        };
    }

    /**
     * Teacher creates and enables an election (starts POSTULATION stage)
     */
    async createElection(
        groupId: string,
        teacherId: string,
        title?: string,
        description?: string
    ): Promise<GroupElectionDTO> {
        // Validate teacher permission on group
        const hasPermission = await prisma.group.findFirst({
            where: {
                id: groupId,
                OR: [
                    { teachers: { some: { id: teacherId } } },
                    { courses: { some: { teacherId } } }
                ]
            }
        });

        if (!hasPermission) {
            // Check if admin
            const user = await prisma.user.findUnique({ where: { id: teacherId }, select: { role: true } });
            if (user?.role !== "admin") {
                throw new Error("No tienes permisos de instructor sobre este grupo o ficha.");
            }
        }

        // Check if there is already an active election
        const existingActive = await prisma.groupElection.findFirst({
            where: {
                groupId,
                status: { in: ["POSTULATION", "VOTING"] }
            }
        });

        if (existingActive) {
            throw new Error("Ya existe una elección activa para este grupo.");
        }

        // Reset previously elected vocero tags on the group because a new election has begun
        await prisma.group.update({
            where: { id: groupId },
            data: {
                voceroPrincipalId: null,
                voceroSuplenteId: null
            }
        });

        const newElection = await prisma.groupElection.create({
            data: {
                groupId,
                createdByTeacherId: teacherId,
                title: title?.trim() || "Elección de Vocero y Suplente",
                description: description?.trim() || "Proceso democrático para la elección de Vocero Principal y Vocero Suplente de la ficha.",
                status: "POSTULATION",
                allowBlankVote: true,
                minCandidates: 2
            }
        });

        const details = await this.getGroupElectionDetails(groupId, teacherId);
        if (!details) throw new Error("Error al recuperar los detalles de la elección creada.");
        return details;
    }

    /**
     * Student postulates as candidate
     */
    async postulateCandidate(electionId: string, studentId: string, proposal?: string): Promise<void> {
        const election = await prisma.groupElection.findUnique({
            where: { id: electionId },
            include: {
                group: {
                    include: {
                        students: { select: { id: true } },
                        groupEnrollments: { where: { isCurrent: true, status: "ACTIVE" }, select: { studentId: true } }
                    }
                }
            }
        });

        if (!election) throw new Error("La elección no existe.");
        if (election.status !== "POSTULATION") {
            throw new Error("El periodo de postulaciones no está abierto.");
        }

        // Verify student belongs to group
        const isEnrolled = election.group.students.some(s => s.id === studentId) ||
            election.group.groupEnrollments.some(e => e.studentId === studentId);

        if (!isEnrolled) {
            throw new Error("Solo los aprendices pertenecientes a esta ficha pueden postularse.");
        }

        // Upsert or create candidate
        await prisma.electionCandidate.create({
            data: {
                electionId,
                studentId,
                proposal: proposal?.trim() || "Sin propuesta escrita aún."
            }
        });
    }

    /**
     * Student withdraws their candidacy before voting starts
     */
    async withdrawCandidate(electionId: string, studentId: string): Promise<void> {
        const election = await prisma.groupElection.findUnique({
            where: { id: electionId }
        });

        if (!election) throw new Error("La elección no existe.");
        if (election.status !== "POSTULATION") {
            throw new Error("No puedes retirar tu postulación una vez iniciadas las votaciones.");
        }

        await prisma.electionCandidate.deleteMany({
            where: {
                electionId,
                studentId
            }
        });
    }

    /**
     * Teacher starts voting phase (requires min 2 candidates)
     */
    async startVoting(electionId: string, teacherId: string): Promise<void> {
        const election = await prisma.groupElection.findUnique({
            where: { id: electionId },
            include: {
                candidates: true
            }
        });

        if (!election) throw new Error("La elección no existe.");
        if (election.status !== "POSTULATION") {
            throw new Error("La elección no se encuentra en fase de postulación.");
        }

        if (election.candidates.length < election.minCandidates) {
            throw new Error(`Se requieren mínimo ${election.minCandidates} postulantes para iniciar las elecciones (uno para vocero y otro para suplente).`);
        }

        await prisma.groupElection.update({
            where: { id: electionId },
            data: {
                status: "VOTING",
                startedAt: new Date()
            }
        });
    }

    /**
     * Student casts their irreversible vote (candidate or blank)
     */
    async castVote(
        electionId: string,
        studentId: string,
        candidateId?: string,
        isBlankVote: boolean = false
    ): Promise<void> {
        const election = await prisma.groupElection.findUnique({
            where: { id: electionId },
            include: {
                group: {
                    include: {
                        students: { select: { id: true } },
                        groupEnrollments: { where: { isCurrent: true, status: "ACTIVE" }, select: { studentId: true } }
                    }
                },
                candidates: { select: { id: true } }
            }
        });

        if (!election) throw new Error("La elección no existe.");
        if (election.status !== "VOTING") {
            throw new Error("La votación no se encuentra activa en este momento.");
        }

        // Verify student belongs to group
        const isEnrolled = election.group.students.some(s => s.id === studentId) ||
            election.group.groupEnrollments.some(e => e.studentId === studentId);

        if (!isEnrolled) {
            throw new Error("Solo los aprendices de esta ficha están autorizados para votar.");
        }

        // Check if student already voted
        const existingVote = await prisma.electionVote.findUnique({
            where: {
                electionId_studentId: {
                    electionId,
                    studentId
                }
            }
        });

        if (existingVote) {
            throw new Error("Ya has ejercido tu voto. El voto es definitivo y no se puede modificar.");
        }

        // Validate vote target
        if (isBlankVote) {
            await prisma.electionVote.create({
                data: {
                    electionId,
                    studentId,
                    candidateId: null,
                    isBlankVote: true
                }
            });
        } else {
            if (!candidateId) {
                throw new Error("Debes seleccionar un candidato o marcar voto en blanco.");
            }

            const candidateExists = election.candidates.some(c => c.id === candidateId);
            if (!candidateExists) {
                throw new Error("El candidato seleccionado no pertenece a esta elección.");
            }

            await prisma.electionVote.create({
                data: {
                    electionId,
                    studentId,
                    candidateId,
                    isBlankVote: false
                }
            });
        }
    }

    /**
     * Teacher closes the election and finalizes results
     */
    async closeElection(electionId: string, teacherId: string): Promise<void> {
        const election = await prisma.groupElection.findUnique({
            where: { id: electionId },
            include: {
                candidates: {
                    include: {
                        votes: { select: { id: true } }
                    }
                },
                votes: {
                    select: { isBlankVote: true }
                }
            }
        });

        if (!election) throw new Error("La elección no existe.");
        if (election.status !== "VOTING") {
            throw new Error("Solo se puede finalizar una elección que esté en proceso de votación.");
        }

        const blankVotesCount = election.votes.filter(v => v.isBlankVote).length;
        const sortedCandidates = [...election.candidates].sort((a, b) => b.votes.length - a.votes.length);
        const first = sortedCandidates[0] || null;
        const second = sortedCandidates[1] || null;

        const isBlankVoteWinner = blankVotesCount > (first?.votes?.length || 0);
        const isTieForFirst = Boolean(first && second && first.votes.length === second.votes.length && first.votes.length > 0);

        let voceroPrincipalId: string | null = null;
        let voceroSuplenteId: string | null = null;

        if (!isBlankVoteWinner && !isTieForFirst && first) {
            voceroPrincipalId = first.studentId;
            const third = sortedCandidates[2] || null;
            const isTieForSecond = Boolean(second && third && second.votes.length === third.votes.length && second.votes.length > 0);
            if (!isTieForSecond && second) {
                voceroSuplenteId = second.studentId;
            }
        }

        await prisma.$transaction([
            prisma.groupElection.update({
                where: { id: electionId },
                data: {
                    status: "CLOSED",
                    endedAt: new Date()
                }
            }),
            prisma.group.update({
                where: { id: election.groupId },
                data: {
                    voceroPrincipalId,
                    voceroSuplenteId
                }
            })
        ]);
    }

    /**
     * Cancel or archive election
     */
    async cancelElection(electionId: string, teacherId: string): Promise<void> {
        const election = await prisma.groupElection.findUnique({
            where: { id: electionId }
        });

        if (!election) throw new Error("La elección no existe.");

        await prisma.$transaction([
            prisma.groupElection.update({
                where: { id: electionId },
                data: {
                    status: "CANCELLED"
                }
            }),
            prisma.group.update({
                where: { id: election.groupId },
                data: {
                    voceroPrincipalId: null,
                    voceroSuplenteId: null
                }
            })
        ]);
    }
}

export const electionService = new ElectionService();
