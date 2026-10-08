import React, { useState } from 'react';
import { ethers } from 'ethers';

export default function IssuePage() {
  const [driverData, setDriverData] = useState(null);
  const [signature, setSignature] = useState('');
  // States: IDLE -> GENERATED -> PENDING_DB -> ACTIVATING -> ACTIVE
  const [status, setStatus] = useState('IDLE'); 
  const [logs, setLogs] = useState([]);

  // Ensure this points to your running backend
  const BACKEND_URL = "http://localhost:3000";

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  // --- STEP 1: PULL KYC DATA ---
  const handleGenerateData = async () => {
    setStatus('GENERATING');
    addLog("Requesting mock KYC applicant from system...");
    try {
      const response = await fetch(`${BACKEND_URL}/api/get-driver-data`);
      const data = await response.json();
      
      setDriverData(data.subject);
      setSignature(data.ltoSignature);
      setStatus('GENERATED');
      addLog(`Applicant data received: ${data.subject.firstName} ${data.subject.lastName}.`);
    } catch (error) {
      addLog("ERROR: Could not connect to backend node.");
      setStatus('IDLE');
    }
  };

  // --- STEP 2: ADMIN SAVES AS PENDING ---
  const handleSaveToVault = async () => {
    if (!driverData) return;
    addLog("Saving full KYC to MongoDB (Status: PENDING)...");

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/save-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: driverData,
          ltoSignature: signature
        })
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('PENDING_DB');
        addLog(`SUCCESS: ${result.message}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      addLog(`ERROR: ${error.message}`);
    }
  };

  // --- STEP 3: SIMULATE CITIZEN ACTIVATION ---
  const handleCitizenActivation = async () => {
    if (!driverData) return;
    setStatus('ACTIVATING');
    addLog("Simulating Citizen App: Creating local cryptographic leaf...");

    try {
      // The Citizen App hashes their data locally
      const dataString = JSON.stringify(driverData);
      const simulatedLeaf = ethers.id(dataString); 
      addLog(`Leaf Generated on Mobile: ${simulatedLeaf.substring(0, 15)}...`);

      addLog("Sending Leaf to Backend for Merkle Injection...");
      
      const response = await fetch(`${BACKEND_URL}/api/citizen/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseID: driverData.licenseID,
          leafHash: simulatedLeaf
        })
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('ACTIVE');
        addLog(`SUCCESS: ${result.message}`);
        addLog(`Merkle Root Anchored: ${result.newRoot.substring(0, 20)}...`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      addLog(`ERROR: ${error.message}`);
      setStatus('PENDING_DB');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight">Issuance Terminal</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hybrid-State Decentralized Identity Generation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8">
        
        {/* Left Column: Actions and Data */}
        <div className="space-y-6">
          
          {/* 3-Step Action Buttons */}
          <div className="p-6 bg-white dark:bg-[#151A22] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleGenerateData}
              disabled={status === 'ACTIVATING' || status === 'PENDING_DB'}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              1. Pull Data
            </button>
            <button 
              onClick={handleSaveToVault}
              disabled={status !== 'GENERATED'}
              className="flex-1 py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:bg-gray-200 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            >
              2. Save as Pending
            </button>
            <button 
              onClick={handleCitizenActivation}
              disabled={status !== 'PENDING_DB'}
              className="flex-1 py-3 bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:bg-gray-200 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            >
              3. Citizen App (Activate)
            </button>
          </div>

          {/* KYC Display Card */}
          <div className="p-8 bg-white dark:bg-[#151A22] border border-gray-200 dark:border-gray-800 rounded-xl min-h-[350px] shadow-sm relative">
            
            {/* Status Badges */}
            <div className="absolute top-6 right-6">
              {status === 'IDLE' && <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 border border-gray-200 dark:border-gray-700 rounded-full">Awaiting Pull</span>}
              {status === 'GENERATED' && <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200 dark:border-yellow-400/20 rounded-full">Data Loaded</span>}
              {status === 'PENDING_DB' && <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-400/10 border border-orange-200 dark:border-orange-400/20 rounded-full animate-pulse">DB: Pending Activation</span>}
              {status === 'ACTIVATING' && <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-400/20 rounded-full">Injecting Merkle...</span>}
              {status === 'ACTIVE' && <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border border-emerald-200 dark:border-emerald-400/20 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.15)]">Active on Chain</span>}
            </div>

            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-8">Applicant Payload</h3>

            {!driverData ? (
              <div className="flex items-center justify-center h-48 opacity-40">
                <p className="font-mono text-sm">No data loaded.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">License ID</label>
                    <p className="font-mono text-lg font-medium text-gray-900 dark:text-white">{driverData.licenseID}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">Full Name</label>
                    <p className="font-bold text-lg text-gray-900 dark:text-white">{driverData.firstName} {driverData.lastName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">License Type</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{driverData.license_type}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">Blood Type / Conditions</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{driverData.bloodType} / {driverData.conditions || 'None'}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
                  <label className="text-[10px] text-gray-500 uppercase">Admin Digital Signature</label>
                  <p className="font-mono text-[10px] text-blue-600 dark:text-blue-400 break-all mt-1">{signature}</p>
                </div>
              </div>
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