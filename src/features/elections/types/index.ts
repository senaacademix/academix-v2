import { ElectionStatus } from "@/generated/prisma/client";

export type { ElectionStatus };

export interface ElectionCandidateDTO {
    id: string;
    studentId: string;
    name: string;
    email: string;
    image?: string | null;
    identificacion?: string;
    proposal?: string | null;
    createdAt: string;
    votesCount: number;
    percentage: number;
}

export interface ElectionTallyDTO {
    totalVotes: number;
    totalEligibleStudents: number;
    participationRate: number;
    blankVotes: number;
    blankVotesPercentage: number;
    candidatesTally: {
        candidateId: string;
        candidateName: string;
        votes: number;
        percentage: number;
    }[];
}

export interface ElectionWinnersDTO {
    voceroPrincipal: ElectionCandidateDTO | null;
    voceroSuplente: ElectionCandidateDTO | null;
    isBlankVoteWinner: boolean;
    isTieForFirst: boolean;
    isTieForSecond: boolean;
    summaryMessage?: string;
}

export interface GroupElectionDTO {
    id: string;
    groupId: string;
    groupName: string;
    programName?: string;
    environmentName?: string | null;
    courseName?: string | null;
    createdByTeacherId: string;
    createdByTeacherName?: string;
    createdByTeacherEmail?: string;
    createdByTeacherDoc?: string;
    title: string;
    description?: string | null;
    status: ElectionStatus;
    allowBlankVote: boolean;
    minCandidates: number;
    startedAt?: string | null;
    endedAt?: string | null;
    voceroPrincipalId?: string | null;
    voceroSuplenteId?: string | null;
    createdAt: string;
    updatedAt: string;
    
    candidates: ElectionCandidateDTO[];
    tally: ElectionTallyDTO;
    
    // User context
    hasVoted: boolean;
    userVoteCandidateId?: string | null;
    isUserVotedBlank?: boolean;
    isUserPostulated: boolean;
    userCandidacyId?: string | null;

    // Results (especially when CLOSED or during transparent count)
    winners?: ElectionWinnersDTO;

    // All group students with their electoral roles
    groupStudents?: GroupStudentDTO[];
}

export interface GroupStudentDTO {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    identificacion?: string;
    hasVoted: boolean;
    isCandidate: boolean;
    isVocero: boolean;
    isSuplente: boolean;
}

export interface TeacherElectionGroupSummary {
    id: string;
    name: string;
    programName?: string;
    totalStudents: number;
    activeElection: GroupElectionDTO | null;
}
