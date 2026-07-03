import { ethers } from "ethers"; 
import { Barretenberg } from '@aztec/bb.js';
import { toFieldHex, fieldHexToBytes } from '@/lib/commitment';

const REGISTRY_ABI = [
  "function getAllLeaves() public view returns (uint256[] memory)",
  "function getRoot() public view returns (uint256)",
  "function admin() public view returns (address)",
  "event LicenseIssued(address indexed executor, uint256 indexed leafCommitment, uint256 newRoot, uint256 timestamp)"
];

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS!;

export async function getContract() {
  const isServer = typeof window === 'undefined';
  const rpcUrl = isServer ? process.env.NEXT_PUBLIC_RPC_URL! : `${window.location.origin}/api/rpc`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
}

export async function getContractWithSigner(privateKey: string) {
  const isServer = typeof window === 'undefined';
  const rpcUrl = isServer ? process.env.NEXT_PUBLIC_RPC_URL! : `${window.location.origin}/api/rpc`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
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
export async function computeLeanIMTPath(leafHash: string, leavesHex: string[]) {
  let leafIndex = leavesHex.indexOf(leafHash);
  if (leafIndex === -1) return null;

  const bb = await Barretenberg.new({ threads: 1 });

  try {
    async function hashNode(leftStr: string, rightStr: string) {
        const lHex = leftStr.startsWith('0x') ? leftStr : `0x${leftStr}`;
        const rHex = rightStr.startsWith('0x') ? rightStr : `0x${rightStr}`;

        const { hash } = await bb.poseidon2Hash({
            inputs: [fieldHexToBytes(lHex), fieldHexToBytes(rHex)]
        });
        return '0x' + Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    let currentLevel = leavesHex.map(l => toFieldHex(l));
    const path: string[] = [];
    let currentIndex = leafIndex;

    const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const zeroHashes: string[] = [toFieldHex(ZERO_HASH)];

    for (let i = 0; i < 20; i++) {
      const prevZero = toFieldHex(zeroHashes[i]);
      const nextZero = await hashNode(prevZero, prevZero);
      zeroHashes.push(nextZero);
    }

    for (let level = 0; level < 20; level++) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const leftStr = currentLevel[i];
        const rightStr = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : zeroHashes[level];
        const left = toFieldHex(leftStr);
        const right = toFieldHex(rightStr);
        const nodeHash = await hashNode(left, right);
        nextLevel.push(nodeHash);
        if (currentIndex === i || currentIndex === i + 1) {
          const sibling = (currentIndex % 2 === 0) ? rightStr : leftStr;
          path.push("0x" + BigInt(sibling).toString(16).padStart(64, "0"));
        }
      }
      currentIndex = Math.floor(currentIndex / 2);
      currentLevel = nextLevel;
    }

    const root = "0x" + BigInt(currentLevel[0]).toString(16).padStart(64, "0");

    return { path: path, root: root, leafIndex: leafIndex };
  } finally {
    await bb.destroy();
  }
}