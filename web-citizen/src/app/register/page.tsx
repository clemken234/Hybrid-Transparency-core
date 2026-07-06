"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsQR from "jsqr";
import { Html5Qrcode } from "html5-qrcode";
// ✅ IMPORT THE NEW DYNAMIC HASHER AND REMOVED generateSecret
import { createFinalMerkleLeaf, stringToFieldHex, computePrivateLicenseData, clampToField } from "@/lib/commitment";
import mockCitizens, { type CitizenSubject } from "@/lib/mockData";
// ✅ IMPORT YOUR MOCK SECRETS TO MATCH THE CITIZEN INDEX
import mockSecrets from "@/lib/MockSecret"; 
import { Barretenberg } from '@aztec/bb.js';

type Step = "select" | "committing" | "done";

const KakuhoLogo = ({ size = 38 }: { size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * .3),
      background: "rgba(249,115,22,.12)", border: "1.5px solid rgba(249,115,22,.28)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 0 18px rgba(249,115,22,.12)",
    }}>
      <svg width={size * .55} height={size * .55} viewBox="0 0 24 24" fill="none">
        <path d="M12 4L5 7V11C5 15.42 8 19.54 12 21C16 19.54 19 15.42 19 11V7L12 4Z" fill="#F97316" opacity=".9" />
      </svg>
    </div>
    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".35em", color: "rgba(238,240,248,.35)", textTransform: "uppercase" }}>Kakuho</span>
  </div>
);

/* ── QR Scanner modal ── */
const QRScannerModal = ({ onScan, onError, onClose }: { onScan: (d: string) => void; onError: (m: string) => void; onClose: () => void }) => {
  const [isReady, setIsReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 300, height: 300 } },
      (decoded) => { onScan(decoded); html5QrCode.stop().then(() => onClose()); },
      () => {}
    ).then(() => setIsReady(true)).catch(err => { 
      console.warn("Camera access failed or denied. Showing fallback.", err);
    });

    return () => { if (html5QrCode.isScanning) html5QrCode.stop().catch(e => console.error(e)); };
  }, [onScan, onError, onClose]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code) {
          onScan(code.data);
          onClose();
        } else {
          onError("Could not detect a valid QR code in the image.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(13,15,20,.98)", zIndex: 250, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(24px)" }} className="anim-fade-in">
      <div style={{ width: "100%", maxWidth: 480, aspectRatio: "3/4", background: "black", borderRadius: 32, overflow: "hidden", position: "relative", border: "1.5px solid var(--border)" }}>
        <div id="reader" style={{ width: "100%", height: "100%" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 300, height: 300, border: "1px solid rgba(249,115,22,.3)", borderRadius: 24, position: "relative" }}>
            {(["tl", "tr", "bl", "br"] as const).map(c => (
              <div key={c} style={{
                position: "absolute", width: 24, height: 24,
                ...(c === "tl" ? { top: -1, left: -1, borderTop: "2px solid var(--orange)", borderLeft: "2px solid var(--orange)", borderTopLeftRadius: 12 } : {}),
                ...(c === "tr" ? { top: -1, right: -1, borderTop: "2px solid var(--orange)", borderRight: "2px solid var(--orange)", borderTopRightRadius: 12 } : {}),
                ...(c === "bl" ? { bottom: -1, left: -1, borderBottom: "2px solid var(--orange)", borderLeft: "2px solid var(--orange)", borderBottomLeftRadius: 12 } : {}),
                ...(c === "br" ? { bottom: -1, right: -1, borderBottom: "2px solid var(--orange)", borderRight: "2px solid var(--orange)", borderBottomRightRadius: 12 } : {}),
              }} />
            ))}
            {isReady && <div className="scan-line" style={{ position: "absolute", insetInline: 0, height: 2, background: "linear-gradient(to right,transparent,var(--orange),transparent)", boxShadow: "0 0 12px rgba(249,115,22,.8)" }} />}
          </div>
        </div>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", zIndex: 20 }}>✕</button>
      </div>
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.05)", border: "1.5px solid var(--border)", padding: "10px 20px", borderRadius: 99 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--orange)" }} className="anim-pulse" />
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text2)", letterSpacing: ".3em", textTransform: "uppercase" }}>Scanning Admin QR Code</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", display: "flex", alignItems: "center", gap: 8 }}>
          <span>Camera not working?</span>
          <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", color: "var(--orange)", textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}>Upload Image</button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
        </div>
      </div>
    </div>
  );
};

