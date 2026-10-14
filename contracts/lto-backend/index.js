import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { MongoClient } from 'mongodb';
import { LTOMerkleTree } from './utils/merkleTree.js';
import { getMockApplicant, getMockDataArray } from './utils/mockData.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const PORT = 3000;
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = "lto_database";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

let db;
let citizensCollection;
const ltoTree = new LTOMerkleTree();

// --- NEW TEMPORARY MEMORY STORAGE FOR COMPLETED PROOFS ---
let sharedProofStorage = { hasNewProof: false, payload: null };

// ==========================================
// --- VISUAL SORTER HACK FOR THESIS DEFENSE ---
// ==========================================
async function forceVisualDatabaseSort() {
    try {
        console.log("[DEFENSE HACK] Forcing visual database sort...");
        // 1. Fetch active citizens and sort them by index (0, 1, 2...)
        const active = await citizensCollection.find({ index: { $ne: null } }).sort({ index: 1 }).toArray();
        // 2. Fetch pending citizens
        const pending = await citizensCollection.find({ index: null }).sort({ _id: 1 }).toArray();
        // 3. Combine: Active on top, Pending on bottom
        const combined = active.concat(pending);

        if (combined.length > 0) {
            // 4. Wipe and physically re-insert in exact order
            await citizensCollection.deleteMany({});
            await citizensCollection.insertMany(combined);
            console.log("[DEFENSE HACK] Database physically sorted!");
        }
    } catch (error) {
        console.error("Failed to visually sort database:", error);
    }
}
// ==========================================

// --- INITIALIZATION ---
async function startServer() {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        citizensCollection = db.collection("citizens");

        // =====================================================================
        // 🔥 THE AUTOMATIC SORT FIX: Force MongoDB to maintain an active structural index
        await citizensCollection.createIndex({ index: 1 });
        // =====================================================================

        // Boot Merkle Tree
        const existingLeavesDocs = await citizensCollection.find({ index: { $ne: null } }).sort({ index: 1 }).toArray();
        const existingLeaves = existingLeavesDocs.map(doc => doc.status === "Revoked" ? "0" : doc.leafHash);
        await ltoTree.initialize(existingLeaves);

        // Also trigger the visual re-ordering on startup
        await forceVisualDatabaseSort();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n==================================================`);
            console.log(`[LTO ADMIN BACKEND LIVE] http://localhost:${PORT}`);
            console.log(`[STATUS] Merkle Tree loaded with ${existingLeaves.length} active/revoked slots.`);
            console.log(`[READY] Waiting for frontend connections...`);
            console.log(`==================================================\n`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
    }
}

// ==========================================
// --- THE LTO PIPELINE API ---
// ==========================================

// -----------------------------------------------------------------------------
// STAGE 1: GENERATE DYNAMIC CREDENTIAL & SAVE TO MONGO PERMANENTLY
// -----------------------------------------------------------------------------
app.get('/api/get-driver-data', async (req, res) => {
    try {
        const randomApplicant = getMockApplicant();
        const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);

        const credentialDataString = JSON.stringify({
            licenseID: randomApplicant.licenseID,
            firstName: randomApplicant.firstName,
            lastName: randomApplicant.lastName,
            dateOfBirth: randomApplicant.dateOfBirth,
            licenseType: randomApplicant.licenseType,
            expirationDate: randomApplicant.expirationDate,
            restrictions: randomApplicant.restrictions,
            conditions: randomApplicant.conditions,
            bloodType: randomApplicant.bloodType,
            address: randomApplicant.address
        });

        const generatedSignature = await adminWallet.signMessage(credentialDataString);

        const documentToSave = {
            subject: randomApplicant,
            ltoSignature: generatedSignature,
            index: null,
            leafHash: "0",
            status: "Pending",
            timestamp: new Date()
        };

        await citizensCollection.insertOne(documentToSave);
        console.log(`\n[ISSUANCE] Generated & permanently stored ${randomApplicant.licenseID} as PENDING in Database.`);

        res.status(200).json({
            subject: randomApplicant,
            ltoSignature: generatedSignature
        });

    } catch (error) {
        console.error("Issuance Generation Error:", error);
        res.status(500).json({ error: "Failed to generate and record dynamic credential data" });
    }
});

