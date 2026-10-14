import React, { useState, useEffect } from 'react';

export default function VerifierApp() {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState('IDLE'); // IDLE, LOADING, SUCCESS, FAILED
  const [message, setMessage] = useState('');

  const [citizenName, setCitizenName] = useState('');
  const [verifiedRoot, setVerifiedRoot] = useState('');

  // --- STAGING QUEUE STATE MANAGEMENT ---
  const [queue, setQueue] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  // Mobile navigation tab: 'AUDIT', 'QUEUE', 'INPUT'
  const [activeTab, setActiveTab] = useState('AUDIT');

  // IMPORTANT: Ensure this matches your active Port 3000 tunnel URL!
  const BACKEND_URL = "https://por-election-wal-lap.trycloudflare.com";

  // --- AUTOMATIC PROOF DETECTOR (POLLING FEATURE WITH QUEUING) ---
  useEffect(() => {
    const checkForNewProof = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/latest-proof`);
        if (response.ok) {
          const data = await response.json();

          if (data.hasNewProof && data.payload) {
            console.log("Automated System: Remote payload intercepted successfully.");

            const extractedId = data.payload.requestId || `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            setQueue(prevQueue => {
              const matchesExisting = prevQueue.some(item => item.id === extractedId);
              if (matchesExisting) return prevQueue;

              return [
                {
                  id: extractedId,
                  time: timestamp,
                  payload: data.payload
                },
                ...prevQueue
              ];
            });

            await fetch(`${BACKEND_URL}/api/clear-proof`, { method: 'POST' }).catch(() => { });
          }
        }
      } catch (err) {
        console.log("Awaiting connection stream from backend...");
      }
    };

    const interval = setInterval(checkForNewProof, 2000);
    return () => clearInterval(interval);
  }, [BACKEND_URL]);

  // --- QUEUE CARD ITEM CLICK HANDLER ---
  const handleSelectRequest = (item) => {
    setSelectedRequestId(item.id);
    const formattedProofString = JSON.stringify(item.payload, null, 2);
    setJsonInput(formattedProofString);

    if (status !== 'LOADING') {
      setStatus('IDLE');
      setMessage('');
      setCitizenName('');
      setVerifiedRoot('');
    }

    // On mobile, jump straight to Audit view when selecting a proof
    setActiveTab('AUDIT');
  };

  // --- MANUAL AUDIT BUTTON TRIGGER ---
  const handleVerify = async () => {
    if (!jsonInput.trim()) return;
    setStatus('LOADING');
    setMessage('');
    setActiveTab('AUDIT');

    try {
      const payload = JSON.parse(jsonInput);
      await executeVerification(payload);
    } catch (error) {
      console.error("Critical Verification Error:", error);
      setStatus('FAILED');
      setMessage("Verification crashed. Invalid JSON format or network error.");
    }
  };

  // --- REUSABLE CRYPTO-AUDIT CORE LOGIC ---
  const executeVerification = async (payload) => {
    try {
      if (!payload.proof || payload.proof === "0" || payload.proof === "0x" || payload.proof.length < 50) {
        setStatus('FAILED');
        setMessage("Verification Failed: Cryptographic proof is missing or critically altered.");
        return;
      }

      if (!payload.publicInputs || !Array.isArray(payload.publicInputs) || payload.publicInputs.length !== 2) {
        setStatus('FAILED');
        setMessage("Verification Failed: Public inputs array was tampered with or is missing variables.");
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof: payload.proof,
          publicInputs: payload.publicInputs
        })
      });

      const result = await response.json();
      console.log("Backend Response:", result);

      if (response.ok && result.isValid === true) {
        const hexName = payload.publicInputs[0].replace('0x', '');
        let decodedName = '';
        for (let i = 0; i < hexName.length; i += 2) {
          const charCode = parseInt(hexName.substr(i, 2), 16);
          if (charCode >= 32 && charCode <= 126) {
            decodedName += String.fromCharCode(charCode);
          }
        }

        let cleanDisplayName = decodedName.replace(/\s+/g, ' ').trim();

        if (!cleanDisplayName.includes(' ')) {
          cleanDisplayName = cleanDisplayName.replace(/([a-z])([A-Z])/g, '$1 $2');
          cleanDisplayName = cleanDisplayName.replace(/\b\w/g, c => c.toUpperCase());
        }

        setCitizenName(cleanDisplayName || "Unknown Identity");
        setVerifiedRoot(payload.publicInputs[1]);

        setStatus('SUCCESS');
        setMessage("Zero-Knowledge Proof Verified! Cryptographic Math matches the Blockchain.");

        if (selectedRequestId) {
          setQueue(prev => prev.filter(req => req.id !== selectedRequestId));
          setSelectedRequestId(null);
        }
      } else {
        setStatus('FAILED');
        setMessage(result.message || "Access Denied: The blockchain rejected this proof or public input.");
      }

    } catch (error) {
      console.error("Critical Verification Error:", error);
      setStatus('FAILED');
      setMessage("Verification crashed. Invalid JSON format or network error.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <div className="w-full max-w-7xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-600/20">🛡️</div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-wide">Public Credential Verifier</h1>
            <p className="text-[10px] sm:text-xs text-gray-500 tracking-widest uppercase">Decentralized ZK-Audit</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-gray-800/80 border border-gray-700/80 rounded-full text-xs font-mono text-gray-400 flex items-center gap-2 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live Connection
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible only on small/medium screens) */}
      <div className="w-full max-w-7xl grid grid-cols-3 gap-1 bg-[#141922] p-1 rounded-xl border border-gray-800 mb-4 lg:hidden">
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'AUDIT' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
        >
          Result
        </button>
        <button
          onClick={() => setActiveTab('QUEUE')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'QUEUE' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
        >
          Queue
          <span className="bg-blue-500/30 text-[10px] px-1.5 py-0.2 rounded-full">
            {queue.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('INPUT')}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'INPUT' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
        >
          Manual Input
        </button>
      </div>

      {/* Main Content Area Expanded layout */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[280px,1fr,360px] gap-4 lg:gap-0 bg-[#11151C] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">

        {/* SIDEBAR QUEUE PANEL (Left Panel) */}
        <div className={`bg-[#141922] lg:border-r border-gray-800 p-4 sm:p-6 flex flex-col ${activeTab === 'QUEUE' ? 'flex' : 'hidden lg:flex'
          } min-h-[350px] lg:h-[580px]`}>
          <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Incoming Queue</h3>
            <span className="bg-blue-600 text-[10px] px-2 py-0.5 rounded-full font-black">
              {queue.length}
            </span>
          </div>

          <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[320px] lg:max-h-none">
            {queue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-30 min-h-[160px]">
                <p className="text-xs font-mono text-gray-500">Awaiting stream packets...</p>
              </div>
            ) : (
              queue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectRequest(item)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${selectedRequestId === item.id
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                      : 'bg-[#0B0E14] border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-mono text-xs font-bold tracking-wide">
                      {item.id}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono truncate w-full">
                    {item.payload.proof ? `${item.payload.proof.substring(0, 26)}...` : 'Malformed Payload'}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* AUDIT STATUS VIEWPORT (Middle Panel) */}
        <div className={`p-6 sm:p-10 lg:p-12 flex flex-col items-center justify-center text-center lg:border-r border-gray-800 ${activeTab === 'AUDIT' ? 'flex' : 'hidden lg:flex'
          } min-h-[380px] lg:h-[580px]`}>

          {status === 'IDLE' && (
            <div className="opacity-60 transition-opacity max-w-sm">
              <div className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center mx-auto mb-4 text-gray-500 text-lg">
                ⏳
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-400 tracking-tight mb-2">AWAITING PAYLOAD</h2>
              <p className="text-xs font-mono text-gray-500 leading-relaxed">
                Select an item from the queue or input proof payload data to verify.
              </p>
              {queue.length > 0 && (
                <button
                  onClick={() => setActiveTab('QUEUE')}
                  className="mt-4 px-4 py-1.5 bg-blue-600/20 border border-blue-500/40 text-blue-400 text-xs rounded-lg lg:hidden"
                >
                  Open Queue ({queue.length})
                </button>
              )}
            </div>
          )}

          {status === 'LOADING' && (
            <div className="animate-pulse">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-lg font-bold text-blue-400 tracking-widest uppercase">Auditing Chain...</h2>
              <p className="text-xs font-mono text-gray-500 mt-2">Checking Merkle Inclusion Path</p>
            </div>
          )}

          {status === 'SUCCESS' && (
            <div className="animate-in zoom-in duration-300 w-full max-w-md">
              <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 border border-green-500/30 shadow-lg shadow-green-500/10">✓</div>
              <h2 className="text-xl sm:text-2xl font-black text-green-400 mb-4 sm:mb-6">AUTHENTIC</h2>

              <div className="w-full flex flex-col gap-2.5 mb-4 sm:mb-6">
                <div className="bg-[#0B0E14] border border-green-500/30 rounded-xl p-3.5">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5 text-left">Verified Identity</p>
                  <p className="text-base sm:text-lg font-black text-white tracking-wide text-left break-words">{citizenName}</p>
                </div>

                <div className="bg-[#0B0E14] border border-gray-800 rounded-xl p-3.5">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5 text-left">Anchored Public Root</p>
                  <p className="text-[11px] sm:text-xs font-mono text-green-400 break-all text-left">{verifiedRoot}</p>
                </div>
              </div>

              <p className="text-[11px] font-mono text-green-500/80 leading-snug px-2">{message}</p>
              <button
                onClick={() => { setStatus('IDLE'); setJsonInput(''); setSelectedRequestId(null); }}
                className="mt-5 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs rounded-lg transition-all text-gray-300"
              >
                Reset Terminal
              </button>
            </div>
          )}

          {status === 'FAILED' && (
            <div className="animate-in zoom-in duration-300 w-full max-w-md">
              <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 border border-red-500/30 shadow-lg shadow-red-500/10">✗</div>
              <h2 className="text-xl sm:text-2xl font-black text-red-400 mb-2">ACCESS DENIED</h2>
              <p className="text-xs font-mono text-red-500/80 mb-4 break-words px-2">{message}</p>
              <button
                onClick={() => { setStatus('IDLE'); setJsonInput(''); setSelectedRequestId(null); }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs rounded-lg transition-all text-gray-300"
              >
                Try Again
              </button>
            </div>
          )}

        </div>

        {/* INPUT SOURCE & CONFIGURATION (Right Panel) */}
        <div className={`p-4 sm:p-6 lg:p-8 bg-[#151A22] flex flex-col ${activeTab === 'INPUT' ? 'flex' : 'hidden lg:flex'
          } min-h-[350px] lg:h-[580px]`}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Input Configuration</h3>

          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              if (selectedRequestId) setSelectedRequestId(null);
            }}
            placeholder={'{\n  "proof": "0x...",\n  "publicInputs": [\n    "0x...",\n    "0x..."\n  ]\n}'}
            className="w-full flex-grow min-h-[160px] bg-[#0B0E14] border border-gray-800 rounded-xl p-3 sm:p-4 font-mono text-xs text-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all mb-4"
          ></textarea>

          <button
            onClick={handleVerify}
            disabled={status === 'LOADING' || !jsonInput.trim()}
            className="w-full py-3.5 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            Run Crypto-Audit
          </button>
        </div>

      </div>
    </div>
  );
}