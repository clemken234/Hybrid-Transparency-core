import { ethers } from "ethers";
import { poseidon2 } from "poseidon-lite";

const REGISTRY_ABI = [
  "function issueLicense(uint256 leafCommitment) public",
  "function revokeLicense(uint256 index, uint256[] calldata siblings) public",
  "function getAllLeaves() public view returns (uint256[] memory)",
  "function getRoot() public view returns (uint256)",
  "function admin() public view returns (address)"
];

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS!;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;

export async function getContractWithSigner() {
  const privateKey = process.env.ADMIN_PRIVATE_KEY!;
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);
}

export async function issueLicenseOnChain(leafHash: string) {
  try {
    const contract = await getContractWithSigner();
    const tx = await contract.issueLicense(BigInt(leafHash));
    await tx.wait();
    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    console.error("On-chain issuance failed:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchAllLeavesOnChain(): Promise<string[]> {
  const contract = await getContractWithSigner();
  const leaves = await contract.getAllLeaves();
  return leaves.map((leaf: bigint) => "0x" + BigInt(leaf).toString(16).padStart(64, "0"));
}

const TREE_DEPTH = 20;
const ZERO = BigInt(0);

export function computeMerklePath(
  leafHash: string,
  leaves: string[],
  expectedLeafIndex?: number
): { path: string[]; leafIndex: number; root: string } | null {
  const normalizedLeaf = leafHash.toLowerCase();
  const normalizedLeaves = leaves.map((leaf) => leaf.toLowerCase());

  const leafIndex =
    expectedLeafIndex !== undefined
    && expectedLeafIndex >= 0
    && expectedLeafIndex < normalizedLeaves.length
    && normalizedLeaves[expectedLeafIndex] === normalizedLeaf
      ? expectedLeafIndex
      : normalizedLeaves.indexOf(normalizedLeaf);

  if (leafIndex === -1) return null;

  let level = new Map<number, bigint>();
  for (let i = 0; i < normalizedLeaves.length; i++) {
    const value = BigInt(normalizedLeaves[i]);
    if (value !== ZERO) level.set(i, value);
  }

  const path: string[] = [];
  let index = leafIndex;

  for (let depth = 0; depth < TREE_DEPTH; depth++) {
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    const sibling = level.get(siblingIndex) ?? ZERO;
    path.push("0x" + sibling.toString(16).padStart(64, "0"));

    const nextLevel = new Map<number, bigint>();
    const parents = new Set([...level.keys()].map((key) => Math.floor(key / 2)));
    parents.add(Math.floor(index / 2));

    for (const parent of parents) {
      const left = level.get(parent * 2) ?? ZERO;
      const right = level.get(parent * 2 + 1) ?? ZERO;
      const hash = left === ZERO && right === ZERO ? ZERO : poseidon2([left, right]);
      if (hash !== ZERO) nextLevel.set(parent, hash);
    }

    index = Math.floor(index / 2);
    level = nextLevel;
  }

  const root = "0x" + (level.get(0) ?? ZERO).toString(16).padStart(64, "0");
  return { path, leafIndex, root };
}
