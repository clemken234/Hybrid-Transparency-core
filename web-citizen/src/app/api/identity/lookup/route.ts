import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get("hash");

  if (!hash) {
    return NextResponse.json({ success: false, error: "Provide your leaf hash" }, { status: 400 });
  }

  // Off-chain registry removed. Identity lookup is not supported without Supabase.
  return NextResponse.json({ success: false, error: "Hash not in registry" }, { status: 404 });
}
