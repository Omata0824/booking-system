"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function signInToAdmin() {
  await signIn("google", { redirectTo: "/admin" });
}

export async function signOutFromGoogle() {
  await signOut({ redirectTo: "/" });
}

export async function signOutFromAdmin() {
  await signOut({ redirectTo: "/admin/login" });
}
