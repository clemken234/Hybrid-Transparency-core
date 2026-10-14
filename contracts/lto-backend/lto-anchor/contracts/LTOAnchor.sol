// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 1. Create an interface to talk to your generated ZK Verifier contract
interface IVerifier {
    function verifyProof(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

contract LTOAnchor {
    address public admin;
    uint256 public anchoredRoot;
    
    // The address of the actual ZK Math Verifier contract
    IVerifier public zkVerifier; 

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only LTO Admin allowed");
        _;
    }

    // You now pass the address of your deployed ZK Verifier when deploying this anchor
    constructor(address _verifierAddress) {
        admin = msg.sender;
        zkVerifier = IVerifier(_verifierAddress);
    }

    // The National Chain calls this to update the world
    function updateAnchoredRoot(uint256 newRoot) public onlyAdmin {
        anchoredRoot = newRoot;
    }

    function getRoot() public view returns (uint256) {
        return anchoredRoot;
    }

    // ------------------------------------------------------------------------
    // 🔥 THE MISSING VERIFIER FUNCTION FOR YOUR BACKEND
    // ------------------------------------------------------------------------
    function verifyProof(bytes calldata proof, bytes32[] calldata publicInputs) public view returns (bool) {
        
        // SECURITY CHECK: Ensure the proof is verifying against the official LTO Root
        // Assuming publicInputs[1] is the Merkle Root based on your frontend payload
        uint256 proofRoot = uint256(publicInputs[1]);
        require(proofRoot == anchoredRoot, "Access Denied: Proof root does not match the latest official LTO Root!");

        // If the roots match, pass the proof to the ZK-SNARK verifier to check the math
        bool isValid = zkVerifier.verifyProof(proof, publicInputs);
        require(isValid, "Access Denied: Cryptographic ZK math is invalid or tampered!");

        return true;
    }
}