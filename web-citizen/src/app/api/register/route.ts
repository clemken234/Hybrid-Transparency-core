import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { leafHash, publicName } = await req.json();

    if (!leafHash || !publicName) {
      return NextResponse.json(
        { success: false, error: "leafHash and publicName are required" },
        { status: 400 }
      );
    }

    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
    if (!adminUrl) {
      return NextResponse.json(
        { success: false, error: "Admin URL not configured" },
        { status: 503 }
      );
    }

    // Forward to admin — admin owns Supabase and chain anchoring
    const res = await fetch(`${adminUrl}/api/admin/create-registry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leafHash, publicName, pendingOnly: true }),
    });

    const data = await res.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || "Admin registration failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("register route error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
