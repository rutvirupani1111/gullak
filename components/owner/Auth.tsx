"use client";
import { AuthForm } from "./Small";
export default function Auth({ mode }: { mode: "login" | "signup" | "recover" }) {
  return <AuthForm mode={mode} />;
}
