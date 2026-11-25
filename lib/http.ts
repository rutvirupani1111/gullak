import "server-only";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type { z } from "zod";
import { HttpError } from "./db";

export function ok(body: unknown, status = 200, init?: ResponseInit) {
  return NextResponse.json(body, { status, ...init });
}

export function fail(status: number, code: string, hi: string, en: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: code, message_hi: hi, message_en: en, ...extra }, { status });
}

/** Wraps a route handler: origin check on writes, zod errors and HttpErrors become proper JSON. */
export function route<C = unknown>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.get("origin");
        const site = process.env.NEXT_PUBLIC_SITE_URL;
        const host = req.headers.get("host");
        if (origin && site && origin !== site && new URL(origin).host !== host) {
          return fail(403, "bad_origin", "Yeh request is site se nahi aayi.", "This request did not come from this site.");
        }
      }
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.code, e.hi, e.en, e.extra);
      if (e && typeof e === "object" && "issues" in e) {
        return fail(400, "invalid", "Kuch jaankari galat hai.", "Some details are not valid.", { issues: (e as z.ZodError).issues.slice(0, 5) });
      }
      console.error(e);
      return fail(500, "server_error", "Kuch gadbad hui. Dobara try karo.", "Something went wrong. Try again.");
    }
  };
}

export async function body<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let data: unknown = {};
  try {
    const t = await req.text();
    data = t ? JSON.parse(t) : {};
  } catch {
    throw new HttpError(400, "invalid_json", "Request samajh nahi aayi.", "The request could not be read.");
  }
  return schema.parse(data);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "0.0.0.0";
}
