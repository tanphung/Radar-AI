import { NextResponse } from "next/server";
import { generateNonce } from "siwe";

import { writeNonceCookie } from "@/lib/auth/session";

export async function GET() {
  const nonce = generateNonce();
  await writeNonceCookie(nonce);
  return NextResponse.json({ nonce });
}