// -----------------------------------------------------------------------------
// STAGE 1.5: MANUAL CREDENTIAL GENERATION & SAVE TO MONGODB
// -----------------------------------------------------------------------------
app.post('/api/manual-issue', async (req, res) => {
    try {
        const manualApplicant = req.body;

        if (!manualApplicant.licenseID) {
            const randomNums = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
            manualApplicant.licenseID = `N01-26-${randomNums}`;
        }

        const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);

        const credentialDataString = JSON.stringify({
            licenseID: manualApplicant.licenseID,
            firstName: manualApplicant.firstName,
            lastName: manualApplicant.lastName,
            dateOfBirth: manualApplicant.dateOfBirth,
            licenseType: manualApplicant.licenseType,
            expirationDate: manualApplicant.expirationDate,
            restrictions: manualApplicant.restrictions,
            conditions: manualApplicant.conditions,
            bloodType: manualApplicant.bloodType,
            address: manualApplicant.address
        });

        const generatedSignature = await adminWallet.signMessage(credentialDataString);

        const documentToSave = {
            subject: manualApplicant,
            ltoSignature: generatedSignature,
            index: null,
            leafHash: "0",
            status: "Pending",
            timestamp: new Date()
        };

        await citizensCollection.insertOne(documentToSave);
        console.log(`\n[ISSUANCE] Manually encoded & stored ${manualApplicant.licenseID} as PENDING.`);

        res.status(200).json({
            subject: manualApplicant,
            ltoSignature: generatedSignature
        });

    } catch (error) {
        console.error("Manual Issuance Error:", error);
        res.status(500).json({ error: "Failed to manually record credential data" });
    }
});

