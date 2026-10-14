import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { LOCAL_REGISTRY_ADDRESS, REGISTRY_ABI, PUBLIC_ANCHOR_ADDRESS, ANCHOR_ABI } from "./contractConfig"; 
import { LTOMerkleTree } from './utils/merkleTree'; 
import { QRCodeSVG } from 'qrcode.react'; 
import { Html5QrcodeScanner } from 'html5-qrcode'; 

export default function RegistryPage() {
  const [citizens, setCitizens] = useState([]);
  const [inputLeaves, setInputLeaves] = useState({});
  const [loading, setLoading] = useState(false);
  const [recentActions, setRecentActions] = useState([]);
  const [selectedLicenses, setSelectedLicenses] = useState([]);

  // --- QR CODE WORKFLOW STATES ---
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('');
  const scannerRef = useRef(null);

  // Change it from localhost to your laptop's actual Wi-Fi IP
  const BACKEND_URL = "http://localhost:3000";

  const totalUsers = citizens.length;
  const pendingCount = citizens.filter(c => c?.status === 'Pending').length;
  const activeCount = citizens.filter(c => c?.status === 'Active').length;
  const revokedCount = citizens.filter(c => c?.status === 'Revoked').length;

  // --- 🔥 HELPER: MASK NAME FOR THE MODAL POPUP ONLY (e.g., Lorena Morales -> L**** M.) ---
  const maskName = (firstName, lastName) => {
    if (!firstName || !lastName) return "Unknown Identity";
    return `${firstName.charAt(0).toUpperCase()}**** ${lastName.charAt(0).toUpperCase()}.`;
  };

  // --- 🔥 HELPER: MASK ID FOR THE MODAL POPUP ONLY (e.g., N01-26-695452 -> N**-***-***) ---
  const maskLicenseID = (id) => {
    if (!id) return "N**-***-***";
    const parts = id.split('-');
    return parts.length === 3 ? `${parts[0].charAt(0)}**-***-***` : id.substring(0, 1) + "**-***-***";
  };

  // --- 🔥 HELPER: CONVERT SVG COMPONENT FRAME AND DOWNLOAD AS PNG ---
  const downloadQRImage = () => {
    if (!selectedCitizen) return;
    const svgElement = document.getElementById("registry-qr-svg");
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const context = canvas.getContext("2d");
      
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, 300, 300);
      context.drawImage(image, 15, 15, 270, 270);
      
      const downloadLink = document.createElement("a");
      downloadLink.href = canvas.toDataURL("image/png");
      downloadLink.download = `${selectedCitizen.subject.licenseID}_Security_Token.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    image.src = blobURL;
  };

  const logAction = (actionType, name) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRecentActions(prev => [{ time, actionType, name }, ...prev].slice(0, 3)); 
  };

  const fetchDatabaseData = async () => {
    try {
      setLoading(true); // ✨ FIXED Typo here
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

  // --- CAM HARDWARE STREAM MONITORING ---
  useEffect(() => {
    if (isScannerActive) {
      scannerRef.current = new Html5QrcodeScanner(
        "admin-portal-scanner",
        { fps: 12, qrbox: { width: 230, height: 230 } },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.licenseID && parsed.leafHash) {
              handleLeafChange(parsed.licenseID, parsed.leafHash);
              setScannerStatus(`✅ Extracted successfully for ID: ${parsed.licenseID}`);
              handleStopScanner();
            } else {
              setScannerStatus("❌ Error: QR code missing required data parameters.");
            }
          } catch (e) {
            setScannerStatus(`⚠️ Raw String Detected:\n${decodedText}`);
          }
        },
        (err) => { }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Scanner tracking hardware failure:", e));
      }
    };
  }, [isScannerActive]);

  const handleStopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScannerActive(false);
  };

  const handleOpenQRModal = (citizen) => {
    const qrPayload = JSON.stringify({
      licenseID: citizen.subject.licenseID,
      ltoSignature: citizen.ltoSignature
    });
    setSelectedCitizen({ ...citizen, qrValue: qrPayload });
    setIsModalOpen(true);
  };

  const handleSeedDatabase = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/admin/seed-10`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
      });
      
      if (response.ok) {
        alert("✅ Core Database Synced! Missing users were added safely.");
        logAction("System", "Auto-Seeded Core Users");
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

  const handleLocalChainWarmUp = async () => {
    try {
      setLoading(true);
      console.log("Requesting historical sequence list from backend...");
      
      const response = await fetch(`${BACKEND_URL}/api/admin/get-active-sync-list`);
      const { citizensToSync, expectedRoot } = await response.json();

      if (!citizensToSync || citizensToSync.length === 0) {
        alert("ℹ️ No active users found in MongoDB to synchronize. Chain is up-to-date.");
        setLoading(false);
        return;
      }

      logAction("Recovery", `Starting warm-up for ${citizensToSync.length} profiles...`);

      const localProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const localWallet = new ethers.Wallet(import.meta.env.VITE_ADMIN_PRIVATE_KEY, localProvider);
      const localContract = new ethers.Contract(LOCAL_REGISTRY_ADDRESS, REGISTRY_ABI, localWallet);

      let historicalLeaves = [];

      for (let i = 0; i < citizensToSync.length; i++) {
        const citizen = citizensToSync[i];
        const currentLeaf = citizen.status === "Revoked" ? "0" : citizen.leafHash;
        historicalLeaves.push(currentLeaf);

        const tempTree = new LTOMerkleTree();
        await tempTree.initialize(historicalLeaves);
        const intermediateRoot = await tempTree.getRoot();

        if (citizen.status === "Revoked") {
          const tx = await localContract.Revoke(citizen.index, intermediateRoot);
          await tx.wait();
        } else {
          const tx = await localContract.Active(currentLeaf, intermediateRoot);
          await tx.wait();
        }
      }

      alert(`⚡ SUCCESS! Hardhat Local Chain fully warmed up.\n\nRestored ${citizensToSync.length} states.\nFinal Root: ${expectedRoot}`);
      fetchDatabaseData();

    } catch (error) {
      console.error("Warm up error:", error);
      alert(`❌ Warm up failed. Make sure 'npx hardhat node' is running!`);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (licenseID) => {
    const leafToPaste = inputLeaves[licenseID];
    if (!leafToPaste) {
      alert("Please paste the Merkle Leaf first!");
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${BACKEND_URL}/api/citizen/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseID: licenseID, leafHash: leafToPaste })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Backend failed");

      const finalLeaf = result.leafHash || leafToPaste;
      const finalRoot = result.newRoot || result.root || result.merkleRoot;

      if (!finalLeaf || !finalRoot) {
        alert("❌ Missing Data! Check backend response.");
        setLoading(false);
        return;
      }

      const localProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const localWallet = new ethers.Wallet(import.meta.env.VITE_ADMIN_PRIVATE_KEY, localProvider);
      const localContract = new ethers.Contract(LOCAL_REGISTRY_ADDRESS, REGISTRY_ABI, localWallet);

      const tx = await localContract.Active(finalLeaf, finalRoot);
      await tx.wait();
      
      const target = citizens.find(c => c.subject.licenseID === licenseID);
      logAction("Activated", target ? `${target.subject.firstName} ${target.subject.lastName}` : licenseID);

      alert("🚀 SUCCESS! User Active in Database & Local Chain.");
      fetchDatabaseData(); 
    } catch (error) {
      console.error(error);
      alert(`❌ Transaction failed. Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (index) => {
    const promptMessage = 
      `Revoke Driver Index #${index}?\n\n` +
      `Select the official legal reason code:\n` +
      `1 - Maximum Demerit Points Accumulated (LTO Demerit System)\n` +
      `2 - DUI Conviction (R.A. 10586 - Anti-Drunk/Drugged Driving Act)\n` +
      `3 - Identity Fraud / Submission of Falsified Documents\n` +
      `4 - Medical Unfitness or Judicial Disqualification Mandate\n\n` +
      `Enter selection number (1-4):`;

    const selection = window.prompt(promptMessage);
    if (selection === null || selection.trim() === "") return;

    let selectedReason = "";
    switch(selection.trim()) {
      case "1":
        selectedReason = "Maximum Demerit Points Accumulated (LTO Demerit System)";
        break;
      case "2":
        selectedReason = "DUI Conviction (R.A. 10586)";
        break;
      case "3":
        selectedReason = "Identity Fraud / Submission of Falsified Documents";
        break;
      case "4":
        selectedReason = "Medical Unfitness or Judicial Disqualification Mandate";
        break;
      default:
        alert("❌ Invalid selection! Revocation aborted.");
        return;
    }

    try {
      setLoading(true);
      const indexedCitizens = citizens.filter(c => c.index !== null).sort((a, b) => a.index - b.index);
      let updatedLeaves = indexedCitizens.map(c => (c.status === "Revoked" ? "0" : c.leafHash)); 
      updatedLeaves[index] = "0"; 

      const ltoTree = new LTOMerkleTree();
      await ltoTree.initialize(updatedLeaves);
      const realNewRoot = await ltoTree.getRoot();

      const localProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const localWallet = new ethers.Wallet(import.meta.env.VITE_ADMIN_PRIVATE_KEY, localProvider);
      const localContract = new ethers.Contract(LOCAL_REGISTRY_ADDRESS, REGISTRY_ABI, localWallet);

      const tx = await localContract.Revoke(index, realNewRoot);
      await tx.wait();

      await fetch(`${BACKEND_URL}/api/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          driverIndex: index, 
          newRoot: realNewRoot,
          reason: selectedReason
        })
      });

      const target = citizens.find(c => c.index === index);
      logAction("Revoked", target ? `${target.subject.firstName} ${target.subject.lastName}` : `Index #${index}`);

      alert(`✅ License Revoked successfully.\nReason: ${selectedReason}`);
      fetchDatabaseData(); 
    } catch (error) {
      console.error(error);
      alert("❌ Revocation Failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (citizen) => {
    if (!window.confirm(`Restore License for ${citizen.subject.firstName}?`)) return;
    if (!citizen.leafHash || citizen.leafHash === "0") {
        alert("❌ Error: Cannot restore. Original Leaf Hash missing.");
        return;
    }

    try {
      setLoading(true);
      const indexedCitizens = citizens.filter(c => c.index !== null).sort((a, b) => a.index - b.index);
      let updatedLeaves = indexedCitizens.map(c => c.index === citizen.index ? citizen.leafHash : (c.status === "Revoked" ? "0" : c.leafHash));

      const ltoTree = new LTOMerkleTree();
      await ltoTree.initialize(updatedLeaves);
      const realNewRoot = await ltoTree.getRoot();

      const localProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const localWallet = new ethers.Wallet(import.meta.env.VITE_ADMIN_PRIVATE_KEY, localProvider);
      const localContract = new ethers.Contract(LOCAL_REGISTRY_ADDRESS, REGISTRY_ABI, localWallet);

      const tx = await localContract.Restore(citizen.index, citizen.leafHash, realNewRoot); 
      await tx.wait();

      await fetch(`${BACKEND_URL}/api/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverIndex: citizen.index, newRoot: realNewRoot })
      });

      logAction("Restored", `${citizen.subject.firstName} ${citizen.subject.lastName}`);
      alert("✅ License Restored in Database & Local Chain.");
      fetchDatabaseData(); 
    } catch (error) {
      console.error(error);
      alert("❌ Restore Failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalPublicAnchor = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/anchor-root`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Anchoring route failed");

      logAction("Anchored", "Global Root to Sepolia");
      alert(`🚀 BATCH ANCHOR SUCCESSFUL!\n\nAll actions locked onto the Sepolia Public Chain.\n\nRoot Hash: ${result.anchoredRoot}`);
    } catch (error) {
      console.error(error);
      alert(`❌ Anchor Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJSON = (citizen) => {
    const exactFormat = { subject: citizen.subject, ltoSignature: citizen.ltoSignature };
    downloadJSONFile(exactFormat, `${citizen.subject.licenseID}_mock_credentials.json`);
    logAction("Exported", `${citizen.subject.firstName}'s JSON`);
  };

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLicenses(citizens.map(c => c.subject.licenseID));
    } else {
      setSelectedLicenses([]);
    }
  };

  const handleToggleSelect = (licenseID) => {
    setSelectedLicenses(prev => 
      prev.includes(licenseID) ? prev.filter(id => id !== licenseID) : [...prev, licenseID]
    );
  };

  const handleBulkExport = () => {
    if (selectedLicenses.length === 0) return;

    const exportArray = citizens
      .filter(c => selectedLicenses.includes(c.subject.licenseID))
      .map(c => ({
        subject: c.subject,
        ltoSignature: c.ltoSignature
      }));

    downloadJSONFile(exportArray, `bulk_export_${selectedLicenses.length}_users.json`);
    logAction("Bulk Exported", `${selectedLicenses.length} Users`);
    setSelectedLicenses([]); 
  };

  const downloadJSONFile = (dataObj, filename) => {
    const jsonString = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold">LTO Admin Portal</h2>
          <p className="text-sm text-gray-500">Registry & Revocation Management</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setIsScannerActive(!isScannerActive); setScannerStatus(''); }}
            className={`px-4 py-2 text-white font-bold rounded-lg shadow-sm flex items-center gap-1 transition-colors ${
              isScannerActive ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {isScannerActive ? "📷 Close QR Scanner" : "📷 Scan User Leaf Hash QR"}
          </button>
          <button 
            onClick={handleGlobalPublicAnchor}
            className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition-colors shadow-sm flex items-center gap-1"
          >
            🔗 Batch Anchor to Sepolia
          </button>
          <button 
            onClick={handleLocalChainWarmUp}
            className="px-4 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-500 transition-colors shadow-sm flex items-center gap-1"
          >
            ⚡ Warm Up Local Chain
          </button>
          {selectedLicenses.length > 0 && (
            <button 
              onClick={handleBulkExport}
              className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 shadow-lg flex items-center gap-2 animate-in fade-in"
            >
              📦 Bulk Export ({selectedLicenses.length})
            </button>
          )}
          <button 
            onClick={handleSeedDatabase}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 shadow-sm"
          >
            📥 Auto-Seed
          </button>
        </div>
      </div>

      {isScannerActive && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-[#1C2330] border border-gray-200 dark:border-gray-800 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center shadow-md animate-in slide-in-from-top duration-300">
          <div className="md:col-span-1 text-center md:text-left">
            <h3 className="text-sm font-black uppercase tracking-wider text-blue-500">Biometric Verification Stream</h3>
            <p className="text-xs text-gray-400 font-medium mt-1 leading-relaxed">Hold applicant's Leaf Hash QR to webcam display grid canvas to automate configuration mapping inputs.</p>
            {scannerStatus && (
              <div className="mt-4 p-2.5 bg-black/40 border border-gray-800 rounded-xl text-center text-[11px] font-mono tracking-wide text-gray-300">
                {scannerStatus}
              </div>
            )}
          </div>
          <div className="md:col-span-2 max-w-sm mx-auto w-full overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700 bg-black shadow-inner">
            <div id="admin-portal-scanner" className="w-full"></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#151A22] border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm">
          <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Total Citizens</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-[#151A22] border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm">
          <p className="text-[10px] uppercase font-bold text-orange-500 mb-1">Pending Generation</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-[#151A22] border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm">
          <p className="text-[10px] uppercase font-bold text-emerald-500 mb-1">Active on Chain</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-[#151A22] border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm">
          <p className="text-[10px] uppercase font-bold text-red-500 mb-1">Revoked Licenses</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{revokedCount}</p>
        </div>
      </div>

      {recentActions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-3 mb-6 flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider">Recent Activity:</span>
          <div className="flex gap-4 text-xs">
            {recentActions.map((log, i) => (
              <span key={i} className="text-gray-600 dark:text-gray-300">
                <span className="text-gray-400">[{log.time}]</span> 
                <strong className={`mx-1 ${
                  log.actionType === 'Activated' ? 'text-emerald-500' : 
                  log.actionType === 'Revoked' ? 'text-red-500' : 
                  log.actionType === 'Restored' ? 'text-blue-500' : 'text-gray-500'
                }`}>{log.actionType}</strong> 
                {log.name}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-[#151A22] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center animate-pulse font-bold text-blue-500">
            Processing Local Sync... Please wait.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1E2532] border-b dark:border-gray-800">
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    onChange={handleToggleSelectAll} 
                    checked={citizens.length > 0 && selectedLicenses.length === citizens.length}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 w-12 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">#</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">License ID</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Merkle Status</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {citizens.map((citizen, idx) => {
                if (!citizen || !citizen.subject) return null;
                const isRevoked = citizen.status === "Revoked";
                const isPending = citizen.status === "Pending";
                const isActive = citizen.status === "Active";
                const isSelected = selectedLicenses.includes(citizen.subject.licenseID);

                return (
                  <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-[#1A202C] transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleToggleSelect(citizen.subject.licenseID)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    <td className="p-4 text-sm font-mono text-center text-gray-400 font-bold">
                      {idx}
                    </td>

                    <td className="p-4 font-mono font-bold text-sm text-gray-900 dark:text-gray-200">
                      <div className="flex items-center gap-3">
                        {citizen.subject.licenseID}
                        <button 
                          onClick={() => handleDownloadJSON(citizen)}
                          title="Export Credentials JSON"
                          className="text-gray-400 hover:text-blue-500 transition-colors p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                      </div>
                    </td>

                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleOpenQRModal(citizen)}
                          title="Generate Secure Identity Login Token"
                          className="text-[11px] px-2 py-0.5 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500 hover:text-white rounded text-blue-400 font-bold transition-all active:scale-95"
                        >
                          🔑 QR
                        </button>
                        <span>{citizen.subject.firstName} {citizen.subject.lastName}</span>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      {isPending && <span className="text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 px-3 py-1 rounded-full text-[10px] uppercase font-bold border border-orange-200 dark:border-orange-800/50">Pending</span>}
                      {isActive && <span className="text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] uppercase font-bold border border-emerald-200 dark:border-emerald-800/50">Active (Idx: {citizen.index})</span>}
                      {isRevoked && <span className="text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full text-[10px] uppercase font-bold border border-red-200 dark:border-red-800/50">Revoked</span>}
                    </td>
                    
                    <td className="p-4 w-1/3">
                      {isPending && (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Paste Leaf Hash..." 
                            value={inputLeaves[citizen.subject.licenseID] || ''}
                            onChange={(e) => handleLeafChange(citizen.subject.licenseID, e.target.value)}
                            className="w-full p-2 text-xs font-mono bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-700 rounded outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                          />
                          <button onClick={() => handleActivate(citizen.subject.licenseID)} className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-500 transition-colors shadow-sm">Activate</button>
                        </div>
                      )}
                      {isActive && (
                        <button onClick={() => handleRevoke(citizen.index)} className="text-red-600 dark:text-red-400 font-semibold text-sm hover:text-red-500 transition-colors flex items-center gap-1">Revoke License</button>
                      )}
                      {isRevoked && (
                        <button onClick={() => handleRestore(citizen)} className="text-blue-600 dark:text-blue-400 font-semibold text-sm hover:text-blue-500 transition-colors flex items-center gap-1">Restore License</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* OVERLAY MODAL FOR RENDERING KEY PAIR LOGIN TOKENS WITH GCASH MASKING */}
      {isModalOpen && selectedCitizen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#151A22] border border-gray-800 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl relative">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Registration Identity Token</h3>
            <p className="text-[11px] text-gray-400 mt-1 mb-5">Scan code to link encrypted ID credential block payload.</p>
            
            {/* White card container to render the ENLARGED 240px QR Code safely */}
            <div className="bg-white p-4 rounded-xl inline-block mb-3 shadow-md">
              <QRCodeSVG id="registry-qr-svg" value={selectedCitizen.qrValue} size={240} level="H" />
            </div>

            {/* Action download triggers option directly underneath */}
            <div className="mb-4 flex justify-center">
              <button 
                onClick={downloadQRImage}
                title="Download QR Code Token Image (PNG)"
                className="p-2 bg-gray-800 hover:bg-blue-600 text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-all flex items-center justify-center gap-1 text-[11px] font-bold"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Save QR Image</span>
              </button>
            </div>

            {/* Encrypted data overview display container showing MASKED values only here */}
            <div className="text-left bg-[#0B0E14] border border-gray-800 rounded-xl p-3 mb-5 font-mono text-[11px] text-gray-400 flex flex-col gap-1">
              <p><span className="text-blue-400 font-bold">TARGET ID:</span> {maskLicenseID(selectedCitizen.subject.licenseID)}</p>
              <p><span className="text-blue-400 font-bold">CITIZEN:</span> {maskName(selectedCitizen.subject.firstName, selectedCitizen.subject.lastName)}</p>
              <p><span className="text-blue-400 font-bold">STATUS:</span> <span className={selectedCitizen.status === 'Active' ? 'text-emerald-400' : selectedCitizen.status === 'Revoked' ? 'text-red-400' : 'text-orange-400'}>{selectedCitizen.status.toUpperCase()}</span></p>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all border border-gray-700"
            >
              Close Token View
            </button>
          </div>
        </div>
      )}

    </div>
  );
}