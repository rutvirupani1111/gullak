"use client";
import { OwnerNavInner } from "./Small";
export default function OwnerNav(p: { slug: string; name: string }) {
  return <OwnerNavInner {...p} />;
}
