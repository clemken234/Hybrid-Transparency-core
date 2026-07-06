import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    
    // The deployed backend verifier URL
    const VERIFIER_API_URL = process.env.NEXT_PUBLIC_VERIFIER_API_URL || "https://technician-ace-core-produced.trycloudflare.com/api/verify";
    // Proxy the request server-side to bypass browser CORS preflight
    const response = await fetch(VERIFIER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Bypasses Localtunnel's warning page
        'Bypass-Tunnel-Reminder': 'true',
        // Bypasses ngrok's warning page (in case you switch tunnel providers)
        'ngrok-skip-browser-warning': 'true'
      },
      body: body
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return NextResponse.json(
        { error: `Verifier responded with status ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Verifier proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
