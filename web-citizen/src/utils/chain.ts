import { ethers } from "ethers"; // library to interact with the Ethereum Virtual Machine
import { Barretenberg, Fr } from '@aztec/bb.js'; // Fr to convert text into binaries

const REGISTRY_ABI = [
  "function getAllLeaves() public view returns (uint256[] memory)",
  "function getRoot() public view returns (uint256)",
  "function admin() public view returns (address)",
  "event LicenseIssued(address indexed executor, uint256 indexed leafCommitment, uint256 newRoot, uint256 timestamp)"
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

/**
 * Custom Asynchronous Standard Merkle Path Generator
 * Computes the exact sibling path natively using Aztec's Pedersen Hash WASM engine.
 * Guarantees 100% Hash Parity with the Noir Circuit's fixed depth-20 tree.
 */
export async function computeLeanIMTPath(
  leafHash: string,
  leavesHex: string[]
) {
  let leafIndex = leavesHex.indexOf(leafHash);
  if (leafIndex === -1) {
    console.error("Leaf not found in the on-chain tree!");
    return null;
  }

  // 1. Boot up the exact math engine Noir uses
  const bb = await Barretenberg.new();

  let currentLevel = leavesHex.map(l => Fr.fromString(l).toString());
  const path: string[] = [];
  let currentIndex = leafIndex;

  // 2. PRECOMPUTE EMPTY SUBTREE HASHES
  // We must know what an empty branch looks like at all 20 levels
  const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const zeroHashes: string[] = [Fr.fromString(ZERO_HASH).toString()];

  for (let i = 0; i < 20; i++) {
    const prevZero = Fr.fromString(zeroHashes[i]);
    const nextZero = await bb.pedersenHash([prevZero, prevZero], 0);
    zeroHashes.push(nextZero.toString());
  }

  // 3. Standard perfectly-balanced Merkle Tree Loop (Depth 20)
  for (let level = 0; level < 20; level++) {
    const nextLevel: string[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const leftStr = currentLevel[i];
      
      // THE FIX: Pad with the precomputed empty hash for THIS specific level
      const rightStr = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : zeroHashes[level];

      const left = Fr.fromString(leftStr);
      const right = Fr.fromString(rightStr);
      const hash = await bb.pedersenHash([left, right], 0);
      nextLevel.push(hash.toString());

      // If our citizen is in this pair, grab the sibling for the path!
      if (currentIndex === i || currentIndex === i + 1) {
        const sibling = (currentIndex % 2 === 0) ? rightStr : leftStr;
        // Convert the sibling back to hex format for Noir
        path.push("0x" + BigInt(sibling).toString(16).padStart(64, "0"));
      }
    }
    
    // Move up to the next level
    currentIndex = Math.floor(currentIndex / 2);
    currentLevel = nextLevel;
  }

  const root = "0x" + BigInt(currentLevel[0]).toString(16).padStart(64, "0");

  return {
    path: path,
    root: root,
    leafIndex: leafIndex
  };
}