import { NextResponse } from 'next/server';
import { generateIdentityProof } from '@/utils/zk-prove';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      secret,
      private_license_data,
      merklePath,
      leafIndex,
      public_name,
      publicMerkleRoot
    } = body;

    if (!secret || !private_license_data || !merklePath || leafIndex === undefined || !public_name || !publicMerkleRoot) {
      return NextResponse.json({ error: "Missing required proof inputs" }, { status: 400 });
    }

    console.log("Received proof generation request on backend for:", public_name);

    const result = await generateIdentityProof(
      secret,
      private_license_data,
      merklePath,
      leafIndex,
      public_name,
      publicMerkleRoot
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Backend proof generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate proof on the backend" },
      { status: 500 }
    );
  }
}
