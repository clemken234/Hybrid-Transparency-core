import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LOCAL_REGISTRY_ADDRESS, REGISTRY_ABI, PUBLIC_ANCHOR_ADDRESS, ANCHOR_ABI } from "./contractConfig"; 
import { LTOMerkleTree } from './utils/merkleTree'; 

export default function RegistryPage() {
  const [citizens, setCitizens] = useState([]);
  const [inputLeaves, setInputLeaves] = useState({});
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = "http://localhost:3000"; 

  // 1. Fetch data from MongoDB 
  const fetchDatabaseData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/admin/get-all-citizens`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setCitizens(data);
      } else {
        setCitizens([]);
      }
    } catch (error) {
      console.error("Error fetching database data:", error);
      setCitizens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchDatabaseData(); 
  }, []);

  // 2. SEED 10 PENDING USERS 
  const handleSeedDatabase = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/admin/seed-10`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' 
        }
      });
      
      if (response.ok) {
        alert("✅ 10 Users successfully loaded into Database as Pending!");
        fetchDatabaseData(); 
      } else {
        alert("❌ Failed to seed database.");
      }
    } catch (error) {
      console.error("Seed error:", error);
      alert("❌ Failed to seed database. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleLeafChange = (licenseID, value) => {
    setInputLeaves(prev => ({ ...prev, [licenseID]: value }));
  };

  // 3. DUAL-CHAIN ACTIVATION (With Bulletproof Variable Check)
  const handleActivate = async (licenseID) => {
    const leafToPaste = inputLeaves[licenseID];
    if (!leafToPaste) {
      alert("Please paste the Merkle Leaf first!");
      return;
    }

    try {
      setLoading(true);
      
      // Part A: Update Backend & Get the computed Merkle Root
      const response = await fetch(`${BACKEND_URL}/api/citizen/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseID: licenseID, leafHash: leafToPaste })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Backend failed");

      // --- THE FIX: Safe Variable Extraction ---
      console.log("Backend Data Received:", result); 
      
      // This forces the code to find the correct data even if the backend named it differently
      const finalLeaf = result.leafHash || leafToPaste;
      const finalRoot = result.newRoot || result.root || result.merkleRoot;

      if (!finalLeaf || !finalRoot) {
        alert("❌ Missing Data! Check your backend response in the console.");
        setLoading(false);
        return;
      }

      // --- 1. CONNECT TO NATIONAL CHAIN (HARDHAT) ---
      const localProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const localWallet = new ethers.Wallet(import.meta.env.VITE_ADMIN_PRIVATE_KEY, localProvider);
      const localContract = new ethers.Contract(LOCAL_REGISTRY_ADDRESS, REGISTRY_ABI, localWallet);

      // --- 2. CONNECT TO PUBLIC CHAIN (SEPOLIA via METAMASK) ---
      if (!window.ethereum) {
        alert("❌ MetaMask not found! Please install the MetaMask extension.");
        setLoading(false);
        return;
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const publicAnchor = new ethers.Contract(PUBLIC_ANCHOR_ADDRESS, ANCHOR_ABI, signer);

      // --- 3. EXECUTE TRANSACTIONS ---
      console.log("Pushing to National Chain...");
      const tx1 = await localContract.Active(finalLeaf, finalRoot);
      await tx1.wait();
      
      console.log("Pushing to Public Chain...");
      const tx2 = await publicAnchor.updateAnchoredRoot(finalRoot);
      await tx2.wait();

      alert("🚀 SUCCESS! User Active on National Chain & Anchored to Sepolia.");
      fetchDatabaseData(); 

    } catch (error) {
      console.error("Dual-Chain Error:", error);
      alert(`❌ Transaction failed. Check console. Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 4. THE REVOKE ACTION
  const handleRevoke = async (index) => {
    const confirmRevoke = window.confirm(`Revoke Driver Index #${index}?`);
    if (!confirmRevoke) return;

    try {
      setLoading(true);

      const indexedCitizens = citizens.filter(c => c.index !== null).sort((a, b) => a.index - b.index);
      let updatedLeaves = indexedCitizens.map(c => (c.status === "Revoked" ? "0" : c.leafHash)); 
      updatedLeaves[index] = "0"; 

      const ltoTree = new LTOMerkleTree();
      await ltoTree.initialize(updatedLeaves);
      const realNewRoot = await ltoTree.getRoot();

      // 1. National Chain
      const localProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const localWallet = new ethers.Wallet(import.meta.env.VITE_ADMIN_PRIVATE_KEY, localProvider);
      const localContract = new ethers.Contract(LOCAL_REGISTRY_ADDRESS, REGISTRY_ABI, localWallet);

      // 2. Public Chain
      if (!window.ethereum) throw new Error("MetaMask not found!");
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const publicAnchor = new ethers.Contract(PUBLIC_ANCHOR_ADDRESS, ANCHOR_ABI, signer);

      // Execute
      const txA = await localContract.Revoke(index, realNewRoot);
      await txA.wait();

      const txB = await publicAnchor.updateAnchoredRoot(realNewRoot);
      await txB.wait();

      // Database Tx
      await fetch(`${BACKEND_URL}/api/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverIndex: index, newRoot: realNewRoot })
      });

      alert("✅ License Revoked and Anchored Successfully!");
      fetchDatabaseData(); 
    } catch (error) {
      console.error(error);
      alert("❌ Revocation Failed. Check Console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold">LTO Admin Portal</h2>
          <p className="text-sm text-gray-500">Registry & Revocation Management</p>
        </div>
        <button 
          onClick={handleSeedDatabase}
          className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500"
        >
          📥 Load 10 Users to Database
        </button>
      </div>
      
      <div className="bg-white dark:bg-[#151A22] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center animate-pulse">Processing Dual-Chain Sync... Please check MetaMask.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1E2532] border-b dark:border-gray-800">
                <th className="p-4 text-xs font-semibold uppercase tracking-wider">License ID</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Name</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Merkle Status</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {citizens.map((citizen, idx) => {
                if (!citizen || !citizen.subject) return null;
                const isRevoked = citizen.status === "Revoked";
                const isPending = citizen.status === "Pending";
                const isActive = citizen.status === "Active";

                return (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[#1A202C]">
                    <td className="p-4 font-mono font-bold text-sm">{citizen.subject.licenseID}</td>
                    <td className="p-4 text-sm">{citizen.subject.firstName} {citizen.subject.lastName}</td>
                    <td className="p-4">
                      {isPending && <span className="text-orange-700 bg-orange-100 px-3 py-1 rounded-full text-[10px] uppercase font-bold">Pending</span>}
                      {isActive && <span className="text-green-700 bg-green-100 px-3 py-1 rounded-full text-[10px] uppercase font-bold">Active (Idx: {citizen.index})</span>}
                      {isRevoked && <span className="text-red-700 bg-red-100 px-3 py-1 rounded-full text-[10px] uppercase font-bold">Revoked</span>}
                    </td>
                    <td className="p-4 w-1/3">
                      {isPending && (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Paste Leaf Hash..." 
                            value={inputLeaves[citizen.subject.licenseID] || ''}
                            onChange={(e) => handleLeafChange(citizen.subject.licenseID, e.target.value)}
                            className="w-full p-2 text-xs font-mono bg-gray-50 dark:bg-black border dark:border-gray-700 rounded"
                          />
                          <button onClick={() => handleActivate(citizen.subject.licenseID)} className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-500">Activate</button>
                        </div>
                      )}
                      {isActive && <button onClick={() => handleRevoke(citizen.index)} className="text-red-600 font-semibold text-sm">Revoke License</button>}
                      {isRevoked && <span className="text-gray-400 text-sm italic">Revoked On-Chain</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}