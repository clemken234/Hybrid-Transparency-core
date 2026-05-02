import { ethers } from "ethers";

const REGISTRY_ABI = [
  "event LicenseIssued(address indexed executor, uint256 indexed leafCommitment, uint256 timestamp)",
  "function issueLicense(uint256 leafCommitment) public",
  "function getAllLeaves() public view returns (uint256[] memory)",
  "function getRoot() public view returns (uint256)",
  "function admin() public view returns (address)"
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
