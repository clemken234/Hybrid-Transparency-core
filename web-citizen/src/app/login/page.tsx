"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsQR from "jsqr";
import { decryptSecret, encryptSecret } from "@/utils/crypto";
import { mnemonicToSecret, validateMnemonic } from "@/utils/mnemonic";
import { createFinalMerkleLeaf, stringToFieldHex } from "@/lib/commitment";

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

export default function LoginPage() {
  const [mode, setMode] = useState<"unlock" | "restore">("unlock");

  // unlock state
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // restore state
  const [phrase, setPhrase] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [restoreConfirm, setRestoreConfirm] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const qrFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError(null);
    if (restorePassword.length < 8) { setRestoreError("Password must be at least 8 characters."); return; }
    if (restorePassword !== restoreConfirm) { setRestoreError("Passwords do not match."); return; }
    if (!validateMnemonic(phrase)) { setRestoreError("Invalid recovery phrase. Check all 24 words."); return; }
    setRestoreLoading(true);
    try {
      const secret = mnemonicToSecret(phrase);

      const existing = localStorage.getItem("citizen_license");
      const prev = existing ? JSON.parse(existing) : null;
      let leafHash = prev?.leafHash || null;
      let publicNameHex = prev?.public_name || null;
      let privateLicenseData = prev?.private_license_data || null;

      if (prev?.subject && !leafHash) {
        const fullName = `${prev.subject.firstName} ${prev.subject.lastName}`;
        publicNameHex = stringToFieldHex(fullName);
        privateLicenseData = stringToFieldHex(prev.subject.licenseID);
        leafHash = await createFinalMerkleLeaf(secret, privateLicenseData, publicNameHex);
      }

      const encryptedSecret = await encryptSecret(secret, restorePassword);
      localStorage.setItem("citizen_license", JSON.stringify({
        ...(prev || {}),
        encrypted_secret: encryptedSecret,
        leafHash,
        public_name: publicNameHex,
        private_license_data: privateLicenseData,
      }));

      sessionStorage.setItem("unlocked_secret", secret);
      router.push("/wallet");
    } catch (err: unknown) {
      setRestoreError((err as Error).message || "Restore failed.");
    }
    setRestoreLoading(false);
  };

  const handleQRFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        canvas.width = img.width; canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) handleQRImport(code.data);
        else setRestoreError("No QR code found in image.");
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleQRImport = (qrData: string) => {
    try {
      const prefix = "kakuho-wallet:";
      if (!qrData.startsWith(prefix)) { setRestoreError("Invalid QR — not a Kakuho wallet export."); return; }
      const blob = JSON.parse(atob(qrData.slice(prefix.length)));
      if (!blob.encrypted_secret) { setRestoreError("QR missing encrypted vault data."); return; }
      localStorage.setItem("citizen_license", JSON.stringify(blob));
      setMode("unlock");
      setError("Wallet imported. Enter your password to unlock.");
    } catch {
      setRestoreError("Failed to read QR data. Try again.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const stored = localStorage.getItem("citizen_license");
      if (!stored) {
        setError("No wallet found on this device. Please register first.");
        setLoading(false);
        return;
      }

      const record = JSON.parse(stored);

      if (!record.encrypted_secret) {
        setError("Wallet data is missing or corrupted. Please re-register.");
        setLoading(false);
        return;
      }

      const secret = await decryptSecret(record.encrypted_secret, password);
      sessionStorage.setItem("unlocked_secret", secret);
      router.push("/wallet");
    } catch {
      setError("Incorrect password. Try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <div className="grid-bg" />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 28 }} className="anim-fade-up">

        {/* Back */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text3)", fontSize: 12, fontWeight: 600, textDecoration: "none", letterSpacing: ".04em" }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </Link>

        {/* Header */}
        <div>
          <KakuhoLogo />
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-.025em", marginTop: 20 }}>
            {mode === "unlock" ? <>Unlock <span style={{ color: "var(--orange)" }}>Wallet.</span></> : <>Restore <span style={{ color: "var(--orange)" }}>Wallet.</span></>}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 8, lineHeight: 1.6 }}>
            {mode === "unlock" ? "Enter your password to access your ZK-secured credential." : "Enter your 24-word recovery phrase to restore on this device."}
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", background: "var(--bg2)", border: "1.5px solid var(--border)", borderRadius: 12, padding: 4, gap: 4 }}>
          {(["unlock", "restore"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null); setRestoreError(null); }}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: mode === m ? "var(--orange)" : "transparent",
                color: mode === m ? "white" : "var(--text3)",
                transition: "all .18s", letterSpacing: ".04em",
              }}>
              {m === "unlock" ? "Unlock" : "Restore"}
            </button>
          ))}
        </div>

        {/* Unlock form */}
        {mode === "unlock" && (
          <div className="kk-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label className="kk-label">Wallet Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoFocus
                    className="kk-input"
                    style={{ paddingLeft: 44, paddingRight: 44 }}
                  />
                  <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: .3 }} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 0 }}>
                    {showPassword ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: "rgba(239,68,68,.07)", border: "1.5px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#f87171", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 13h-2v-2h2v2zm0-4h-2V7h2v4z" /></svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-kk btn-orange" style={{ width: "100%", marginTop: 4 }}>
                {loading ? (
                  <>
                    <span className="anim-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.25)", borderTopColor: "white", borderRadius: "50%", flexShrink: 0 }} />
                    Unlocking…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    Unlock Wallet
                  </>
                )}
              </button>
            </form>

            <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>
                No wallet?{" "}
                <Link href="/register" style={{ color: "var(--orange)", fontWeight: 700, fontSize: 12 }}>Register →</Link>
              </span>
            </div>
          </div>
        )}

        {/* Restore form */}
        {mode === "restore" && (
          <div className="kk-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            <form onSubmit={handleRestore} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label className="kk-label">24-Word Recovery Phrase</label>
                <textarea
                  value={phrase}
                  onChange={e => setPhrase(e.target.value)}
                  placeholder="word1 word2 word3 … word24"
                  rows={4}
                  className="kk-input"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12, resize: "none", lineHeight: 1.7 }}
                />
                {phrase.trim().length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: validateMnemonic(phrase) ? "var(--green)" : "rgba(239,68,68,.7)", letterSpacing: ".05em" }}>
                    {validateMnemonic(phrase) ? "✓ Valid phrase" : `${phrase.trim().split(/\s+/).length}/24 words`}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label className="kk-label">New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showRestorePassword ? "text" : "password"} value={restorePassword} onChange={e => setRestorePassword(e.target.value)}
                    placeholder="Set a new password" required minLength={8} className="kk-input" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowRestorePassword(!showRestorePassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 0 }}>
                    {showRestorePassword ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label className="kk-label">Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showRestoreConfirm ? "text" : "password"} value={restoreConfirm} onChange={e => setRestoreConfirm(e.target.value)}
                    placeholder="Repeat password" required className="kk-input" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowRestoreConfirm(!showRestoreConfirm)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 0 }}>
                    {showRestoreConfirm ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* QR scan import */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700, letterSpacing: ".08em" }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              <button type="button" onClick={() => qrFileRef.current?.click()} className="btn-kk btn-ghost" style={{ width: "100%", fontSize: 12 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h5v5H3zM3 16h5v5H3zM16 3h5v5h-5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 16h2v2h-2zm0 3h2v2h-2zm3-3h2v2h-2zm0 3h2v2h-2z" /></svg>
                Import from Wallet QR
              </button>
              <input ref={qrFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleQRFile} />

              {restoreError && (
                <div style={{ background: "rgba(239,68,68,.07)", border: "1.5px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#f87171", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 13h-2v-2h2v2zm0-4h-2V7h2v4z" /></svg>
                  {restoreError}
                </div>
              )}

              <button type="submit" disabled={restoreLoading} className="btn-kk btn-orange" style={{ width: "100%", marginTop: 4 }}>
                {restoreLoading ? (
                  <>
                    <span className="anim-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.25)", borderTopColor: "white", borderRadius: "50%", flexShrink: 0 }} />
                    Restoring…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Restore Wallet
                  </>
                )}
              </button>
            </form>

            <div style={{ display: "flex", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,.02)", border: "1.5px solid var(--border)", borderRadius: 10 }}>
              <svg style={{ flexShrink: 0, opacity: .3, marginTop: 1 }} width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
              <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>Phrase restores your secret locally. A new password re-encrypts your vault on this device.</p>
            </div>
          </div>
        )}

        {/* Security note */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", background: "rgba(255,255,255,.02)", border: "1.5px solid var(--border)", borderRadius: 12 }}>
          <svg style={{ flexShrink: 0, opacity: .35, marginTop: 1 }} width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
          <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
            Password decrypts your local vault. Nothing is sent to any server.
          </p>
        </div>
      </div>
    </div>
  );
}
