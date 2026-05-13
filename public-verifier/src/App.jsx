import React, { useState } from 'react';

export default function VerifierApp() {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState('IDLE'); // IDLE, LOADING, SUCCESS, FAILED
  const [message, setMessage] = useState('');
  
  // States to hold the revealed data
  const [citizenName, setCitizenName] = useState(''); 
  const [verifiedRoot, setVerifiedRoot] = useState('');

  // Use localhost since both run on the same computer right now
  const BACKEND_URL = "http://localhost:3000";

  const handleVerify = async () => {
    try {
      setStatus('LOADING');
      setCitizenName(''); 
      setVerifiedRoot('');
      
      const payload = JSON.parse(jsonInput);

      if (!payload.proof || !payload.publicInputs) {
        throw new Error("Invalid format. Payload must contain 'proof' and 'publicInputs'.");
      }

      const response = await fetch(`${BACKEND_URL}/api/verify`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            zkProof: payload.proof, 
            publicInputs: payload.publicInputs 
        })
      });

      const result = await response.json();

      if (response.ok && result.isValid) {
        // 1. HEX TO STRING DECODER: Read the name from publicInputs[0]
        const hexName = payload.publicInputs[0].replace('0x', '');
        let decodedName = '';
        for (let i = 0; i < hexName.length; i += 2) {
            const charCode = parseInt(hexName.substr(i, 2), 16);
            if (charCode !== 0) { // ignore 00 padding
                decodedName += String.fromCharCode(charCode);
            }
        }
        
        // 2. Save the revealed Name and the Merkle Root
        setCitizenName(decodedName); 
        setVerifiedRoot(payload.publicInputs[1]);

        setStatus('SUCCESS');
        setMessage("Zero-Knowledge Proof Verified! Cryptographic Math matches the Blockchain.");
      } else {
        setStatus('FAILED');
        setMessage(result.message || "Verification Failed. ZK Proof is invalid.");
      }
    } catch (error) {
      setStatus('FAILED');
      setMessage(error.message || "Invalid JSON syntax. Please check your payload.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white font-sans flex flex-col items-center justify-center p-8">
      
      {/* Header */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">🛡️</div>
            <div>
                <h1 className="text-xl font-bold tracking-wide">Public Credential Verifier</h1>
                <p className="text-xs text-gray-500 tracking-widest uppercase">Decentralized ZK-Audit</p>
            </div>
        </div>
        <div className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-xs font-mono text-gray-400">
            Node: Sepolia RPC
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8 bg-[#11151C] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Left Side - Status Display */}
        <div className="p-12 flex flex-col items-center justify-center text-center border-r border-gray-800 min-h-[500px]">
          
          {status === 'IDLE' && (
              <div className="opacity-50 transition-opacity">
                  <h2 className="text-4xl font-black text-gray-500 tracking-tight mb-4">AWAITING PAYLOAD</h2>
                  <p className="text-sm font-mono text-gray-600">Insert JSON credentials containing strictly the proof and publicInputs to begin validation.</p>
              </div>
          )}

          {status === 'LOADING' && (
              <div className="animate-pulse">
                  <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
                  <h2 className="text-2xl font-bold text-blue-400 tracking-widest uppercase">Auditing Chain...</h2>
              </div>
          )}

          {status === 'SUCCESS' && (
              <div className="animate-in zoom-in duration-300 w-full">
                  <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-green-500/30">✓</div>
                  <h2 className="text-3xl font-black text-green-400 mb-6">AUTHENTIC</h2>
                  
                  {/* REVEALED DATA SECTION */}
                  <div className="w-full max-w-sm mx-auto flex flex-col gap-3 mb-6">
                      {/* Name Box */}
                      <div className="bg-[#0B0E14] border border-green-500/30 rounded-xl p-4 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 text-left">Verified Identity</p>
                          <p className="text-xl font-black text-white tracking-wide text-left">{citizenName}</p>
                      </div>

                      {/* Merkle Root Box */}
                      <div className="bg-[#0B0E14] border border-gray-800 rounded-xl p-4">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 text-left">Anchored Public Root</p>
                          <p className="text-xs font-mono text-green-400 break-all text-left">{verifiedRoot}</p>
                      </div>
                  </div>

                  <p className="text-xs font-mono text-green-500/70">{message}</p>
              </div>
          )}

          {status === 'FAILED' && (
              <div className="animate-in zoom-in duration-300">
                  <div className="w-24 h-24 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 border border-red-500/30">✗</div>
                  <h2 className="text-3xl font-black text-red-400 mb-2">ACCESS DENIED</h2>
                  <p className="text-sm font-mono text-red-500/70">{message}</p>
              </div>
          )}

        </div>

        {/* Right Side - Input Form */}
        <div className="p-8 bg-[#151A22] flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Input Configuration</h3>
            
            <textarea 
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={'{\n  "proof": "0x...",\n  "publicInputs": [\n    "0x...",\n    "0x..."\n  ]\n}'}
                className="w-full flex-grow bg-[#0B0E14] border border-gray-800 rounded-xl p-4 font-mono text-xs text-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all mb-6"
            ></textarea>

            <button 
                onClick={handleVerify}
                disabled={status === 'LOADING' || !jsonInput.trim()}
                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                Run Crypto-Audit
            </button>
        </div>

      </div>
    </div>
  );
}