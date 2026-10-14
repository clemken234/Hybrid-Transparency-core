import { ethers } from "ethers";

async function checkSigner() {
    // 1. Paste Yolanda Perez's EXACT raw string data from your database here
    const payload = "Yolanda Perez Data...";

    // 2. Paste Yolanda's FULL 132-character LTO Sign from the database here 
    // (Remember to click the {} JSON icon in MongoDB to copy the full string without the '...')
    const ltoSign = "0xc80e042e4593306f0801af962f5c82865cdfda51dd0697818d9c6cdd0564f3354774b22617c646e7fb09b48195385fe3face580b21ed962d83a4f48a73ac12681c";

    try {
        // 3. Recover the Public Key
        const recoveredAddress = ethers.verifyMessage(payload, ltoSign);
        console.log("=========================================");
        console.log("The Admin Public Key that signed Gloaria's credential is:");
        console.log(recoveredAddress);
        console.log("=========================================");
    } catch (error) {
        console.error("Format error in signature or payload bro:", error.message);
    }
}

checkSigner();