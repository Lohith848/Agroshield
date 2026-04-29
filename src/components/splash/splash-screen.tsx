"use client"

import { useEffect, useState } from 'react'

export function SplashScreen() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "linear-gradient(135deg, #052e16 0%, #14532d 50%, #16a34a 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999
    }}>
      {/* Animated logo */}
      <div style={{ animation: "pulse 1.5s infinite", marginBottom: "24px" }}>
        <div style={{
          width: "96px",
          height: "96px",
          background: "rgba(255,255,255,0.15)",
          borderRadius: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid rgba(255,255,255,0.3)"
        }}>
          <span style={{ fontSize: "48px" }}>🌿</span>
        </div>
      </div>

      <div style={{ color: "#fff", fontSize: "32px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "8px" }}>
        AgroShield
      </div>
      <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "15px", marginBottom: "48px" }}>
        AI-Powered Crop Protection
      </div>

      {/* Loading dots */}
      <div style={{ display: "flex", gap: "8px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#4ade80",
            animation: `bounce 0.6s ${i * 0.15}s infinite alternate`
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  )
}