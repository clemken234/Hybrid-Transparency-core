import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeMerklePath, fetchAllLeavesOnChain, getContractWithSigner } from "@/utils/chain";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { leafHash } = await req.json();
    if (!leafHash) {
      return NextResponse.json({ success: false, error: "No hash provided" }, { status: 400 });
    }

    const normalizedLeafHash = String(leafHash).trim().toLowerCase();

    const identity = await db.findByLeafHash(normalizedLeafHash);
    if (!identity) {
      return NextResponse.json({ success: false, error: "Identity not found" }, { status: 404 });
    }

    if (identity.status === "REVOKED" || identity.is_revoked) {
      return NextResponse.json({ success: true, alreadyRevoked: true });
    }

    const leaves = await fetchAllLeavesOnChain();
    if (!leaves.length) {
      return NextResponse.json({ success: false, error: "No on-chain leaves found" }, { status: 409 });
    }

    const merkleProof = computeMerklePath(
      normalizedLeafHash,
      leaves,
      typeof identity.leaf_index === "number" ? identity.leaf_index : undefined
    );

    if (!merkleProof) {
      return NextResponse.json({ success: false, error: "Leaf not found on-chain" }, { status: 409 });
    }

    const contract = await getContractWithSigner();
    const siblings = merkleProof.path.map((node) => BigInt(node));
    const tx = await contract.revokeLicense(BigInt(merkleProof.leafIndex), siblings);
    await tx.wait();

    const newRoot = await contract.getRoot();
    const merkleRoot = "0x" + BigInt(newRoot).toString(16).padStart(64, "0");

    await db.update(normalizedLeafHash, { status: "REVOKED", is_revoked: true, merkle_root: merkleRoot });

    return NextResponse.json({ success: true, leafIndex: merkleProof.leafIndex, merkleRoot, txHash: tx.hash });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
