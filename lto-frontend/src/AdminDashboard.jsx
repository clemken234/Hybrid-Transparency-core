import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers'; // ADDED: Required for blockchain
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contractConfig'; // ADDED: Required for your smart contract
import { LTOMerkleTree } from './utils/merkleTree';

// --- RAW SVG ICONS ---
const Shield = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const UserPlus = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
const FileJson = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12H8v6h2"/><path d="M14 12h2v6h-2"/></svg>;
const AlertTriangle = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const CheckCircle = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

const AdminDashboard = () => {
  const [generatedData, setGeneratedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  
  // ADDED: Missing Blockchain State
  const [leaves, setLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState('registry'); 

  // ADDED: Missing Fetch Function so your React app knows who the drivers are!
  const fetchBlockchainData = async () => {
    try {
      setLoading(true);
      const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const allLeaves = await contract.getAllLeaves();
      setLeaves(allLeaves.map(leaf => leaf.toString()));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Run the fetch function when the page loads
  useEffect(() => {
    fetchBlockchainData();
  }, []);

  // 1. GENERATE CREDENTIAL
  const handleGenerate = async () => {
    setLoading(true);
    setStatusMessage("Processing LTO signature...");
    try {
        const response = await fetch('http://localhost:3000/api/get-driver-data');
        const data = await response.json();
        setGeneratedData(data);
        setStatusMessage("Credential generated successfully.");
    } catch (error) {
        console.error("Error:", error);
        setStatusMessage("Error communicating with server.");
    }
    setLoading(false);
  };

  // 2. REVOKE CREDENTIAL
  const handleRevoke = async (index) => {
    try {
      alert(`Initiating Revocation for Driver #${index}... Please wait. Math engine is loading.`);
      setLoading(true);

      // --- STEP 1: CALCULATE THE REAL NEW MERKLE ROOT USING YOUR FILE ---
      let updatedLeaves = [...leaves]; 
      updatedLeaves[index] = "0"; 

      const ltoTree = new LTOMerkleTree();
      await ltoTree.initialize(updatedLeaves); 
      const realNewRoot = await ltoTree.getRoot(); // ✅ Correct syntax 
      console.log("Calculated Poseidon New Root:", realNewRoot);

      // --- STEP 2: UPDATE THE PUBLIC BLOCKCHAIN ---
      const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC_URL);
      const adminWallet = new ethers.Wallet(import.meta.env.VITE_ADMIN_PRIVATE_KEY, provider);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, adminWallet);

      const tx = await contract.revokeLicense(index, realNewRoot);
      await tx.wait(); // Wait for Etherscan to confirm

      // --- STEP 3: UPDATE YOUR MONGODB ---
      // (Verify this is the correct port! Your handleGenerate uses 3000)
      await fetch('http://localhost:5000/api/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          driverIndex: index, 
          newRoot: realNewRoot 
        })
      });

      alert("✅ License Revoked on Blockchain AND MongoDB!");
      fetchBlockchainData(); // Refresh the table
      
    } catch (error) {
      console.error(error);
      alert("❌ Transaction Failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // ... YOUR RETURN STATEMENT AND JSX REMAINS THE SAME DOWN HERE ...

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* ENTERPRISE HEADER SECTION */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">LTO Registry</h1>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">Admin Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <span className="h-2 w-2 bg-green-500 rounded-full"></span>
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">System Online</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: ACTION CENTER */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Credential Issuance</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Generate a cryptographic payload to issue a new digital driver's license.
            </p>
            
            <button 
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded transition-colors duration-150 flex justify-center items-center gap-2 shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing Request..." : "Generate & Sign Payload"}
            </button>

            {statusMessage && (
              <p className={`text-sm mt-4 text-center font-medium ${statusMessage.includes("Error") ? "text-red-600" : "text-blue-600"}`}>
                {statusMessage}
              </p>
            )}
          </div>

          {/* DISPLAY GENERATED JSON (Light Theme) */}
          {generatedData && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
               <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-gray-600"/> 
                  <h3 className="text-sm font-semibold text-gray-700">Generated Payload</h3>
               </div>
               <div className="p-4 bg-gray-50 overflow-x-auto">
                  <pre className="text-xs text-gray-800 font-mono">
                    {JSON.stringify(generatedData, null, 2)}
                  </pre>
               </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: REGISTRY TABLE */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
                <h2 className="text-lg font-semibold text-gray-900">Active Registry</h2>
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md border border-gray-200">
                  Total Records: 100
                </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Index</th>
                    <th className="px-6 py-3">Merkle Hash (Public)</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  
                  {/* MOCK DATA ROW 1 */}
                  <tr className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-900 font-medium">#8</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">0x164f65af...d8a9a7</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle className="w-3.5 h-3.5" /> Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleRevoke("0x164f65af08b63b3511a2b43b6294c529d20c8454f9520e1d1248936631d8a9a7")} className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded transition-colors text-sm font-medium">
                        Revoke
                      </button>
                    </td>
                  </tr>

                  {/* MOCK DATA ROW 2 */}
                  <tr className="bg-gray-50/50">
                    <td className="px-6 py-4 font-mono text-gray-500">#9</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">0x1bbc2e41...1a63b0</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        <AlertTriangle className="w-3.5 h-3.5" /> Revoked
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button disabled className="text-gray-400 px-3 py-1.5 rounded text-sm font-medium cursor-not-allowed">
                        Revoked
                      </button>
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;