export default function RegisterPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ leafHash: string; subject: CitizenSubject } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text)" }}>
        <p>Loading...</p>
      </div>
    );
  }

  const handleScan = async (data: string) => {
    try {
      let licenseID = "";

      if (data.startsWith("kakuho-wallet:")) {
        // Handle full wallet backup payload
        try {
          const base64Data = data.replace("kakuho-wallet:", "");
          const decoded = decodeURIComponent(escape(atob(base64Data)));
          const parsed = JSON.parse(decoded);
          licenseID = parsed.subject?.licenseID;
        } catch (e) {
          throw new Error("Invalid wallet backup format.");
        }
      } else {
        // Handle Admin JSON {"licenseID":"N01-26-835232"}
        try {
          const parsed = JSON.parse(data);
          licenseID = parsed.licenseID;
        } catch (e) {
          throw new Error("Invalid QR code format. Please scan a valid Admin QR or Wallet Backup.");
        }
      }

      if (!licenseID) {
        throw new Error("No valid licenseID found in the QR code.");
      }

      // Find index in mockCitizens
      const idx = mockCitizens.findIndex(c => c.subject.licenseID === licenseID);
      if (idx === -1) {
        throw new Error("License ID not recognized by the registry.");
      }

      setShowScanner(false);
      handleRegister(idx);
    } catch (err: any) {
      setError(err.message || "Failed to read QR code.");
      setShowScanner(false);
    }
  };

  const handleRegister = async (idx: number) => {
    setError(null);
    setStep("committing");
    setProgress(0);

    // Declare outside so the finally block can access it!
    let bb: any = null; 

    try {
      const tick = setInterval(() => setProgress(p => Math.min(p + 5, 95)), 40);

      const citizenRecord = mockCitizens[idx];
      const subject = citizenRecord.subject;
      const ltoSignature = citizenRecord.ltoSignature; 
      const mockSecretObj = mockSecrets[idx] || mockSecrets[0];
      const secret = clampToField(mockSecretObj.secret);
      const fullName = `${subject.firstName} ${subject.lastName}`;

      // --- 2. BARRETENBERG HASHING ---
      bb = await Barretenberg.new({ threads: 1 });

      const privateData = await computePrivateLicenseData(bb, subject.licenseID, subject.firstName, subject.lastName, subject.dateOfBirth, subject.licenseType, subject.expirationDate, subject.restrictions, subject.conditions, subject.bloodType, subject.address, ltoSignature);
      const leafHash = await createFinalMerkleLeaf(bb, secret, privateData, fullName);

      // --- 4. LOCAL STORAGE SAVE ---
      localStorage.setItem("citizen_license", JSON.stringify({
        secret: secret,
        leafHash: leafHash,
        publicName: fullName, 
        public_name: stringToFieldHex(fullName), 
        private_license_data: privateData, 
        subject: subject,
        merkle_path: null,
        leaf_index: null,
        public_merkle_root: null,
      }));

      setResult({ leafHash, subject });
      clearInterval(tick);
      setProgress(100);
      setTimeout(() => setStep("done"), 300);
      
    } catch (err: unknown) {
      setError((err as Error).message || "Something went wrong.");
      setStep("select");
    } finally {
      // THIS SAVES YOUR LAPTOP FROM CRASHING
      if (bb) {
        await bb.destroy();
      }
    }
  };

  /* ── Committing screen ── */
  if (step === "committing") {
    const pct = progress;
    const circumference = 2 * Math.PI * 40;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 28, padding: 24, position: "relative" }}>
        <div className="grid-bg" />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }} className="anim-fade-up">
          <div style={{ position: "relative", width: 88, height: 88 }}>
            <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} viewBox="0 0 88 88" fill="none">
              <circle cx="44" cy="44" r="40" stroke="rgba(255,255,255,.06)" strokeWidth="4" />
              <circle cx="44" cy="44" r="40" stroke="var(--orange)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${pct * circumference / 100} ${circumference}`}
                style={{ transition: "stroke-dasharray .1s" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{pct}%</div>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", letterSpacing: ".04em", textTransform: "uppercase" }}>Generating your secret…</p>
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 6, lineHeight: 1.6 }}>Creating your identity commitment.<br />Never leaves this device.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
            {["Generating private secret", "Creating Merkle leaf hash", "Storing identity vault"].map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, opacity: pct > i * 33 ? 1 : .3, transition: "opacity .4s" }}>
                <div className={`step-dot ${pct > i * 33 + 30 ? "step-done" : pct > i * 33 ? "step-active" : "step-idle"}`}>
                  {pct > i * 33 + 30
                    ? <svg width="12" height="12" fill="none" stroke="#4ade80" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    : <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--orange)" }} className="anim-pulse" />
                  }
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Done screen ── */
  if (step === "done" && result) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
        <div className="grid-bg" />
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 20 }} className="anim-pop">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(34,197,94,.1)", border: "1.5px solid rgba(34,197,94,.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="24" height="24" fill="none" stroke="#4ade80" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-.02em" }}>Wallet Created!</h1>
              <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>
                Registered as <strong style={{ color: "var(--text)" }}>{result.subject.firstName} {result.subject.lastName}</strong>.
              </p>
            </div>
          </div>

          <button className="btn-kk btn-orange" style={{ width: "100%" }} onClick={() => router.push("/wallet")}>
            Open Wallet
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <div className="grid-bg" />
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 32px", maxWidth: 520, margin: "0 auto", width: "100%", gap: 0 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 28 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text3)", fontSize: 12, fontWeight: 600, textDecoration: "none", letterSpacing: ".04em" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" /></svg>
            Back
          </Link>
          <KakuhoLogo size={32} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, justifyContent: "center", alignItems: "center", textAlign: "center" }} className="anim-fade-up">
          <div style={{ width: 80, height: 80, borderRadius: 24, background: "rgba(255,255,255,.03)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
             <svg width="36" height="36" fill="none" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M4 7V4h3" />
                <path d="M17 4h3v3" />
                <path d="M20 17v3h-3" />
                <path d="M7 20H4v-3" />
                <rect x="7" y="7" width="10" height="10" rx="2" />
             </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-.02em", lineHeight: 1.15 }}>No Identity Found</h1>
            <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 8, lineHeight: 1.6, maxWidth: 300, margin: "8px auto 0" }}>Your secure wallet is empty. Scan the QR code issued by the LTO Admin to claim your identity.</p>
          </div>

          {error && <div style={{ background: "rgba(239,68,68,.07)", border: "1.5px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#f87171", fontWeight: 600, width: "100%", maxWidth: 320 }}>{error}</div>}

          <button className="btn-kk btn-orange" style={{ width: "100%", maxWidth: 320, padding: "14px 20px", fontSize: 14, marginTop: 20 }} onClick={() => setShowScanner(true)}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h5v5H3zM3 16h5v5H3zM16 3h5v5h-5z" /></svg>
            Scan License QR
          </button>
        </div>
      </div>
      {showScanner && <QRScannerModal onScan={handleScan} onError={setError} onClose={() => setShowScanner(false)} />}
    </div>
  );
}
