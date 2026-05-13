// test-db.js
const { connectToDatabase } = require("./utils/db");
const { LTOMerkleTree } = require("./utils/merkleTree");

async function runDatabaseTest() {
    console.log("[1] Connecting to MongoDB...");
    const db = await connectToDatabase();
    
    if (!db) {
        console.error("Failed to connect to database. Stopping.");
        process.exit(1);
    }

    const leavesCollection = db.collection("merkle_leaves");

    // Fetch existing leaves from the database
    console.log("[2] Fetching existing leaves from DB...");
    const savedLeaves = await leavesCollection.find().sort({ index: 1 }).toArray();
    const leafValues = savedLeaves.map(doc => doc.leafHash);
    
    console.log(`Found ${leafValues.length} existing leaves.`);

    // Initialize the tree WITH the database history
    console.log("[3] Initializing LeanIMT with DB history...");
    const tree = new LTOMerkleTree();
    await tree.initialize(leafValues);

    // Create a fake new leaf to insert
    const fakeNewLeaf = "123456789987654321";
    console.log(`[4] Inserting new leaf: ${fakeNewLeaf}`);
    
    const newRoot = tree.insert(fakeNewLeaf);
    const newIndex = tree.tree.leaves.length - 1;

    // Save the new leaf to MongoDB permanently!
    await leavesCollection.insertOne({
        index: newIndex,
        leafHash: fakeNewLeaf,
        timestamp: new Date()
    });

    console.log(`[5] Success! New Leaf saved to DB at Index ${newIndex}. New Root: ${newRoot}`);
    process.exit(0);
}

runDatabaseTest();