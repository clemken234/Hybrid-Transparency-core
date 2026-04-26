// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract LTORegistry {
    address public admin;
    bytes32 public merkleRoot;

    event RootUpdated(bytes32 oldRoot, bytes32 newRoot, uint256 timestamp);

    constructor() {
        admin = msg.sender; 
    }

    function updateRoot(bytes32 _newRoot) external {
        require(msg.sender == admin, "CRITICAL: Only Admin can update root");
        bytes32 oldRoot = merkleRoot;
        merkleRoot = _newRoot;
        emit RootUpdated(oldRoot, _newRoot, block.timestamp);
    }
}