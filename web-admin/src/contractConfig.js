// ==========================================
// 1. THE NATIONAL CHAIN (Localhost / Hardhat)
// This is your Private Government Database.
// ==========================================

// ⚠️ PASTE YOUR LOCALHOST ADDRESS HERE (Starts with 0x5Fb...)
export const LOCAL_REGISTRY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const REGISTRY_ABI = [
  "function Active(uint256 leafCommitment, uint256 newRoot) public",
  "function Revoke(uint256 index, uint256 newRoot) public",
  "function getRoot() public view returns (uint256)",
  "function getAllLeaves() public view returns (uint256[] memory)",
  "event LicenseIssued(address indexed executor, uint256 indexed leafCommitment, uint256 newRoot, uint256 timestamp)",
  "event LicenseRevoked(address indexed executor, uint256 indexed index, uint256 newRoot, uint256 timestamp)"
];


// ==========================================
// 2. THE PUBLIC CHAIN (Sepolia Testnet)
// This is the Public Bulletin Board for Verifiers.
// ==========================================

// ⚠️ PASTE YOUR SEPOLIA ADDRESS HERE (Your brand new unique address)
export const PUBLIC_ANCHOR_ADDRESS = "0xc4eA2129D8F7b3dEc2F39132D768F88e83448445";

export const ANCHOR_ABI = [
  "function updateAnchoredRoot(uint256 newRoot) public",
  "function getRoot() public view returns (uint256)",
  "function admin() public view returns (address)",
  "function anchoredRoot() public view returns (uint256)"
];