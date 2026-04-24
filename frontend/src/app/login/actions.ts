"use server";

import { signIn } from "@/auth";

export async function signInWithGoogle(callbackUrl?: string) {
  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/studio";

  await signIn("google", { redirectTo });
}
