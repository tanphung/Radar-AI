import { NextResponse, type NextRequest } from "next/server";

import { readSession } from "@/lib/auth/session";
import {
  getWatchlistFor,
  setWatchlistFor,
} from "@/lib/supabase/client";

const MAX_COIN_IDS = 200;

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const coinIds = await getWatchlistFor(session.address);
    return NextResponse.json({ coinIds });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "store read failed" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { coinIds?: unknown };
  try {
    body = (await req.json()) as { coinIds?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!Array.isArray(body.coinIds)) {
    return NextResponse.json({ error: "coinIds must be array" }, { status: 400 });
  }
  const clean = body.coinIds
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .slice(0, MAX_COIN_IDS);

  try {
    await setWatchlistFor(session.address, clean);
    return NextResponse.json({ ok: true, count: clean.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "store write failed" },
      { status: 500 },
    );
  }
}
