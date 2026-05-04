"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { fetchRoot, getContract, fetchAllLeaves, computeMerklePath } from "@/utils/chain";

/* ── Logo ── */
const KakuhoLogo = ({ size = 34 }: { size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * .3),
      background: "rgba(249,115,22,.12)", border: "1.5px solid rgba(249,115,22,.28)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width={size * .55} height={size * .55} viewBox="0 0 24 24" fill="none">
        <path d="M12 4L5 7V11C5 15.42 8 19.54 12 21C16 19.54 19 15.42 19 11V7L12 4Z" fill="#F97316" opacity=".9" />
      </svg>
    </div>
    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".35em", color: "rgba(238,240,248,.35)", textTransform: "uppercase" }}>Kakuho</span>
  </div>
);

/* ── Connections view ── */
const ConnectionsView = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 0 80px" }} className="anim-fade-up">
    <div>
      <span className="kk-label" style={{ display: "block", marginBottom: 4 }}>System Scope</span>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: "-.015em" }}>Institutional Partners</h2>
    </div>

    {/* Active partner */}
    <div style={{ background: "var(--bg2)", border: "1.5px solid oklch(0.72 0.18 200/.18)", borderRadius: 18, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--orange-lite)", border: "1.5px solid rgba(249,115,22,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="26" height="26" fill="var(--orange)" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, lineHeight: 1.4 }}>Land Transportation Office</p>
          <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 4, letterSpacing: ".08em", textTransform: "uppercase" }}>Identity Registry</p>
        </div>
        <span className="badge-kk badge-green">
          <div style={{ width: 7, height: 7, borderRadius: "50%" }} className="dot-green anim-pulse" />
          Live
        </span>
      </div>
    </div>

    <span className="kk-label">Coming Soon</span>
    {[{ l: "Financial Institute", s: "Banking Verification" }, { l: "University System", s: "Academic Credentials" }].map(it => (
      <div key={it.l} style={{ background: "rgba(255,255,255,.02)", border: "1.5px dashed var(--border)", borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 14, opacity: .4 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="22" height="22" fill="none" stroke="var(--text3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </div>
        <div>
          <p style={{ fontWeight: 700, color: "var(--text2)", fontSize: 14, fontStyle: "italic" }}>{it.l}</p>
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2, textTransform: "uppercase", letterSpacing: ".08em" }}>{it.s}</p>
        </div>
      </div>
    ))}
  </div>
);

