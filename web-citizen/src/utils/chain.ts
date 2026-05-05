import { ethers } from "ethers";
import { poseidon3 } from "poseidon-lite";

/**
 * Mirrors Noir's bn254::hash_2([l, r]):
 *   state = [0, l, r]  →  x5_3(state)[0]
 * This is poseidon3([0n, l, r]), NOT poseidon2([l, r]).
 */
function poseidonHash2(l: bigint, r: bigint): bigint {
  return poseidon3([BigInt(0), l, r]);
}

const REGISTRY_ABI = [
  "event LicenseIssued(address indexed executor, uint256 indexed leafCommitment, uint256 timestamp)",
  "event ProofVerified(address indexed prover, bytes32 nullifier, uint256 timestamp)",
  "function issueLicense(uint256 leafCommitment) public",
  "function getAllLeaves() public view returns (uint256[] memory)",
  "function getRoot() public view returns (uint256)",
  "function admin() public view returns (address)",
  "function verifyIdentityProof(bytes calldata proof, bytes32 nullifier, bytes32[] calldata publicInputs) external returns (bool)",
  "function isNullifierUsed(bytes32 nullifier) external view returns (bool)"
];

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS!;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;

export async function getContract() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
}

export async function getContractWithSigner(privateKey: string) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);
}

export async function fetchAllLeaves() {
  try {
    const contract = await getContract();
    const leaves = await contract.getAllLeaves();
    return leaves.map((l: any) => "0x" + BigInt(l).toString(16).padStart(64, '0'));
  } catch (error) {
    console.error("Failed to fetch leaves from chain:", error);
    return [];
  }
}

export async function fetchRoot(): Promise<string | null> {
  try {
    const contract = await getContract();
    const root = await contract.getRoot();
    return "0x" + BigInt(root).toString(16).padStart(64, '0');
  } catch {
    return null;
  }
}

export async function fetchAllLeavesSafe(): Promise<string[]> {
  try {
    return await fetchAllLeaves();
  } catch {
    return [];
  }
}

const TREE_DEPTH = 20;
const ZERO = BigInt(0);

/**
 * Sparse Merkle path computation — matches circuit main.nr depth-20 Poseidon BN254 tree.
 * Uses a Map instead of 2^20 array to avoid 8MB allocation.
 */
export function computeMerklePath(
  leafHash: string,
  leaves: string[]
): { path: string[]; leafIndex: number; root: string } | null {
  const leafIndex = leaves.indexOf(leafHash);
  if (leafIndex === -1) return null;

  let level: Map<number, bigint> = new Map();
  for (let i = 0; i < leaves.length; i++) {
    const v = BigInt(leaves[i]);
    if (v !== ZERO) level.set(i, v);
  }

  const path: string[] = [];
  let idx = leafIndex;

  for (let d = 0; d < TREE_DEPTH; d++) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    const sibling = level.get(siblingIdx) ?? ZERO;
    path.push("0x" + sibling.toString(16).padStart(64, "0"));

    const nextLevel: Map<number, bigint> = new Map();
    const parents = new Set([...level.keys()].map(k => Math.floor(k / 2)));
    parents.add(Math.floor(idx / 2));

    for (const p of parents) {
      const l = level.get(p * 2) ?? ZERO;
      const r = level.get(p * 2 + 1) ?? ZERO;
      const hash = (l === ZERO && r === ZERO) ? ZERO : poseidonHash2(l, r);
      if (hash !== ZERO) nextLevel.set(p, hash);
    }

    idx = Math.floor(idx / 2);
    level = nextLevel;
  }

  const root = "0x" + (level.get(0) ?? ZERO).toString(16).padStart(64, "0");
  return { path, leafIndex, root };
}

export async function submitProofToChain(
  proofHex: string,
  publicInputs: string[]
): Promise<{ txHash: string; nullifier: string }> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("MetaMask not found. Install MetaMask to submit proof.");
  }
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);

  // Random 32-byte nonce — one-time use, stored on-chain after submission
  const randomBytes = ethers.randomBytes(32);
  const nullifier = ethers.hexlify(randomBytes) as `0x${string}`;

  const proofBytes = ethers.getBytes(proofHex);
  const inputs: `0x${string}`[] = publicInputs.map(p =>
    ethers.zeroPadValue(ethers.hexlify(ethers.getBytes(p.startsWith("0x") ? p : "0x" + p)), 32) as `0x${string}`
  );

  const tx = await contract.verifyIdentityProof(proofBytes, nullifier, inputs);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, nullifier };
}
