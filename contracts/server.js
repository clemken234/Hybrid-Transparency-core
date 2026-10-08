// server.js
import express from 'express';
import cors from 'cors'; // <--- TWEAK 1: We brought the CORS bouncer in!
import 'dotenv/config';
import { createFinalMerkleLeaf, signCredential } from './utils/crypto.js';
import { LTOMerkleTree } from './utils/merkleTree.js';
import { connectToDatabase } from './utils/db.js'; 

const app = express();

// This allows our API to read JSON data from the frontend and allows your HTML dashboard to connect
app.use(cors()); // <--- TWEAK 1: Bouncer lets the dashboard in
app.use(express.json());

// THE MASTER REGISTRATION ENDPOINT
app.post('/api/register', async (req, res) => {
    try {
        console.log("\n[API] Incoming LTO Registration Request...");
        const data = req.body;
        
        // 1. Extract data
        const { secretHash, licenseID } = data;
        const ltoData = {
            licenseID: data.licenseID,
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            licenseType: data.licenseType,
            expirationDate: data.expirationDate,
            bloodType: data.bloodType,
            addressCity: data.addressCity
        };

        console.log(`[API] Processing identity for: ${ltoData.firstName} ${ltoData.lastName}`);

        // 2. Cryptography
        const finalLeafHash = await createFinalMerkleLeaf(secretHash, licenseID);
        const credential = await signCredential(finalLeafHash, ltoData);

        // 3. Database & Merkle Tree
        const db = await connectToDatabase();
        const leavesCollection = db.collection("merkle_leaves");
        
        const savedLeaves = await leavesCollection.find().sort({ index: 1 }).toArray();
        const leafValues = savedLeaves.map(doc => doc.leafHash);
        
        const tree = new LTOMerkleTree();
        await tree.initialize(leafValues);
        
        tree.insert(finalLeafHash);
        const newIndex = tree.tree.leaves.length - 1;

        await leavesCollection.insertOne({
            index: newIndex,
            leafHash: finalLeafHash,
            timestamp: new Date()
        });

        // 4. Construct Final Payload
        const userPayload = {
            documentType: "Philippine LTO Driver's License",
            registryMetadata: { 
                treeIndex: newIndex.toString(),
                leafHash: finalLeafHash // <--- TWEAK 2: The Identity Commitment is now exposed to the Frontend!
            },
            subject: ltoData, 
            ltoSignature: credential.signature,
            issuerAddress: credential.signedBy
        };
        
        console.log(`[API] SUCCESS! Registered at Index ${newIndex}. Sending JSON to frontend.`);
        
        // 5. Send response back to frontend
        res.status(200).json(userPayload);

    } catch (error) {
        console.error("[API Error]", error);
        res.status(500).json({ error: "Failed to register driver" });
    }
});

// START THE SERVER
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`[SERVER] LTO Admin Backend is LIVE and listening on http://localhost:${PORT}`);
});