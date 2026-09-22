"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { electionService } from "../services/electionService";
import { GroupElectionDTO } from "../types";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getGroupElectionAction(groupId: string): Promise<GroupElectionDTO | null> {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autenticado.");
    }
    return await electionService.getGroupElectionDetails(groupId, session.user.id);
}

export async function getStudentElectionAction() {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autenticado.");
    }
    return await electionService.getStudentElection(session.user.id);
}

export async function createElectionAction(
    groupId: string,
    title?: string,
    description?: string
) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autenticado.");
    }

    const election = await electionService.createElection(
        groupId,
        session.user.id,
        title,
        description
    );

    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/teacher/tools");
    revalidatePath("/dashboard/teacher/elections");
    revalidatePath("/dashboard/student/elections");
    revalidatePath("/dashboard/student");

    return { success: true, election };
}

export async function postulateCandidateAction(
    electionId: string,
    proposal?: string
) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autenticado.");
    }

    await electionService.postulateCandidate(electionId, session.user.id, proposal);

    revalidatePath("/dashboard/teacher/tools");
    revalidatePath("/dashboard/teacher/elections");
    revalidatePath("/dashboard/student/elections");

    return { success: true };
}

export async function withdrawCandidacyAction(electionId: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autenticado.");
    }

    await electionService.withdrawCandidate(electionId, session.user.id);

    revalidatePath("/dashboard/teacher/tools");
    revalidatePath("/dashboard/teacher/elections");
    revalidatePath("/dashboard/student/elections");

    return { success: true };
}

export async function startVotingAction(electionId: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autenticado.");
    }

    await electionService.startVoting(electionId, session.user.id);

    revalidatePath("/dashboard/teacher/tools");
    revalidatePath("/dashboard/teacher/elections");
    revalidatePath("/dashboard/student/elections");

    return { success: true };
}

export async function castVoteAction(
    electionId: string,
    candidateId?: string,
    isBlankVote: boolean = false
) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autenticado.");
    }

    await electionService.castVote(electionId, session.user.id, candidateId, isBlankVote);

    revalidatePath("/dashboard/teacher/tools");
    revalidatePath("/dashboard/teacher/elections");
    revalidatePath("/dashboard/student/elections");

    return { success: true };
}

export async function closeElectionAction(electionId: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autenticado.");
    }

    await electionService.closeElection(electionId, session.user.id);

    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/teacher/tools");
    revalidatePath("/dashboard/teacher/elections");
    revalidatePath("/dashboard/student/elections");

    return { success: true };
}

export async function cancelElectionAction(electionId: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autenticado.");
    }

    await electionService.cancelElection(electionId, session.user.id);

    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/teacher/tools");
    revalidatePath("/dashboard/teacher/elections");
    revalidatePath("/dashboard/student/elections");

    return { success: true };
}
