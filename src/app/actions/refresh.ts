"use server";

import { revalidatePath } from "next/cache";

export async function revalidateCurrentPathAction(pathname: string) {
  try {
    if (pathname) {
      revalidatePath(pathname);
    }
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error revalidating path:", error);
    return { success: false };
  }
}

