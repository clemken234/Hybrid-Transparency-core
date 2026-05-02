import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { leafHash, publicName } = await req.json();

    if (!leafHash || !publicName) {
      return NextResponse.json({ success: false, error: "leafHash and publicName are required" }, { status: 400 });
    }

    // Off-chain registry removed. Registration is local-only (localStorage).
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
