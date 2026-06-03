import { NextResponse } from "next/server";

import { readSession } from "@/lib/auth/session";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ address: null }, { status: 200 });
  }
  return NextResponse.json({ address: session.address });
}
