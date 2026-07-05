"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import { fetchAllLeaves, computeLeanIMTPath, fetchRoot } from "@/utils/chain";

const decodeHexName = (hexString: string) => {
    let str = '';
    // Start at index 2 to skip the "0x"
    for (let i = 2; i < hexString.length; i += 2) {
        const charCode = parseInt(hexString.substring(i, i + 2), 16);
        // Ignore the '00' padding bytes, only convert actual text
        if (charCode > 0) { 
            str += String.fromCharCode(charCode);
        }
    }
    return str;
};

const STEPS = [
  { label: "Fetching Merkle root from blockchain", sub: "Reading on-chain state…" },
  { label: "Computing Merkle inclusion path", sub: "Building proof witness…" },
  { label: "Generating ZK proof", sub: "UltraHonk WASM ~30s…" },
];

export default function ProvePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [citizen, setCitizen] = useState<any>(null);
  const [isProving, setIsProving] = useState(false);
  const [proofData, setProofData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendToVerifier = async () => {
    if (!proofData) return;
    setIsSending(true);
    setSendResult(null);

    try {
      // Structure matches standard ZK verification payloads
      const payload = {
        type: "ZK_VERIFICATION",
        proof: proofData.proof,
        publicInputs: proofData.publicInputs
      };

      // Proxy via Next.js backend to bypass CORS
      const VERIFIER_API_URL = "/api/verify"; 

      const response = await fetch(VERIFIER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Verifier server responded with status ${response.status}`);
      }

      const data = await response.json();
      setSendResult({ 
        success: true, 
        message: data.message || "Proof sent and verified successfully!" 
      });
    } catch (err: unknown) {
      setSendResult({ 
        success: false, 
        message: (err as Error).message || "Failed to deliver proof to the verifier backend." 
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem("citizen_license");
    if (raw) {
      try {
        setCitizen(JSON.parse(raw));
      } catch {
        localStorage.removeItem("citizen_license");
      }
    }
    setIsMounted(true);
  }, []);

  const handleProve = async () => {
    if (!citizen) return;
    setIsProving(true);
    setError(null);
    setProofData(null);
    setCurrentStep(0);

    try {
      // 1. Pull exact required variables from localStorage
      const raw = localStorage.getItem("citizen_license");
      if (!raw) throw new Error("No wallet found. Please register first.");
      
      const parsedData = JSON.parse(raw);
      const secret = parsedData.secret;
      const private_license_data = parsedData.private_license_data;
      const public_name = parsedData.public_name;
      const leafHash = parsedData.leafHash || parsedData.leaf_hash;

      if (!secret || !private_license_data || !public_name || !leafHash) {
        throw new Error("Missing identity variables in wallet. Please re-register.");
      }

      // 2. Call fetchAllLeaves()
      const leaves = await fetchAllLeaves();
      if (!leaves.length) throw new Error("No leaves found on chain. Please wait for your identity to be anchored.");

      setCurrentStep(1);

      // 3. await computeLeanIMTPath to get the dynamic path and root
      const normLeaves = leaves.map((l: string) => l.toLowerCase());
      const merkleResult = await computeLeanIMTPath(leafHash.toLowerCase(), normLeaves);
      if (!merkleResult) throw new Error("Your identity is not yet anchored to the blockchain. Please wait for confirmation.");

      const { path: merklePath, root, leafIndex } = merkleResult;
      
      const publicMerkleRoot = await fetchRoot();
      if (!publicMerkleRoot) throw new Error("Could not fetch Merkle root from the blockchain.");

      // ADD THESE TWO LINES:
      console.log("🛑 Local Standard Root:", root);
      console.log("🛑 Blockchain Root:", publicMerkleRoot);

      setCurrentStep(2);

      // 4. Pass those 6 exact variables into the backend API
      console.log("WAIT, what is the raw name before translation?:", public_name);
      
      const response = await fetch(`/api/prove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          private_license_data: private_license_data,
          merklePath,
          leafIndex,
          public_name,
          publicMerkleRoot
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Backend proof generation failed with status: ${response.status}`);
      }

      const result = await response.json();

      const updated = { ...citizen, merkle_path: merklePath, leaf_index: leafIndex, public_merkle_root: publicMerkleRoot };
      localStorage.setItem("citizen_license", JSON.stringify(updated));

      const history = JSON.parse(localStorage.getItem("proof_history") || "[]");
      history.unshift({ ts: Date.now() });
      localStorage.setItem("proof_history", JSON.stringify(history.slice(0, 20)));

      // Store for verifier page — deleted after on-chain submission
      localStorage.setItem("pending_proof", JSON.stringify(result));

      setProofData(result);
    } catch (err: unknown) {
      setError((err as Error).message || "Proof generation failed.");
    } finally {
      setIsProving(false);
      setCurrentStep(-1);
    }
  };

  const handleDownloadProof = () => {
    if (!proofData) return;
    
    // 1. Package your existing variables into a clean object
    const exportData = {
        proof: proofData.proof,
        publicInputs: proofData.publicInputs
    };

    // 2. Convert it to a beautifully formatted JSON string (the '2' adds indents)
    const jsonString = JSON.stringify(exportData, null, 2);

    // 3. Create a temporary Blob (a file object in the browser's memory)
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // 4. Create an invisible anchor tag to trigger the browser's native download
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zk_identity_proof.json'; // The exact filename you requested
    
    // 5. Append, click, and destroy
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clears the memory
  };

  if (!isMounted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text)" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!citizen) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
        <div className="grid-bg" />
        <div style={{ position: "relative", zIndex: 1, background: "var(--bg2)", border: "1.5px solid var(--border)", borderRadius: 24, padding: 32, maxWidth: 360, width: "100%", textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ width: 48, height: 48, background: "rgba(255,255,255,.05)", border: "1.5px solid var(--border)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
            <svg width="24" height="24" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-.02em" }}>No Active Identity</h2>
            <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 6, lineHeight: 1.6 }}>You need to log in first to generate a proof.</p>
          </div>
          <Link href="/wallet" className="btn-kk btn-orange" style={{ width: "100%" }}>Go to Wallet</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div className="grid-bg" />
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", maxWidth: 860, margin: "0 auto", width: "100%", padding: "0 20px", overflow: "hidden" }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 0", borderBottom: "1.5px solid var(--border)" }}>
          <Link href="/wallet" style={{
            width: 36, height: 36, borderRadius: 11,
            background: "var(--bg2)", border: "1.5px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text2)", flexShrink: 0, textDecoration: "none",
          }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: "-.02em" }}>Identity Prover</h1>
          </div>
        </header>

        {/* Two-col on desktop */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "20px 0 32px", flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as any }} id="prove-cols">

          {/* Identity card */}
          <div className="kk-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span className="kk-label">Active Identity</span>
              <span className="badge-kk badge-green">
                <div style={{ width: 5, height: 5, borderRadius: "50%" }} className="dot-green anim-pulse" />
                Loaded
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <span className="kk-label" style={{ fontSize: 9, display: "block", marginBottom: 4 }}>Public Name</span>
                <code style={{ display: "block", background: "rgba(255,255,255,.03)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {citizen.firstName && citizen.lastName
                    ? `${citizen.firstName} ${citizen.lastName}`
                    : citizen.publicName || citizen.public_name || "—"}
                </code>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} id="prove-right">

            {/* Pipeline */}
            <div className="kk-card" style={{ padding: 20 }}>
              <span className="kk-label" style={{ display: "block", marginBottom: 14 }}>Proof Pipeline</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {STEPS.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className={`step-dot ${currentStep > i ? "step-done" : currentStep === i ? "step-active" : "step-idle"}`}>
                      {currentStep > i
                        ? <svg width="13" height="13" fill="none" stroke="#4ade80" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : currentStep === i
                        ? <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--orange)" }} className="anim-pulse" />
                        : <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)" }}>{i + 1}</span>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: 13, fontWeight: currentStep === i ? 700 : 500,
                        color: currentStep === i ? "var(--text)" : currentStep > i ? "var(--text3)" : "rgba(238,240,248,.22)",
                        transition: "all .3s",
                        textDecoration: currentStep > i ? "line-through" : "none",
                      }}>{s.label}</p>
                      {currentStep === i && <p style={{ fontSize: 11, color: "var(--orange)", marginTop: 2 }}>{s.sub}</p>}
                    </div>
                    {currentStep === i && (
                      <div className="anim-spin" style={{ width: 16, height: 16, border: "2px solid rgba(249,115,22,.2)", borderTopColor: "var(--orange)", borderRadius: "50%", flexShrink: 0 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Info note */}
            <div style={{ display: "flex", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,.02)", border: "1.5px solid var(--border)", borderRadius: 12 }}>
              <svg style={{ flexShrink: 0, marginTop: 1, opacity: .3 }} width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
              <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.65 }}>Proof runs entirely in-browser — no private data leaves your device.</p>
            </div>

            {/* Prove button */}
            <button onClick={handleProve} disabled={isProving}
              className={`btn-kk ${isProving ? "btn-ghost" : "btn-cyan"}`}
              style={{ width: "100%", fontSize: 14, padding: 16 }}>
              {isProving ? (
                <>
                  <div className="anim-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "rgba(255,255,255,.6)", borderRadius: "50%", flexShrink: 0 }} />
                  {currentStep >= 0 ? STEPS[currentStep].label.split(" ").slice(0, 3).join(" ") + "…" : "Working…"}
                </>
              ) : (
                <>
                  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  Generate ZK Proof
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div style={{ background: "rgba(239,68,68,.06)", border: "1.5px solid rgba(239,68,68,.2)", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <svg style={{ flexShrink: 0 }} width="15" height="15" fill="#f87171" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 13h-2v-2h2v2zm0-4h-2V7h2v4z" /></svg>
                <p style={{ fontSize: 12, color: "#f87171", lineHeight: 1.6 }}>{error}</p>
              </div>
            )}

            {/* Proof result */}
            {proofData && (
              <div style={{ background: "rgba(34,197,94,.04)", border: "1.5px solid rgba(34,197,94,.2)", borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 14 }} className="anim-pop">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(34,197,94,.12)", border: "1.5px solid rgba(34,197,94,.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="13" height="13" fill="none" stroke="#4ade80" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", letterSpacing: ".07em", textTransform: "uppercase" }}>Proof Generated Successfully</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <span className="kk-label" style={{ fontSize: 9, display: "block", marginBottom: 5 }}>Public Inputs</span>
                    <p className="text-xl text-emerald-400 font-bold">
                        {proofData.publicInputs?.[0] ? decodeHexName(proofData.publicInputs[0]) : "—"}
                    </p>
                  </div>
                  <details className="mt-4 border border-gray-700 rounded-md p-2 text-sm text-gray-500 cursor-pointer">
                      <summary className="font-semibold outline-none">View Raw Cryptographic Proof (Advanced)</summary>
                      <div className="mt-2 p-2 bg-black rounded break-all h-32 overflow-y-auto">
                          {proofData.proof}
                      </div>
                  </details>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: .28 }}>
                  <svg width="11" height="11" fill="white" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
                  <span style={{ fontSize: 9, fontWeight: 800, color: "white", letterSpacing: ".25em", textTransform: "uppercase" }}>Verified by ZK Circuit · Kakuho</span>
                </div>

                <button 
                    onClick={handleDownloadProof} 
                    className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded shadow-md transition-all"
                    style={{ border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                    💾 Download Proof (JSON)
                </button>

                <button 
                    onClick={handleSendToVerifier} 
                    disabled={isSending}
                    className="mt-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white font-semibold rounded shadow-md transition-all"
                    style={{ border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
                >
                    {isSending ? (
                      <>
                        <div className="anim-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "rgba(255,255,255,.6)", borderRadius: "50%" }} />
                        Transmitting to Verifier...
                      </>
                    ) : (
                      <>🚀 Send Proof to Verifier</>
                    )}
                </button>

                {sendResult && (
                  <div style={{
                    marginTop: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    fontSize: 12,
                    lineHeight: 1.5,
                    background: sendResult.success ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
                    border: `1.5px solid ${sendResult.success ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}`,
                    color: sendResult.success ? "#4ade80" : "#f87171"
                  }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span>{sendResult.success ? "✅" : "❌"}</span>
                      <strong>{sendResult.message}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media(min-width:768px){
          #prove-cols { flex-direction:row !important; gap:24px !important; align-items:flex-start !important; }
          #prove-cols > *:first-child { flex:1.3; }
          #prove-right { flex:1; }
        }
      `}</style>
    </div>
  );
}
