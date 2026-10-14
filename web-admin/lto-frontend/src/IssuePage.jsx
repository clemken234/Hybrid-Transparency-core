import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Html5QrcodeScanner } from 'html5-qrcode'; // 🔥 INJECTED FOR CAMERA SCANNING

export default function IssuePage() {
  const [driverData, setDriverData] = useState(null);
  const [signature, setSignature] = useState('');
  const [status, setStatus] = useState('IDLE'); 
  const [logs, setLogs] = useState([]);
  
  // --- Manual Form State ---
  const [isManualMode, setIsManualMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', dateOfBirth: '2000-01-01', 
    licenseType: 'Non-Professional', expirationDate: '2033-01-01', 
    restrictions: 'None', conditions: 'None', bloodType: 'O+', address: ''
  });

  // --- 🔥 INJECTED QR SCANNER STATE CONFIGURATION ---
  const [isScannerActive, setIsScannerActive] = useState(false);
  const scannerRef = useRef(null);

  // Change it from localhost to your laptop's actual Wi-Fi IP
  const BACKEND_URL = "http://localhost:3000";

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  // --- 🔥 INJECTED HOOK: LIVE HARDWARE SCANNER CONTROLLER ---
  useEffect(() => {
    if (isScannerActive && driverData) {
      scannerRef.current = new Html5QrcodeScanner(
        "issue-page-scanner", 
        { fps: 10, qrbox: { width: 220, height: 220 } },
        false
      );

      scannerRef.current.render(
        async (decodedText) => {
          try {
            const parsedData = JSON.parse(decodedText);
            
            // Validate incoming QR structure matches her identity parameters
            if (parsedData.leafHash) {
              addLog(`[CAMERA] Intercepted Leaf Hash QR code: ${parsedData.leafHash.substring(0, 15)}...`);
              handleStopScanner();
              
              // Proceed directly to execute the Merkle Tree Injection
              await executeBlockchainActivation(parsedData.leafHash);
            } else {
              addLog("ERROR: Scanned QR does not contain a valid leafHash field.");
            }
          } catch (e) {
            // Fallback: If it's not JSON, treat the text string as the raw Leaf Hash itself
            addLog(`[CAMERA] Intercepted raw string QR code: ${decodedText.substring(0, 15)}...`);
            handleStopScanner();
            await executeBlockchainActivation(decodedText);
          }
        },
        (error) => { /* Intercept tracking frame refreshes cleanly */ }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Scanner tracking breakdown", err));
      }
    };
  }, [isScannerActive, driverData]);

  const handleStopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScannerActive(false);
  };

  // --- AUTO GENERATOR ---
  const handleGenerateData = async () => {
    setStatus('ACTIVATING'); 
    addLog("Requesting mock KYC applicant & auto-saving to DB...");
    try {
      const response = await fetch(`${BACKEND_URL}/api/get-driver-data`);
      const data = await response.json();
      
      setDriverData(data.subject);
      setSignature(data.ltoSignature);
      setStatus('PENDING_DB'); 
      addLog(`Applicant data received: ${data.subject.firstName} ${data.subject.lastName}.`);
      addLog(`SUCCESS: Saved ${data.subject.licenseID} as PENDING in MongoDB.`);
      setIsManualMode(false); 
    } catch (error) {
      addLog("ERROR: Could not connect to backend node.");
      setStatus('IDLE');
    }
  };

  // --- MANUAL ENCODER SUBMISSION ---
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setStatus('ACTIVATING');
    addLog("Encoding manual applicant to LTO Vault...");
    try {
      const response = await fetch(`${BACKEND_URL}/api/manual-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      
      setDriverData(data.subject);
      setSignature(data.ltoSignature);
      setStatus('PENDING_DB');
      addLog(`Manual encoding successful: ${data.subject.firstName} ${data.subject.lastName}.`);
      addLog(`SUCCESS: Saved ${data.subject.licenseID} as PENDING in MongoDB.`);
      setIsManualMode(false); 
      
      // Reset form
      setFormData({
        firstName: '', lastName: '', dateOfBirth: '2000-01-01', licenseType: 'Non-Professional', 
        expirationDate: '2033-01-01', restrictions: 'None', conditions: 'None', bloodType: 'O+', address: ''
      });
    } catch (error) {
      addLog("ERROR: Could not connect to backend node.");
      setStatus('IDLE');
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- 🔥 REFACTORED TO SCAN AND INJECT DIRECTLY ---
  const handleCitizenActivation = () => {
    if (!driverData) return;
    setIsScannerActive(true);
    addLog("Initializing LTO Verification Camera... Ready to scan Citizen App QR.");
  };

  // --- 🔥 SEPARATED BUSINESS LOGIC ACTION ENGINE ---
  const executeBlockchainActivation = async (finalLeafHash) => {
    setStatus('ACTIVATING');
    addLog("Transmitting scanned Leaf Hash to Backend for Merkle Injection...");

    try {
      const response = await fetch(`${BACKEND_URL}/api/citizen/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseID: driverData.licenseID, leafHash: finalLeafHash })
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('ACTIVE');
        addLog(`SUCCESS: ${result.message}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      addLog(`ERROR: ${error.message}`);
      setStatus('PENDING_DB');
    }
  };

  const handleDownloadJSON = () => {
    if (!driverData || !signature) return;
    const exactFormat = { subject: driverData, ltoSignature: signature };
    const jsonString = JSON.stringify(exactFormat, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${driverData.licenseID}_mock_credentials.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog(`Downloaded strict JSON payload for ${driverData.licenseID}.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Issuance Terminal</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hybrid-State Decentralized Identity Identity Generation.</p>
        </div>
        
        {/* Toggle Mode Button */}
        <button 
          onClick={() => setIsManualMode(!isManualMode)}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          {isManualMode ? "Cancel Manual Encoding" : "✍️ Manual Encode"}
        </button>
      </div>

      {/* --- 🔥 INJECTED: SECURE VIDEO WEBCAM SCREEN RENDERER INTERFACE OVERLAY --- */}
      {isScannerActive && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-[#1E2532] border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col md:flex-row gap-6 items-center shadow-lg animate-in slide-in-from-top">
          <div className="flex-1">
            <h3 className="text-sm font-black text-green-500 uppercase tracking-wider">Awaiting Leaf Token Exchange</h3>
            <p className="text-xs text-gray-400 mt-1">Scan the active QR displayed on the user's mobile wallet app. The system will automatically ingest her verified data packet.</p>
            <button 
              onClick={handleStopScanner}
              className="mt-4 px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg"
            >
              Cancel Camera Stream
            </button>
          </div>
          <div className="max-w-xs w-full overflow-hidden rounded-xl bg-black border border-gray-700">
            <div id="issue-page-scanner" className="w-full"></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8">
        
        <div className="space-y-6">
          
          <div className="p-6 bg-white dark:bg-[#151A22] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleGenerateData}
              disabled={status === 'ACTIVATING' || isManualMode}
              className="flex-1 py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              1. Generate Random
            </button>
            <button 
              onClick={handleCitizenActivation}
              disabled={status !== 'PENDING_DB' || isManualMode || isScannerActive}
              className="flex-1 py-3 bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              2. Scan & Activate User
            </button>
          </div>

          <div className="p-8 bg-white dark:bg-[#151A22] border border-gray-200 dark:border-gray-800 rounded-xl min-h-[350px] shadow-sm relative overflow-hidden">
            
            {!isManualMode && (
              <div className="absolute top-6 right-6">
                {status === 'IDLE' && <span className="px-3 py-1 text-[10px] font-bold uppercase text-gray-500 border border-gray-700 rounded-full">Awaiting Pull</span>}
                {status === 'PENDING_DB' && <span className="px-3 py-1 text-[10px] font-bold uppercase text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-full animate-pulse">DB: Pending</span>}
                {status === 'ACTIVATING' && <span className="px-3 py-1 text-[10px] font-bold uppercase text-blue-400 border border-blue-400/20 rounded-full">Processing...</span>}
                {status === 'ACTIVE' && <span className="px-3 py-1 text-[10px] font-bold uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full">Active on Chain</span>}
              </div>
            )}

            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-8">
              {isManualMode ? "Manual Encoding Form" : "Applicant Payload"}
            </h3>

            {/* --- MANUAL FORM RENDER --- */}
            {isManualMode ? (
              <form onSubmit={handleManualSubmit} className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <input required name="firstName" placeholder="First Name" onChange={handleFormChange} className="w-full p-3 text-sm bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" />
                  <input required name="lastName" placeholder="Last Name" onChange={handleFormChange} className="w-full p-3 text-sm bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" />
                </div>
                <input required name="address" placeholder="Full Address" onChange={handleFormChange} className="w-full p-3 text-sm bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase ml-1">Date of Birth</label>
                    <input type="date" required name="dateOfBirth" defaultValue="2000-01-01" onChange={handleFormChange} className="w-full p-3 mt-1 text-sm bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase ml-1">Expiration Date</label>
                    <input type="date" required name="expirationDate" defaultValue="2033-01-01" onChange={handleFormChange} className="w-full p-3 mt-1 text-sm bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase ml-1">License Type</label>
                    <select name="licenseType" onChange={handleFormChange} className="w-full p-3 mt-1 text-sm bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none">
                      <option>Non-Professional</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase ml-1">Blood Type</label>
                    <select name="bloodType" onChange={handleFormChange} className="w-full p-3 mt-1 text-sm bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none">
                      <option>O+</option><option>A+</option><option>B+</option><option>AB+</option><option>O-</option><option>A-</option><option>B-</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase ml-1">Restrictions</label>
                    <input name="restrictions" defaultValue="None" onChange={handleFormChange} className="w-full p-3 mt-1 text-sm bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase ml-1">Conditions</label>
                  <input name="conditions" defaultValue="None" onChange={handleFormChange} className="w-full p-3 mt-1 text-sm bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" />
                </div>

                <button type="submit" className="w-full mt-4 py-3 bg-purple-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-purple-500 transition-colors">
                  Submit to LTO Vault
                </button>
              </form>
            ) : (
              /* --- STANDARD DATA RENDER (NOW SHOWS ALL FIELDS) --- */
              !driverData ? (
                <div className="flex items-center justify-center h-48 opacity-40">
                  <p className="font-mono text-sm">No data loaded.</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase">License ID</label>
                      <p className="font-mono text-lg font-medium text-gray-900 dark:text-white">{driverData.licenseID}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase">Full Name</label>
                      <p className="font-bold text-lg text-gray-900 dark:text-white">{driverData.firstName} {driverData.lastName}</p>
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] text-gray-500 uppercase">Address</label>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{driverData.address}</p>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 uppercase">Date of Birth</label>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{driverData.dateOfBirth}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase">Expiration Date</label>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{driverData.expirationDate}</p>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 uppercase">License Type / Restrictions</label>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{driverData.licenseType} / <span className="font-semibold">Rest: {driverData.restrictions}</span></p>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase">Blood Type / Conditions</label>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{driverData.bloodType} / <span className="font-semibold">Cond: {driverData.conditions}</span></p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
                    <label className="text-[10px] text-gray-500 uppercase">Admin Digital Signature</label>
                    <p className="font-mono text-[10px] text-blue-600 dark:text-blue-400 break-all mt-1">{signature}</p>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button 
                      onClick={handleDownloadJSON}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Export JSON
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Column: Server Logs */}
        <div className="bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col h-[550px] shadow-inner">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            Node Output / Logs
          </h3>
          <div className="flex-grow overflow-y-auto space-y-2 font-mono text-[10px] text-gray-600 dark:text-gray-400 pr-2">
            {logs.length === 0 ? (
              <p className="opacity-40">System ready. Awaiting instructions...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="border-b border-gray-200 dark:border-gray-800/50 pb-2">
                  <span className={log.includes("SUCCESS") ? "text-emerald-600 dark:text-emerald-400 font-bold" : log.includes("ERROR") ? "text-red-600 dark:text-red-400 font-bold" : ""}>
                    {log}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}