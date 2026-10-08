// test-api.js
const { getMockApplicant } = require('./utils/mockData'); 

async function runTest() {
    console.log("--- SYSTEM TEST: MASS REGISTRATION ---");

    // 1. Generate a brand new random citizen using your function
    const rawData = getMockApplicant();

    // 2. Format the payload to match the ZKP Circuit exactly!
    // (In the real app, the frontend converts the text to numbers. We fake the numbers here for testing).
    const payload = {
        secret: rawData.secretHash, 
        private_license_data: Math.floor(Math.random() * 1000000000).toString(), // Faking the hashed private data
        public_name: Math.floor(Math.random() * 1000000000).toString(), // Faking the hashed name
        rawName: `${rawData.firstName} ${rawData.lastName}` // The real name for the Admin DB
    };

    console.log(`[INFO] Target Locked: ${payload.rawName}`);
    console.log(`[INFO] Firing POST request to API...`);

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log(`[SUCCESS] Credential Generated for ${payload.rawName}!`);
            console.log(data);
        } else {
            console.error(`[ERROR] Server rejected the request:`, data);
        }

    } catch (error) {
        console.error(`[CRITICAL] Cannot reach server. Is index.js running?`, error.message);
    }
}

runTest();