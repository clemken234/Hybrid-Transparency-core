import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get("hash");

  if (!hash) {
    return NextResponse.json({ success: false, error: "Provide your leaf hash" }, { status: 400 });
  }

  try {
    const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

    if (!registryAddress || !rpcUrl) {
      return NextResponse.json({ success: false, error: "Server config missing" }, { status: 503 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(
      registryAddress,
      ["function getAllLeaves() public view returns (uint256[] memory)"],
      provider
    );

    const leaves: bigint[] = await contract.getAllLeaves();
    const normalizedInput = BigInt(hash);
    const found = leaves.some((l) => BigInt(l) === normalizedInput);

    if (!found) {
      return NextResponse.json({ success: false, error: "Hash not in registry" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("identity lookup error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
