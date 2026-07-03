import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) {
      return NextResponse.json({ error: "Missing RPC URL config" }, { status: 500 });
    }

    const body = await request.text();

    // Proxy the request to the actual RPC URL
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // This header guarantees ngrok won't serve the HTML warning page
        'ngrok-skip-browser-warning': 'true'
      },
      body: body
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("RPC proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
