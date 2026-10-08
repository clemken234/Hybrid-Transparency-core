// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LTOAnchor {
    address public admin;
    uint256 public anchoredRoot;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only LTO Admin allowed");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // The National Chain calls this to update the world
    function updateAnchoredRoot(uint256 newRoot) public onlyAdmin {
        anchoredRoot = newRoot;
    }

    function getRoot() public view returns (uint256) {
        return anchoredRoot;
    }
}