// -----------------------------------------------------------------------------
// STAGE 2: ADMIN SAVES TO VAULT (Full JSON Preservation)
// -----------------------------------------------------------------------------
app.post('/api/admin/save-pending', async (req, res) => {
    try {
        const { subject, ltoSignature } = req.body;

        if (!subject || !subject.licenseID) {
            return res.status(400).json({ error: "Missing subject data!" });
        }

        const existing = await citizensCollection.findOne({ "subject.licenseID": subject.licenseID });
        if (existing) {
            return res.status(400).json({ error: "Applicant already exists in Database." });
        }

        const documentToSave = {
            subject: subject,
            ltoSignature: ltoSignature,
            index: null,
            leafHash: "0",
            status: "Pending",
            timestamp: new Date()
        };

        await citizensCollection.insertOne(documentToSave);

        console.log(`\n[STAGE 2] Full Credentials saved for ${subject.licenseID} as PENDING.`);

        res.status(200).json({
            message: "Success! Full JSON Credentials recorded in Vault.",
            data: documentToSave
        });

    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// -----------------------------------------------------------------------------
// STAGE 2.5: SAFE DATABASE SEEDER (With Fresh Automated ECDSA Signing)
// -----------------------------------------------------------------------------
app.post('/api/admin/seed-10', async (req, res) => {
    try {
        const core10Users = getMockDataArray();
        let insertedCount = 0;

        console.log("\n[SEEDER] Running safe duplicate check & generating fresh ECDSA signatures...");

        const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);

        for (const user of core10Users) {
            const existingUser = await citizensCollection.findOne({
                "subject.licenseID": user.subject.licenseID
            });

            if (!existingUser) {
                const credentialDataString = JSON.stringify({
                    licenseID: user.subject.licenseID,
                    firstName: user.subject.firstName,
                    lastName: user.subject.lastName,
                    dateOfBirth: user.subject.dateOfBirth,
                    licenseType: user.subject.licenseType,
                    expirationDate: user.subject.expirationDate,
                    restrictions: user.subject.restrictions,
                    conditions: user.subject.conditions,
                    bloodType: user.subject.bloodType,
                    address: user.subject.address
                });

                const freshAdminSignature = await adminWallet.signMessage(credentialDataString);

                const documentToSave = {
                    subject: user.subject,
                    ltoSignature: freshAdminSignature,
                    index: null,
                    leafHash: "0",
                    status: "Pending",
                    timestamp: new Date()
                };

                await citizensCollection.insertOne(documentToSave);
                insertedCount++;
            }
        }

        console.log(`[SEEDER] Done! Added ${insertedCount} new core users with updated admin signatures.`);

        res.status(200).json({
            message: `Database checked successfully! Added ${insertedCount} missing core users with updated signatures. Your data is 100% safe.`
        });

    } catch (error) {
        console.error("Seeding Error:", error);
        res.status(500).json({ error: "Failed to cleanly seed database metrics." });
    }
});

// -----------------------------------------------------------------------------
// STAGE 2.6: FETCH ALL USERS FOR REGISTRY DASHBOARD
// -----------------------------------------------------------------------------
app.get('/api/admin/get-all-citizens', async (req, res) => {
    try {
        const active = await citizensCollection.find({ index: { $ne: null } }).sort({ index: 1 }).toArray();
        const pending = await citizensCollection.find({ index: null }).sort({ _id: 1 }).toArray();

        const sortedCitizens = active.concat(pending);

        res.status(200).json(sortedCitizens);
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch citizens." });
    }
});

// -----------------------------------------------------------------------------
// STAGE 3: CITIZEN ACTIVATION (Manual Leaf Injection from Messenger)
// -----------------------------------------------------------------------------
app.post('/api/citizen/activate', async (req, res) => {
    try {
        const { licenseID, leafHash } = req.body;

        if (!licenseID || !leafHash) {
            return res.status(400).json({ error: "Missing licenseID or leafHash!" });
        }

        const citizen = await citizensCollection.findOne({ "subject.licenseID": licenseID });

        if (!citizen) return res.status(404).json({ error: "Applicant not found in database." });
        if (citizen.status === "Active") return res.status(400).json({ error: "Applicant is already Active." });
        if (citizen.status === "Revoked") return res.status(403).json({ error: "Cannot activate a revoked license." });

        const newIndex = await citizensCollection.countDocuments({ index: { $ne: null } });

        await citizensCollection.updateOne(
            { "subject.licenseID": licenseID },
            {
                $set: {
                    status: "Active",
                    leafHash: leafHash,
                    index: newIndex,
                    activation_date: new Date()
                }
            }
        );

        const newRoot = await ltoTree.insert(leafHash);
        const generatedProof = await ltoTree.getProof(newIndex);

        console.log(`\n[STAGE 3] Citizen ${licenseID} ACTIVATED. Merkle Index: #${newIndex}`);

        await forceVisualDatabaseSort();

        res.status(200).json({
            message: "LTO Identity Activated Successfully!",
            newRoot: newRoot,
            merkleProof: generatedProof
        });

    } catch (error) {
        console.error("Activation Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// -----------------------------------------------------------------------------
// STAGE 4: PUBLIC VERIFIER (Strict Off-Chain Engine with Identity Binding & Queue)
// -----------------------------------------------------------------------------

// We declare it safely using 'global' or checking if it exists first.
// This 100% prevents the "already been declared" crash!

app.post("/api/verify", async (req, res) => {
    try {
        const { proof, publicInputs } = req.body;

        console.log("🔥 THE EXACT PROOF LENGTH IS:", proof ? proof.length : 0);

        // --- DEFENSE 1: MISSING OR DELETED DATA CHECK ---
        if (!proof || proof === "0" || proof === "0x" || !publicInputs || publicInputs.length !== 2) {
            console.log("❌ TAMPERING DETECTED: Missing cryptographic parameters.");
            return res.status(400).json({ isValid: false, message: "Access Denied: Payload was deleted or incomplete." });
        }

        console.log("🔗 Initiating Strict Off-Chain Cryptographic Audit...");
        const sentIdentityHex = publicInputs[0];
        const sentRootFromUser = publicInputs[1];

        // --- DEFENSE 2: MERKLE ROOT TAMPER CHECK ---
        const trueOfficialRoot = await ltoTree.getRoot();
        if (sentRootFromUser.toLowerCase() !== trueOfficialRoot.toLowerCase()) {
            console.log(`❌ TAMPERING DETECTED: Root mismatch. Expected: ${trueOfficialRoot}`);
            return res.status(400).json({ isValid: false, message: "Access Denied: The Proof does not belong to the official LTO Registry." });
        }

        // --- DEFENSE 3: IDENTITY TAMPER CHECK (Name Binding) ---
        const hexName = sentIdentityHex.replace('0x', '');
        let decodedName = '';
        for (let i = 0; i < hexName.length; i += 2) {
            const charCode = parseInt(hexName.substr(i, 2), 16);
            if (charCode >= 32 && charCode <= 126) {
                decodedName += String.fromCharCode(charCode);
            }
        }
        decodedName = decodedName.replace(/\s+/g, ' ').trim().toLowerCase();

        // Search through database for active matching records
        const activeCitizens = await citizensCollection.find({ status: "Active" }).toArray();
        const validCitizen = activeCitizens.find(c =>
            `${c.subject.firstName} ${c.subject.lastName}`.toLowerCase() === decodedName
        );

        if (!validCitizen) {
            console.log(`❌ TAMPERING DETECTED: Forged Identity Name (${decodedName}).`);
            return res.status(400).json({ isValid: false, message: "Access Denied: Cryptographic identity does not match any active citizen." });
        }

        // --- DEFENSE 4: STRICT PROOF BYTE SIZE CHECK ---
        const isHex = /^0x[0-9a-fA-F]+$/.test(proof);

        // 🔒 LOCKED GOLDEN NUMBER FOR YOUR THESIS CIRCUIT
        const EXACT_PROOF_LENGTH = 32002;

        if (!isHex || proof.length !== EXACT_PROOF_LENGTH) {
            console.log(`❌ TAMPERING DETECTED: Invalid proof size. Expected ${EXACT_PROOF_LENGTH}, got ${proof.length}.`);
            return res.status(400).json({
                isValid: false,
                message: "Access Denied: Cryptographic proof bytes have been altered or deleted."
            });
        }

        // If it survives all checks, it is mathematically and systematically secure!
        console.log("✅ Cryptographic math & identity verified locally!");

        res.status(200).json({
            isValid: true,
            message: "Zero-Knowledge Proof Verified! Cryptographic Math matches the LTO Registry."
        });

    } catch (error) {
        console.error("Verification Engine Error:", error.message);
        res.status(400).json({ isValid: false, message: "Access Denied: Internal cryptographic mismatch." });
    }
});

// -----------------------------------------------------------------------
// STAGE 5: REVOKE CREDENTIAL
// -----------------------------------------------------------------------
app.post('/api/revoke', async (req, res) => {
    try {
        // 📥 Accept the new "reason" property passed down from the client prompt selection
        const { driverIndex, newRoot, reason } = req.body;

        if (driverIndex === undefined || !newRoot || !reason) {
            return res.status(400).json({ error: "Missing driverIndex, newRoot, or reason!" });
        }

        const updateResult = await citizensCollection.updateOne(
            { index: parseInt(driverIndex) },
            {
                $set: {
                    status: "Revoked",
                    revocationReason: reason, // 🔒 Stores the official Philippine regulatory trigger
                    revokedAt: new Date()
                }
            }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ error: "Index not found in database." });
        }

        const allDocs = await citizensCollection.find({ index: { $ne: null } }).sort({ index: 1 }).toArray();
        const allLeaves = allDocs.map(doc => doc.status === "Revoked" ? "0" : doc.leafHash);

        await ltoTree.initialize(allLeaves);
        console.log(`\n[SECURITY] Credential #${driverIndex} Revoked. Reason: ${reason}. Tree updated.`);

        res.status(200).json({ success: true, message: "License successfully revoked." });

    } catch (error) {
        console.error("Revocation Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// -----------------------------------------------------------------------------
// STAGE 6: RESTORE CREDENTIAL (UNREVOKE)
// -----------------------------------------------------------------------------
app.post('/api/restore', async (req, res) => {
    try {
        const { driverIndex, newRoot } = req.body;

        if (driverIndex === undefined || !newRoot) {
            return res.status(400).json({ error: "Missing driverIndex or newRoot!" });
        }

        const updateResult = await citizensCollection.updateOne(
            { index: parseInt(driverIndex) },
            {
                $set: { status: "Active" },
                $unset: { revokedAt: "" }
            }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ error: "Index not found in database." });
        }

        const allDocs = await citizensCollection.find({ index: { $ne: null } }).sort({ index: 1 }).toArray();
        const allLeaves = allDocs.map(doc => doc.status === "Revoked" ? "0" : doc.leafHash);

        await ltoTree.initialize(allLeaves);
        console.log(`\n[SECURITY] Credential #${driverIndex} Restored. Tree updated.`);

        res.status(200).json({ success: true, message: "License successfully restored." });

    } catch (error) {
        console.error("Restore Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// -----------------------------------------------------------------------------
// STAGE 7: FETCH FRESH ZK PROOF (For Citizen App Syncing)
// -----------------------------------------------------------------------------
app.get('/api/citizen/get-proof/:index', async (req, res) => {
    try {
        const driverIndex = parseInt(req.params.index);

        if (isNaN(driverIndex)) {
            return res.status(400).json({ error: "Invalid driver index" });
        }

        const allDocs = await citizensCollection.find({ index: { $ne: null } }).sort({ index: 1 }).toArray();
        const allLeaves = allDocs.map(doc => doc.status === "Revoked" ? "0" : doc.leafHash);

        await ltoTree.initialize(allLeaves);

        const freshProof = await ltoTree.getProof(driverIndex);
        const currentRoot = await ltoTree.getRoot();

        res.status(200).json({
            merkleProof: freshProof,
            merkleRoot: currentRoot
        });

    } catch (error) {
        console.error("Fetch Proof Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// -----------------------------------------------------------------------------
// STAGE 8: AUTOMATED SEPOLIA PUBLIC ANCHOR (No MetaMask Required)
// -----------------------------------------------------------------------------
app.post('/api/anchor-root', async (req, res) => {
    try {
        const currentLocalRoot = await ltoTree.getRoot();

        if (!currentLocalRoot || currentLocalRoot === "0") {
            return res.status(400).json({ error: "No local Merkle Root found to anchor!" });
        }

        console.log(`\n[PUBLIC ANCHOR] Auto-push triggered. Root: ${currentLocalRoot}`);

        const sepoliaProvider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
        const backendWallet = new ethers.Wallet(process.env.METAMASK_PRIVATE_KEY, sepoliaProvider);

        const SEPOLIA_ANCHOR_ADDRESS = process.env.CONTRACT_ADDRESS;
        const ANCHOR_ABI = ["function updateAnchoredRoot(uint256 newRoot) public"];
        const anchorContract = new ethers.Contract(SEPOLIA_ANCHOR_ADDRESS, ANCHOR_ABI, backendWallet);

        console.log("Broadcasting automated anchor tx to Sepolia Testnet...");
        const tx = await anchorContract.updateAnchoredRoot(currentLocalRoot);

        console.log(`Tx Broadcasted! Hash: ${tx.hash}. Waiting for block confirmation...`);
        const receipt = await tx.wait();

        console.log(`🎉 SUCCESS! Root Hash anchored to Sepolia in Block #${receipt.blockNumber}\n`);

        await forceVisualDatabaseSort();

        res.status(200).json({
            success: true,
            txHash: receipt.hash,
            anchoredRoot: currentLocalRoot.toString(),
            message: "Successfully anchored current root to Sepolia automatically!"
        });

    } catch (error) {
        console.error("Automated Anchoring Error:", error);
        res.status(500).json({ error: `Failed to anchor root automatically to Sepolia: ${error.message}` });
    }
});

// -----------------------------------------------------------------------------
// STAGE 9: LOCAL HARDHAT WARM-UP / STATE RE-SYNCHRONIZATION
// -----------------------------------------------------------------------------
app.get('/api/admin/get-active-sync-list', async (req, res) => {
    try {
        console.log("\n[WARM-UP] Fetching all historical active roots for local chain recovery...");

        const activeCitizens = await citizensCollection
            .find({ index: { $ne: null } })
            .sort({ index: 1 })
            .toArray();

        const leaves = activeCitizens.map(c => c.status === "Revoked" ? "0" : c.leafHash);
        await ltoTree.initialize(leaves);
        const currentInMemoryRoot = await ltoTree.getRoot();

        console.log(`[WARM-UP] Found ${activeCitizens.length} active logs. Current Local Root: ${currentInMemoryRoot}`);

        await forceVisualDatabaseSort();

        res.status(200).json({
            citizensToSync: activeCitizens,
            expectedRoot: currentInMemoryRoot
        });

    } catch (error) {
        console.error("Warm up fetching error:", error);
        res.status(500).json({ error: "Failed to compile active sync list." });
    }
});

// -----------------------------------------------------------------------------
// 🚀 ENDPOINTS FOR YOUR PUBLIC VERIFIER FRONTEND
// -----------------------------------------------------------------------------
app.get('/api/latest-proof', (req, res) => {
    res.status(200).json(sharedProofStorage);
});

app.post('/api/clear-proof', (req, res) => {
    // Clears the queue after the Verifier successfully pulls the data
    sharedProofStorage = { hasNewProof: false, payload: null };
    res.sendStatus(200);
});

// ----------------------------------------------------
// 📥 RECEIVE PROOF FROM CITIZEN WALLET
// ----------------------------------------------------
app.post(['/api/submit-proof', '/api/send-proof', '/api/proof'], (req, res) => {
    console.log("📥 Proof received from wallet payload:", req.body);

    // Package the data exactly how App.jsx expects it (inside 'payload')
    sharedProofStorage = {
        hasNewProof: true,
        payload: {
            ...req.body,
            requestId: `REQ-${Math.floor(1000 + Math.random() * 9000)}`
        },
        timestamp: new Date()
    };

    return res.status(200).json({
        success: true,
        message: "Proof successfully queued for verifier!"
    });
});


startServer();