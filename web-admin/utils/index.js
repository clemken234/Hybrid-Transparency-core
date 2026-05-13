import express from 'express';
import { createFinalMerkleLeaf, signCredential } from './utils/crypto.js';
import { LTOMerkleTree } from './utils/merkleTree.js';
import { connectToDatabase } from './utils/db.js';

const app = express();
app.use(express.json()); // This allows us to read JSON data from the frontend

app.post('/api/register', async (req, res) => {
    try {
        console.log("[API] Incoming LTO Registration Request...");
        const data = req.body;

        // 1. Extract the secure anchors for the Aztec Hash
        const { secretHash, licenseID } = data;

        // 2. Extract the full LTO details for the ECDSA Signature
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

        // 3. Run Cryptography (Aztec Hash & Ethers Signature)
        const finalLeafHash = await createFinalMerkleLeaf(secretHash, licenseID);
        const credential = await signCredential(finalLeafHash, ltoData);

        // 4. Update Database & Barretenberg Merkle Tree
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

        // 5. Build the final JSON payload for the driver's phone
        const userPayload = {
            documentType: "Philippine LTO Driver's License",
            registryMetadata: { treeIndex: newIndex.toString() },
            subject: ltoData,
            ltoSignature: credential.signature,
            issuerAddress: credential.signedBy
        };

        console.log(`[API] Successfully Registered ${ltoData.firstName} ${ltoData.lastName} at Index ${newIndex}`);
        res.status(200).json(userPayload);

    } catch (error) {
        console.error("[API Error]", error);
        res.status(500).json({ error: "Failed to register driver" });
    }
});

// Start the engine
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`[SYSTEM] LTO Admin API is live and listening on http://localhost:${PORT}`);
});