/* ── QR Scanner modal ── */
const QRScannerModal = ({ onScan, onError, onClose }: { onScan: (d: string) => void; onError: (m: string) => void; onClose: () => void }) => {
  const [isReady, setIsReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
      (decoded) => { onScan(decoded); html5QrCode.stop().then(() => onClose()); },
      () => {}
    ).then(() => setIsReady(true)).catch(err => { 
      console.warn("Camera access failed or denied. Showing fallback.", err);
      // We don't automatically close so they can use the file fallback
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
      <div style={{ width: "100%", maxWidth: 360, aspectRatio: "1", background: "black", borderRadius: 32, overflow: "hidden", position: "relative", border: "1.5px solid var(--border)" }}>
        <div id="reader" style={{ width: "100%", height: "100%" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 224, height: 224, border: "1px solid rgba(249,115,22,.3)", borderRadius: 24, position: "relative" }}>
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
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text2)", letterSpacing: ".3em", textTransform: "uppercase" }}>Scanning Kakuho Hash</span>
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

/* ── Desktop sidebar ── */
const DesktopSidebar = ({ active, setActive, citizen, onLogout, hasUnread, onNotif, notifOpen, notifications, onCloseNotif }: any) => (
  <aside className="kk-sidebar" style={{ display: "none", position: "relative" }} id="kk-sidebar">
    <div style={{ padding: "20px 18px", borderBottom: "1.5px solid var(--border)" }}>
      <KakuhoLogo />
    </div>

    {citizen && (
      <div style={{ padding: "16px 16px", borderBottom: "1.5px solid var(--border)" }}>
        <div style={{ background: "rgba(249,115,22,.05)", border: "1.5px solid rgba(249,115,22,.12)", borderRadius: 14, padding: "12px 13px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: "0 0 14px rgba(249,115,22,.25)" }}>
              {(citizen.firstName?.[0] || "U")}{(citizen.lastName?.[0] || "N")}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{citizen.firstName} {citizen.lastName}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text3)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{citizen.licenseId || citizen.licenseID}</p>
            </div>
          </div>
        </div>
      </div>
    )}

    <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
      {[
        { id: "home", label: "Home", icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg> },
        { id: "connections", label: "Connections", icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg> },
        { id: "prove", label: "ZK Prover", icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
        { id: "verifier", label: "Verifier", icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg> },
        { id: "settings", label: "Settings", icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg> },
      ].map(n => (
        <button key={n.id} onClick={() => setActive(n.id)} className={`sidebar-item${active === n.id ? " active" : ""}`}>
          {n.icon}{n.label}
        </button>
      ))}
    </nav>

    <div style={{ padding: "10px 10px", borderTop: "1.5px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
      <button onClick={onNotif} style={{
        width: "100%", padding: "9px 12px", borderRadius: 12,
        background: notifOpen ? "var(--orange-lite)" : "rgba(255,255,255,.03)",
        border: `1.5px solid ${notifOpen ? "rgba(249,115,22,.25)" : "var(--border)"}`,
        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        color: notifOpen ? "var(--orange)" : "var(--text3)", transition: "all .18s", position: "relative",
        fontFamily: "var(--font-sans)",
      }}>
        <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Activity</span>
        {hasUnread && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", marginLeft: "auto", boxShadow: "0 0 6px var(--red)" }} />}
      </button>

      {notifOpen && (
        <div style={{
          position: "absolute", bottom: 112, left: 12, right: 12,
          background: "rgba(19,22,30,.95)", backdropFilter: "blur(24px)",
          border: "1.5px solid var(--border2)", borderRadius: 14, padding: 14,
          zIndex: 100, boxShadow: "0 -8px 32px rgba(0,0,0,.4)",
        }} className="anim-fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span className="kk-label">Activity Log</span>
            <button onClick={onCloseNotif} style={{ background: "none", border: "none", color: "var(--orange)", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: ".04em" }}>Close</button>
          </div>
          {notifications.map((n: any, i: number) => (
            <div key={n.id} style={{ borderBottom: i < notifications.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: i < notifications.length - 1 ? 8 : 0, marginBottom: i < notifications.length - 1 ? 8 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{n.title}</span>
                <span style={{ fontSize: 10, color: "var(--text3)" }}>{n.time}</span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>{n.desc}</p>
            </div>
          ))}
        </div>
      )}

      <button onClick={onLogout} className="btn-kk btn-red" style={{ width: "100%", fontSize: 11, padding: 10, letterSpacing: ".06em" }}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        Logout Session
      </button>
    </div>
  </aside>
);

/* ── Credential card ── */
const CredentialCard = ({ data, onAlert }: { data: any; onAlert?: (type: "success" | "error", msg: string) => void }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardGradient = data.licenseType === "NON-PROFESSIONAL"
    ? "linear-gradient(135deg,#1a237e 0%,#283593 45%,#1565c0 100%)"
    : "linear-gradient(135deg,#fb923c 0%,#f97316 50%,#c2410c 100%)";

  return (
    <div className="cred-perspective" style={{ width: "100%", maxWidth: "min(400px,100%)", height: 190, position: "relative", cursor: "pointer" }} onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`cred-inner${isFlipped ? " flipped" : ""}`}>
        {/* Front */}
        <div className="cred-face" style={{ background: cardGradient, boxShadow: "0 16px 48px rgba(0,0,0,.5),0 0 32px rgba(21,101,192,.2)", border: "1px solid rgba(255,255,255,.14)" }}>
          <div className="holo" />
          <div style={{ position: "absolute", right: -24, top: -24, width: 130, height: 130, borderRadius: "50%", border: "1px solid rgba(255,255,255,.06)" }} />
          <div style={{ position: "absolute", right: 20, bottom: -10, width: 80, height: 80, borderRadius: "50%", border: "1px solid rgba(255,255,255,.04)" }} />
          <div style={{ padding: "14px 16px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 7, fontWeight: 800, color: "rgba(255,255,255,.4)", letterSpacing: ".15em", textTransform: "uppercase", lineHeight: 1.3 }}>Republic of the Philippines</p>
                <p style={{ fontSize: 9.5, fontWeight: 800, color: "white", letterSpacing: ".04em", textTransform: "uppercase", marginTop: 3, lineHeight: 1.2 }}>Land Transportation Office</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, marginLeft: 8 }}>
                <span className="badge-kk badge-green" style={{ fontSize: 7, padding: "3px 7px", whiteSpace: "nowrap" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%" }} className="dot-green anim-pulse" />
                  Verified
                </span>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="13" height="13" fill="white" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" opacity=".9" /></svg>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,.5)", letterSpacing: ".2em", textTransform: "uppercase", lineHeight: 1 }}>{data.licenseType || "NON-PROFESSIONAL"}</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "white", letterSpacing: "-.01em", lineHeight: 1.1 }}>
                {data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : (data.publicName || "Verified Citizen")}
              </h3>
              <div style={{ display: "flex", gap: 16, marginTop: 2 }}>
                <div><p style={{ fontSize: 6, fontWeight: 800, color: "rgba(255,255,255,.35)", letterSpacing: ".12em", textTransform: "uppercase" }}>Control ID</p><p style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,.85)", fontWeight: 500 }}>{data.licenseId}</p></div>
                <div><p style={{ fontSize: 6, fontWeight: 800, color: "rgba(255,255,255,.35)", letterSpacing: ".12em", textTransform: "uppercase" }}>Valid Through</p><p style={{ fontSize: 9, color: "rgba(255,255,255,.85)", fontWeight: 500 }}>{data.expirationDate}</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="cred-face cred-back" style={{ background: "#08091a", border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 16px 48px rgba(0,0,0,.6)" }}>
          <div style={{ padding: "12px 14px", height: "100%", display: "flex", flexDirection: "column", gap: 7, position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.05)", paddingBottom: 6 }}>
              <span className="kk-label" style={{ fontSize: 8 }}>Credential Data</span>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 10px", flex: 1 }}>
              {([["Date of Birth", data.dateOfBirth], ["Blood Type", data.bloodType], ["Address", data.address], ["Restrictions", data.restrictions], ["Conditions", data.conditions]] as [string, string][]).map(([l, v]) => (
                <div key={l} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 7, fontWeight: 800, color: "var(--text3)", letterSpacing: ".1em", textTransform: "uppercase" }}>{l}</span>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text2)", fontWeight: 500 }}>{v || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main wallet page ── */
export default function WalletPage() {
  const [citizen, setCitizen] = useState<any>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [tab, setTab] = useState("home");
  const [search, setSearch] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showQRShare, setShowQRShare] = useState(false);
  const [chainRoot, setChainRoot] = useState<string | null>(null);
  const [rootSyncing, setRootSyncing] = useState(false);
  const [merklePath, setMerklePath] = useState<string[] | null>(null);
  const [merkleLeafIndex, setMerkleLeafIndex] = useState<number | null>(null);
  const [merklePathRoot, setMerklePathRoot] = useState<string | null>(null);
  const [merklePathSyncing, setMerklePathSyncing] = useState(false);
  const [proofHistory, setProofHistory] = useState<{ ts: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const data = localStorage.getItem("citizen_license");
    if (!data) { router.push("/register"); return; }
    let user;
    try {
      user = JSON.parse(data);
    } catch (e) {
      localStorage.removeItem("citizen_license");
      router.push("/register");
      return;
    }
    const smartUser = {
      firstName: user.subject?.firstName || user.firstName || (user.publicName?.split(" ")[0] || "Verified"),
      lastName: user.subject?.lastName || user.lastName || (user.publicName?.split(" ")[1] || "Citizen"),
      licenseId: user.subject?.licenseID || user.licenseId || `N01-26-${Math.floor(100000 + Math.random() * 900000)}`,
      dateOfBirth: user.subject?.dateOfBirth || user.dateOfBirth || "N/A",
      bloodType: user.subject?.bloodType || user.bloodType || "O+",
      address: user.subject?.address || user.address || "N/A",
      restrictions: user.subject?.restrictions || user.restrictions || "None",
      conditions: user.subject?.conditions || user.conditions || "None",
      licenseType: user.subject?.licenseType || user.licenseType || "Non-Professional",
      expirationDate: user.subject?.expirationDate || user.expirationDate || "2036-04-21",
      ...user,
    };
    setCitizen(smartUser);
    setWallets([smartUser]);
    const history = JSON.parse(localStorage.getItem("proof_history") || "[]");
    setProofHistory(history);
    if (user.merkle_path) {
      setMerklePath(user.merkle_path);
      setMerkleLeafIndex(user.leaf_index ?? null);
      setMerklePathRoot(user.public_merkle_root ?? null);
    }
    setRootSyncing(true);
    fetchRoot().then(root => setChainRoot(root || null)).finally(() => setRootSyncing(false));
  }, [router]);

  useEffect(() => {
    if (!citizen?.leafHash) return;
    let active = true;

    const fetchHistory = async () => {
      try {
        const contract = await getContract();
        // Fetch historical LicenseIssued events for this citizen
        const filter = contract.filters.LicenseIssued(null, BigInt(citizen.leafHash));
        const events = await contract.queryFilter(filter, 0); // Query from block 0

        const history = events.map(ev => {
          const { timestamp } = (ev as any).args;
          return {
            id: `hist-${ev.transactionHash}`,
            title: "Identity Anchored",
            desc: "Your credential was secured on-chain.",
            time: new Date(Number(timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        });

        if (active) {
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newHistory = history.filter(n => !existingIds.has(n.id));
            return [...newHistory, ...prev];
          });
        }
      } catch (e) {
        console.error("Failed to fetch notification history:", e);
      }
    };

    const listenToAnchors = async () => {
      try {
        const contract = await getContract();

        // Listener for new issues
        contract.on("LicenseIssued", (admin, leafCommitment, timestamp) => {
          if (!active) return;
          const hexCommitment = "0x" + BigInt(leafCommitment).toString(16).padStart(64, "0");
          if (hexCommitment === citizen.leafHash) {
            setNotifications(prev => [{
              id: Date.now(),
              title: "Identity Anchored",
              desc: "Your credential was just secured on-chain.",
              time: "Just now"
            }, ...prev]);
            setHasUnread(true);
            fetchRoot().then(root => { if (active) setChainRoot(root || null); });
          }
        });

        // Listener for proof verifications (if prover matches user's address or we just want to show general activity)
        contract.on("ProofVerified", (prover, nullifier, timestamp) => {
          if (!active) return;
          // We could filter by prover address here if we had it, 
          // but for now let's show all "Verification" activity to feel "live"
          setNotifications(prev => [{
            id: `v-${nullifier}`,
            title: "Identity Verified",
            desc: "A ZK proof was successfully verified.",
            time: "Just now"
          }, ...prev]);
          setHasUnread(true);
        });

      } catch (e) { console.error("Failed to set up event listener", e); }
    };

    fetchHistory();
    listenToAnchors();

    return () => {
      active = false;
      getContract().then(c => {
        c.removeAllListeners("LicenseIssued");
        c.removeAllListeners("ProofVerified");
      }).catch(() => { });
    };
  }, [citizen?.leafHash]);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleNav = (id: string) => {
    if (id === "prove") { router.push("/prove"); return; }
    if (id === "verifier") { router.push("/verifier"); return; }
    setTab(id);
  };

  const handleOpenNotifications = () => { setShowNotifications(!showNotifications); if (!showNotifications) setHasUnread(false); };

  const handleImportAttempt = async (raw: string) => {
    if (!raw) return;
    setIsImporting(true);
    try {
      if (raw.trim().startsWith("kakuho-wallet:")) {
        const b64 = raw.trim().slice("kakuho-wallet:".length);
        const json = decodeURIComponent(escape(atob(b64)));
        const parsed = JSON.parse(json);
        if (!parsed.secret || !parsed.leafHash) throw new Error("Invalid wallet export data.");
        localStorage.setItem("citizen_license", JSON.stringify(parsed));
        showAlert("success", "Wallet imported!");
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      showAlert("error", "Hash lookup requires registry. Use wallet export QR instead.");
    } catch (e: any) { showAlert("error", e.message || "Import failed."); }
    setIsImporting(false);
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d"); if (!ctx) { setIsImporting(false); return; }
        canvas.width = img.width; canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code) { handleImportAttempt(code.data); }
        else { showAlert("error", "Import Failed!"); setIsImporting(false); }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSyncMerklePath = async () => {
    if (!citizen?.leafHash) { showAlert("error", "No leaf hash found. Re-register first."); return; }
    setMerklePathSyncing(true);
    try {
      const leaves = await fetchAllLeaves();
      const result = computeMerklePath(citizen.leafHash, leaves);
      if (!result) { showAlert("error", "Leaf not found on chain. Not issued yet?"); setMerklePathSyncing(false); return; }
      setMerklePath(result.path);
      setMerkleLeafIndex(result.leafIndex);
      setMerklePathRoot(result.root);
      const stored = localStorage.getItem("citizen_license");
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem("citizen_license", JSON.stringify({
          ...parsed,
          merkle_path: result.path,
          leaf_index: result.leafIndex,
          public_merkle_root: result.root,
        }));
      }
      showAlert("success", "Merkle path synced from chain!");
    } catch {
      showAlert("error", "Failed to sync Merkle path.");
    }
    setMerklePathSyncing(false);
  };

  const handleLogout = () => { localStorage.removeItem("citizen_license"); window.location.href = "/"; };

  if (!citizen) return null;

  const displayName = [citizen.firstName, citizen.lastName].filter(Boolean).join(" ") || citizen.publicName || "Verified Citizen";
  const initials = (displayName.match(/\b\w/g) || ["V", "C"]).slice(0, 2).join("").toUpperCase();

  const MobileNotifPanel = () => (
    <div style={{ position: "fixed", top: 64, right: 12, width: 280, background: "rgba(19,22,30,.95)", backdropFilter: "blur(24px)", border: "1.5px solid var(--border2)", borderRadius: 16, padding: 16, zIndex: 200, boxShadow: "0 16px 48px rgba(0,0,0,.5)" }} className="anim-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span className="kk-label">Activity Log</span>
        <button onClick={() => setShowNotifications(false)} style={{ background: "none", border: "none", color: "var(--orange)", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: ".04em" }}>Close</button>
      </div>
      {notifications.map((n, i) => (
        <div key={n.id} style={{ borderBottom: i < notifications.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: i < notifications.length - 1 ? 10 : 0, marginBottom: i < notifications.length - 1 ? 10 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{n.title}</span><span style={{ fontSize: 10, color: "var(--text3)" }}>{n.time}</span></div>
          <p style={{ fontSize: 11, color: "var(--text2)", marginTop: 3 }}>{n.desc}</p>
        </div>
      ))}
    </div>
  );

  const QRShareModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(13,15,20,.96)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(24px)" }} className="anim-fade-in">
      <div style={{ background: "var(--bg2)", border: "1.5px solid var(--border2)", borderRadius: 24, padding: 28, maxWidth: 360, width: "100%", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }} className="anim-pop">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div><h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: "-.01em" }}>Share Identity</h3><p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Scan to verify your identity</p></div>
          <button onClick={() => setShowQRShare(false)} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1.5px solid var(--border)", color: "var(--text3)", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ background: "white", padding: 16, borderRadius: 16 }}><QRCodeSVG value={citizen.leafHash || "no-hash"} size={200} bgColor="#ffffff" fgColor="#0d0f14" level="M" /></div>
      </div>
    </div>
  );

  const WalletExportQR = () => {
    const [show, setShow] = useState(false);
    const exportPayload = `kakuho-wallet:${btoa(unescape(encodeURIComponent(JSON.stringify({ secret: citizen.secret, leafHash: citizen.leafHash, publicName: citizen.publicName, public_name: citizen.public_name, private_license_data: citizen.private_license_data, subject: citizen.subject }))))}`;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!show ? <button onClick={() => setShow(true)} className="btn-kk btn-ghost" style={{ width: "100%", fontSize: 12 }}>Show Export QR</button> :
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ background: "white", padding: 14, borderRadius: 14 }}><QRCodeSVG value={exportPayload} size={260} bgColor="#ffffff" fgColor="#0d0f14" level="M" /></div>
            <button onClick={() => setShow(false)} className="btn-kk btn-ghost" style={{ width: "100%", fontSize: 11 }}>Hide</button>
          </div>
        }
      </div>
    );
  };

  const SettingsPanel = () => {
    const [showPath, setShowPath] = useState(false);
    const pathMatchesChain = merklePathRoot && chainRoot && merklePathRoot === chainRoot;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 0 80px" }} className="anim-fade-up">
        <div><span className="kk-label">Account</span><h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Settings</h2></div>
        <div className="kk-card" style={{ padding: 18, display: "flex", gap: 12 }}>
          <button onClick={() => setShowQRShare(true)} className="btn-kk btn-ghost" style={{ flex: 1, fontSize: 12 }}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg> Share</button>
          <button onClick={() => setShowScanner(true)} className="btn-kk btn-ghost" style={{ flex: 1, fontSize: 12 }}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3h5v5H3zM3 16h5v5H3zM16 3h5v5h-5z" /></svg> Scan</button>
        </div>
        <div className="kk-card" style={{ padding: 18 }}>
          <span className="kk-label">Identity</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "var(--text3)" }}>Name</span><span style={{ fontSize: 12, fontWeight: 700 }}>{citizen.firstName} {citizen.lastName}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "var(--text3)" }}>Chain Root</span><span style={{ fontSize: 10, color: "var(--cyan)", fontFamily: "var(--font-mono)", wordBreak: "break-all", textAlign: "right", maxWidth: "60%" }}>{chainRoot || "Syncing…"}</span></div>
          </div>
        </div>

        {/* Merkle Path */}
        <div className="kk-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="kk-label">Merkle Inclusion Path</span>
              {merklePath && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: pathMatchesChain ? "var(--green)" : "rgba(239,68,68,.7)", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: pathMatchesChain ? "var(--green)" : "rgba(239,68,68,.7)", fontWeight: 700 }}>
                    {pathMatchesChain ? "Matches admin root" : "Root mismatch — resync needed"}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleSyncMerklePath}
              disabled={merklePathSyncing}
              className="btn-kk btn-ghost"
              style={{ fontSize: 11, padding: "6px 12px", flexShrink: 0 }}
            >
              {merklePathSyncing ? (
                <><span className="anim-spin" style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "white", borderRadius: "50%" }} /> Syncing…</>
              ) : (
                <><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Sync</>
              )}
            </button>
          </div>

          {merklePath ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <div><span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Leaf Index</span><p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text2)", marginTop: 2 }}>{merkleLeafIndex ?? "—"}</p></div>
                <div style={{ flex: 1, minWidth: 0 }}><span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Path Root</span><p style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--cyan)", marginTop: 2, wordBreak: "break-all" }}>{merklePathRoot}</p></div>
              </div>
              <button onClick={() => setShowPath(p => !p)} style={{ background: "none", border: "none", color: "var(--orange)", fontSize: 11, fontWeight: 700, cursor: "pointer", textAlign: "left", padding: 0, letterSpacing: ".04em" }}>
                {showPath ? "Hide path nodes ↑" : `Show ${merklePath.length} path nodes ↓`}
              </button>
              {showPath && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto", background: "rgba(0,0,0,.2)", borderRadius: 10, padding: "10px 12px" }}>
                  {merklePath.map((node, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-mono)", width: 18, flexShrink: 0 }}>[{i}]</span>
                      <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text2)", wordBreak: "break-all" }}>{node}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0" }}>
              <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>No path yet. Click Sync to fetch from chain.</span>
            </div>
          )}
        </div>

        <div className="kk-card" style={{ padding: 18 }}><span className="kk-label">Data</span><WalletExportQR /></div>
        <button onClick={handleLogout} className="btn-kk btn-red" style={{ width: "100%" }}>Logout Session</button>
      </div>
    );
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <div className="grid-bg" />
      <DesktopSidebar active={tab} setActive={handleNav} citizen={citizen} onLogout={handleLogout} hasUnread={hasUnread} onNotif={handleOpenNotifications} notifOpen={showNotifications} notifications={notifications} onCloseNotif={() => setShowNotifications(false)} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, height: "100vh", overflow: "hidden" }}>
        <header className="mobile-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "rgba(13,15,20,.9)", backdropFilter: "blur(20px)", borderBottom: "1.5px solid var(--border)", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>{initials}</div><p style={{ fontWeight: 700, fontSize: 14 }}>{citizen.firstName} {citizen.lastName}</p></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={handleOpenNotifications} style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(255,255,255,.04)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg></button>
            <button onClick={() => setTab("settings")} style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(255,255,255,.04)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg></button>
            {showNotifications && <MobileNotifPanel />}
          </div>
        </header>
        {alert && <div className="kk-toast">{alert.msg}</div>}
        {showScanner && <QRScannerModal onScan={handleImportAttempt} onError={msg => showAlert("error", msg)} onClose={() => setShowScanner(false)} />}
        {showQRShare && <QRShareModal />}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 32px 100px" }}>
          {tab === "home" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim-fade-up">
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>My Credentials</h3>
              <CredentialCard data={citizen} onAlert={showAlert} />
            </div>
          )}
          {tab === "connections" && <ConnectionsView />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </main>
      <nav className="bottom-nav">
        {[
          { id: "home", label: "Home", icon: <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg> },
          { id: "prove", label: "Prove", icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg> },
          { id: "verifier", label: "Verify", icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg> },
          { id: "connections", label: "Partners", icon: <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg> }
        ].map(n => (
          <button key={n.id} onClick={() => handleNav(n.id)} className={`nav-item${tab === n.id ? " active" : ""}`}>{n.icon}<span>{n.label}</span></button>
        ))}
      </nav>
      <style>{`@media(min-width:768px){ #kk-sidebar { display:flex !important; } .bottom-nav { display:none !important; } .mobile-header { display:none !important; } }`}</style>
    </div>
  );
}
