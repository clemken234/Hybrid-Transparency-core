// trigger.js
console.log("🚀 Firing a direct POST request to your LTO API...");

async function runTest() {
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // An empty body tells your server to use the mockData.js generator!
        });
        
        const data = await response.json();
        
        console.log("\n✅ [SUCCESS] Identity Commitment Generated & Saved to DB!");
        console.log("Here is the exact JSON your server created:");
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("❌ Cannot reach server. Is node index.js running in the other terminal?", error);
    }
}

runTest();