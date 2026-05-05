import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
        if (!adminPrivateKey) {
            return NextResponse.json({ success: false, error: "Admin private key missing" }, { status: 503 });
        }

        const payload = await req.json();

        // Two entry paths:
        // A) Citizen-initiated: sends leafHash + pendingOnly:true — store PENDING, no chain tx
        // B) Admin-initiated: admin form sends { publicName, subject } — anchor immediately
        let { leafHash, publicName, subject, licenseID: incomingLicenseID, pendingOnly } = payload;

        if (!leafHash) {
            // Admin-initiated — compute leaf hash server-side
            const { computeLeafHash, stringToFieldHex } = await import('@/lib/commitment');
            const randomBytes = crypto.getRandomValues(new Uint8Array(32));
            const secret = "0x" + Array.from(randomBytes).map((b: number) => b.toString(16).padStart(2, "0")).join("");
            const privateLicenseData = stringToFieldHex(subject?.licenseID || "");
            const publicNameField = stringToFieldHex(publicName || subject?.name || "");
            leafHash = await computeLeafHash(secret, privateLicenseData, publicNameField);
        }

        // Citizen-initiated: just save as PENDING, admin will anchor later
        if (pendingOnly) {
            await db.upsert({
                leaf_hash: leafHash,
                public_name: publicName || "Unknown",
                status: "PENDING",
                is_revoked: false,
                created_at: new Date().toISOString(),
            });
            return NextResponse.json({ success: true });
        }

        // Admin-initiated: anchor to chain then save
        const { ethers } = await import('ethers');
        const REGISTRY_ABI = [
            "function issueLicense(uint256 leafCommitment) public",
            "function getAllLeaves() public view returns (uint256[] memory)",
            "function getRoot() public view returns (uint256)",
            "function revokeLicense(uint256 index, uint256[] calldata siblings) public",
            "function admin() public view returns (address)"
        ];
        const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS!;
        const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;

        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(adminPrivateKey, provider);
        const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

        const currentLeaves = await contract.getAllLeaves();
        const leafIndex = Number(currentLeaves.length);

        const tx = await contract.issueLicense(BigInt(leafHash));
        const receipt = await tx.wait();

        const newRoot = await contract.getRoot();
        const merkleRoot = "0x" + BigInt(newRoot).toString(16).padStart(64, "0");

        const licenseID = incomingLicenseID || subject?.licenseID || ("N01-26-" + Math.floor(100000 + Math.random() * 900000));

        await db.upsert({
            license_id: licenseID,
            leaf_hash: leafHash,
            public_name: publicName || subject?.name || "Unknown",
            subject,
            leaf_index: leafIndex,
            merkle_root: merkleRoot,
            tx_hash: receipt.hash,
            status: "ACTIVE",
            is_revoked: false,
            created_at: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, licenseID, leafIndex, merkleRoot, txHash: receipt.hash });
    } catch (error: any) {
        console.error("create-registry error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
