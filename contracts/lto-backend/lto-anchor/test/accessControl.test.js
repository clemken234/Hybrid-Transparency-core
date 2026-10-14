const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LTO Smart Contract Access Control Auditing", function () {
    let registryContract;
    let adminAccount;
    let unauthorizedUser;

    beforeEach(async function () {
        // 1. Get multiple signers from Hardhat environment
        [adminAccount, unauthorizedUser] = await ethers.getSigners();

        // 2. Target your real contract factory blueprint name!
        const RegistryFactory = await ethers.getContractFactory("LTORegistry"); // <-- MATCHED TO YOUR LToRegistry.sol
        registryContract = await RegistryFactory.deploy();
        await registryContract.waitForDeployment();
    });

    it("WT-06: Should fail and revert execution if a non-admin account attempts to update the Merkle Root", async function () {
        const mockNewRoot = ethers.encodeBytes32String("mockMerkleRootData123");
        const mockLeafCommitment = ethers.encodeBytes32String("mockLeafCommitmentData");

        const unauthorizedContractInstance = registryContract.connect(unauthorizedUser);

        // Use a clean try-catch to intercept and evaluate the raw Ethereum Virtual Machine revert string
        try {
            await unauthorizedContractInstance.Active(mockLeafCommitment, mockNewRoot);

            // If the transaction somehow went through without reverting, force the test to fail deliberately
            expect.fail("Transaction should have reverted but it passed instead.");
        } catch (error) {
            // Confirm that the contract threw your exact custom validation error string
            expect(error.message).to.include("Only LTO Admin allowed");
        }
    });
});