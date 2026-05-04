"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { submitProofToChain } from "@/utils/chain";

const STEPS = [
  { label: "Connecting to MetaMask", sub: "Requesting wallet access…" },
  { label: "Preparing submission", sub: "Packaging proof for chain…" },
  { label: "Submitting proof on-chain", sub: "Broadcasting to Sepolia…" },
  { label: "Awaiting confirmation", sub: "Waiting for block inclusion…" },
];

export default function VerifierPage() {
  const [citizen, setCitizen] = useState<any>(null);
  const [proofData, setProofData] = useState<{ proof: string; publicInputs: string[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState<{ txHash: string; nullifier: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("citizen_license");
    if (raw) setCitizen(JSON.parse(raw));
    const proof = localStorage.getItem("pending_proof");
    if (proof) setProofData(JSON.parse(proof));
  }, []);

  const handleSubmit = async () => {
    if (!proofData) return;
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);

    try {
      setCurrentStep(1);
      setCurrentStep(2);
      const res = await submitProofToChain(proofData.proof, proofData.publicInputs);
      setCurrentStep(3);

      // Proof consumed — delete from localStorage
      localStorage.removeItem("pending_proof");
      setProofData(null);
      setResult(res);
    } catch (err: unknown) {
      setError((err as Error).message || "Submission failed.");
    } finally {
      setIsSubmitting(false);
      setCurrentStep(-1);
    }
  };

  /* ── No identity ── */
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
            <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 6, lineHeight: 1.6 }}>Log in first to submit a proof.</p>
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
          <Link href="/wallet" style={{ width: 36, height: 36, borderRadius: 11, background: "var(--bg2)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", flexShrink: 0, textDecoration: "none" }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: "-.02em" }}>Identity Verifier</h1>
          </div>
          <span className="badge-kk badge-green">
            <div style={{ width: 5, height: 5, borderRadius: "50%" }} className="dot-green anim-pulse" />
            On-Chain
          </span>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "20px 0 32px", flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as any }} id="verifier-cols">

          {/* Identity card */}
          <div className="kk-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span className="kk-label">Submitting As</span>
              <span className="badge-kk badge-green">
                <div style={{ width: 5, height: 5, borderRadius: "50%" }} className="dot-green anim-pulse" />
                Loaded
              </span>
            </div>
            <code style={{ display: "block", background: "rgba(255,255,255,.03)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {citizen.firstName && citizen.lastName
                ? `${citizen.firstName} ${citizen.lastName}`
                : citizen.publicName || citizen.public_name || "—"}
            </code>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} id="verifier-right">

            {/* Proof status */}
            <div className="kk-card" style={{ padding: 20 }}>
              <span className="kk-label" style={{ display: "block", marginBottom: 14 }}>Proof Status</span>
              {proofData ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(34,197,94,.1)", border: "1.5px solid rgba(34,197,94,.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" fill="none" stroke="#4ade80" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Proof ready</p>
                    <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Generated by ZK Prover — not yet submitted</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(239,68,68,.08)", border: "1.5px solid rgba(239,68,68,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" fill="#f87171" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 13h-2v-2h2v2zm0-4h-2V7h2v4z" /></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>No proof found</p>
                    <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Generate a ZK proof first from the Prover page</p>
                  </div>
                </div>
              )}
            </div>

            {/* Submission pipeline */}
            <div className="kk-card" style={{ padding: 20 }}>
              <span className="kk-label" style={{ display: "block", marginBottom: 14 }}>Submission Pipeline</span>
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
              <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.65 }}>
                A one-time nonce is generated per submission. Proof is deleted locally after chain confirms — cannot be reused.
              </p>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !proofData}
              className={`btn-kk ${isSubmitting ? "btn-ghost" : proofData ? "btn-cyan" : "btn-ghost"}`}
              style={{ width: "100%", fontSize: 14, padding: 16 }}
            >
              {isSubmitting ? (
                <>
                  <div className="anim-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "rgba(255,255,255,.6)", borderRadius: "50%", flexShrink: 0 }} />
                  {currentStep >= 0 ? STEPS[currentStep].label + "…" : "Working…"}
                </>
              ) : (
                <>
                  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  {proofData ? "Submit Proof to Chain" : "No Proof to Submit"}
                </>
              )}
            </button>

            {!proofData && !result && (
              <Link href="/prove" className="btn-kk btn-ghost" style={{ width: "100%", fontSize: 13, padding: 14, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Go to ZK Prover
              </Link>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: "rgba(239,68,68,.06)", border: "1.5px solid rgba(239,68,68,.2)", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <svg style={{ flexShrink: 0 }} width="15" height="15" fill="#f87171" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 13h-2v-2h2v2zm0-4h-2V7h2v4z" /></svg>
                <p style={{ fontSize: 12, color: "#f87171", lineHeight: 1.6 }}>{error}</p>
              </div>
            )}

            {/* Success */}
            {result && (
              <div style={{ background: "rgba(34,197,94,.04)", border: "1.5px solid rgba(34,197,94,.2)", borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 14 }} className="anim-pop">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(34,197,94,.12)", border: "1.5px solid rgba(34,197,94,.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="13" height="13" fill="none" stroke="#4ade80" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", letterSpacing: ".07em", textTransform: "uppercase" }}>Proof Verified On-Chain</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <span className="kk-label" style={{ fontSize: 9, display: "block", marginBottom: 5 }}>Transaction Hash</span>
                    <code style={{ display: "block", background: "rgba(0,0,0,.25)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 11, fontFamily: "var(--font-mono)", color: "oklch(0.72 0.18 200)", wordBreak: "break-all", lineHeight: 1.7 }}>{result.txHash}</code>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: .28 }}>
                  <svg width="11" height="11" fill="white" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
                  <span style={{ fontSize: 9, fontWeight: 800, color: "white", letterSpacing: ".25em", textTransform: "uppercase" }}>Verified by LTORegistry · Kakuho</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media(min-width:768px){
          #verifier-cols { flex-direction:row !important; gap:24px !important; align-items:flex-start !important; }
          #verifier-cols > *:first-child { flex:1.3; }
          #verifier-right { flex:1; }
        }
      `}</style>
    </div>
  );
}
