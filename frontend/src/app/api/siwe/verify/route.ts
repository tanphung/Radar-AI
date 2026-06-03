import { NextResponse, type NextRequest } from "next/server";
import { SiweMessage } from "siwe";

import {
  consumeNonceCookie,
  writeSessionCookie,
} from "@/lib/auth/session";

interface VerifyBody {
  message?: string;
  signature?: string;
}

export async function POST(req: NextRequest) {
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.message !== "string" || typeof body.signature !== "string") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const expectedNonce = await consumeNonceCookie();
  if (!expectedNonce) {
    return NextResponse.json({ error: "nonce expired" }, { status: 400 });
  }

  let parsed: SiweMessage;
  try {
    parsed = new SiweMessage(body.message);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "parse failed" },
      { status: 400 },
    );
  }

  try {
    const result = await parsed.verify({
      signature: body.signature,
      nonce: expectedNonce,
    });
    if (!result.success) {
      return NextResponse.json({ error: "verify failed" }, { status: 401 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "verify error" },
      { status: 401 },
    );
  }

  await writeSessionCookie(parsed.address);
  return NextResponse.json({ address: parsed.address.toLowerCase() });
}
