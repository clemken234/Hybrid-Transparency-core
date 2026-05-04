import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";

const REGISTRY_ABI = [
  "function issueLicense(uint256 leafCommitment) public",
  "function getAllLeaves() public view returns (uint256[] memory)",
];

export async function POST(req: Request) {
  try {
    const { leafHash, publicName } = await req.json();

    if (!leafHash || !publicName) {
      return NextResponse.json(
        { success: false, error: "leafHash and publicName are required" },
        { status: 400 }
      );
    }

    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

    if (!privateKey || !registryAddress || !rpcUrl) {
      return NextResponse.json(
        { success: false, error: "Server env config missing" },
        { status: 503 }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(registryAddress, REGISTRY_ABI, wallet);

    // Capture leaf index before inserting (it will be currentLeaves.length after insert)
    const currentLeaves = await contract.getAllLeaves();
    const leafIndex = Number(currentLeaves.length);

    const tx = await contract.issueLicense(BigInt(leafHash));
    await tx.wait();

    return NextResponse.json({ success: true, leafIndex, txHash: tx.hash });
  } catch (err: any) {
    console.error("register route error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
