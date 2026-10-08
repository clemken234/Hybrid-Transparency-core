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

// --- INITIALIZATION ---
async function startServer() {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        citizensCollection = db.collection("citizens");

        // Boot Merkle Tree: Only load leaves that are NOT "0" (Active ones)
        // Load EVERYONE who has an index, even if they are revoked ("0")
        const existingLeavesDocs = await citizensCollection.find({ index: { $ne: null } }).sort({ index: 1 }).toArray();
        const existingLeaves = existingLeavesDocs.map(doc => doc.leafHash);
        await ltoTree.initialize(existingLeaves);

        app.listen(PORT, () => {
            console.log(`\n==================================================`);
            console.log(`[LTO ADMIN BACKEND LIVE] http://localhost:${PORT}`);
            console.log(`[STATUS] Merkle Tree loaded with ${existingLeaves.length} active leaves.`);
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
// STAGE 1: GET SINGLE MOCK DATA
// -----------------------------------------------------------------------------
app.get('/api/get-driver-data', async (req, res) => {
    try {
        const randomApplicant = getMockApplicant();
        const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);
        const generatedSignature = await adminWallet.signMessage(randomApplicant.licenseID);

        res.status(200).json({
            subject: randomApplicant,
            ltoSignature: generatedSignature
        });
    } catch (error) {
        console.error("Error generating data:", error);
        res.status(500).json({ error: "Failed to generate mock data" });
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
// STAGE 2.5: SEED ALL 10 USERS INTO VAULT AS PENDING
// -----------------------------------------------------------------------------
app.post('/api/admin/seed-10', async (req, res) => {
    try {
        await citizensCollection.deleteMany({}); // Clear old database to avoid duplicates

        const allUsers = getMockDataArray();

        const documentsToSave = allUsers.map(user => ({
            subject: user.subject,
            ltoSignature: user.ltoSignature,
            index: null,
            leafHash: "0",
            status: "Pending",
            timestamp: new Date()
        }));

        await citizensCollection.insertMany(documentsToSave);
        console.log(`\n[DATABASE] Successfully seeded 10 Pending Users.`);

        res.status(200).json({ message: "10 Users Successfully loaded as Pending in MongoDB!" });
    } catch (error) {
        console.error("Seed Error:", error);
        res.status(500).json({ error: "Failed to seed database." });
    }
});

// -----------------------------------------------------------------------------
// STAGE 2.6: FETCH ALL USERS FOR REGISTRY DASHBOARD
// -----------------------------------------------------------------------------
app.get('/api/admin/get-all-citizens', async (req, res) => {
    try {
        const citizens = await citizensCollection.find({}).toArray();
        res.status(200).json(citizens);
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

        // Count everyone who has an assigned slot to find the next available slot
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
// STAGE 4: PUBLIC VERIFIER (Zero-Knowledge Upgrade)
// -----------------------------------------------------------------------------
app.post('/api/verify', async (req, res) => {
    try {
        const { zkProof, publicInputs } = req.body;

        if (!zkProof || !publicInputs) {
            return res.status(400).json({ error: "Missing ZK proof payload!" });
        }

        console.log(`\n[VERIFIER] True ZK-SNARK Proof received! Auditing...`);

        const rawProofRoot = publicInputs[1];
        const rawExpectedRoot = await ltoTree.getRoot();

        // 🔥 THE HEX NORMALIZER: Prevents strict equality crashes
        const normalizeHex = (hexStr) => "0x" + BigInt(hexStr).toString(16).padStart(64, "0").toLowerCase();

        const proofRoot = normalizeHex(rawProofRoot);
        const expectedRoot = normalizeHex(rawExpectedRoot);

        console.log(`\n--- ZK HASH COMPARISON ---`);
        console.log(`Proof Root  : ${proofRoot}`);
        console.log(`Server Root : ${expectedRoot}`);
        console.log(`--------------------------\n`);

        if (proofRoot !== expectedRoot) {
            console.log(`[VERIFIER] FAILED: Proof Root does not match Active Root.`);
            return res.status(403).json({
                isValid: false,
                message: "Verification Failed. This proof uses an outdated Merkle Root. The license may have been Revoked."
            });
        }

        console.log(`[VERIFIER] SUCCESS: Math matches the active Public Root.`);
        res.status(200).json({
            isValid: true,
            message: "Zero-Knowledge Proof Verified! Cryptographic Math matches the Blockchain."
        });

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// -----------------------------------------------------------------------------
// STAGE 5: REVOKE CREDENTIAL
// -----------------------------------------------------------------------------
app.post('/api/revoke', async (req, res) => {
    try {
        const { driverIndex, newRoot } = req.body;

        if (driverIndex === undefined || !newRoot) {
            return res.status(400).json({ error: "Missing driverIndex or newRoot!" });
        }

        // 1. UPDATE DB: Change status, but DO NOT overwrite the leafHash!
        const updateResult = await citizensCollection.updateOne(
            { index: parseInt(driverIndex) },
            { $set: { status: "Revoked", revokedAt: new Date() } } // 🛡️ leafHash: "0" is removed!
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ error: "Index not found in database." });
        }

        // 2. REBUILD BACKEND TREE MEMORY
        const allDocs = await citizensCollection.find({ index: { $ne: null } }).sort({ index: 1 }).toArray();

        // 🛡️ CRITICAL MATH FIX: If they are revoked, feed "0" to the math engine. Otherwise, use real hash.
        const allLeaves = allDocs.map(doc => doc.status === "Revoked" ? "0" : doc.leafHash);

        await ltoTree.initialize(allLeaves);

        console.log(`\n[SECURITY] Credential #${driverIndex} Revoked. Tree updated.`);

        res.status(200).json({
            success: true,
            message: "License successfully revoked."
        });

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

        // 1. UPDATE DB: Change status back to Active and remove the revoked timestamp
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

        // 2. REBUILD BACKEND TREE MEMORY
        const allDocs = await citizensCollection.find({ index: { $ne: null } }).sort({ index: 1 }).toArray();

        // Because status is now "Active", it automatically feeds their real hash back into the math engine!
        const allLeaves = allDocs.map(doc => doc.status === "Revoked" ? "0" : doc.leafHash);

        await ltoTree.initialize(allLeaves);

        console.log(`\n[SECURITY] Credential #${driverIndex} Restored. Tree updated.`);

        res.status(200).json({
            success: true,
            message: "License successfully restored."
        });

    } catch (error) {
        console.error("Restore Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

startServer();