"use client"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer style={{
      background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
      color: 'rgba(255,255,255,0.9)',
      padding: '24px 20px 32px',
      marginTop: '48px',
      textAlign: 'center'
    }}>
      {/* Logo */}
      <div style={{
        fontSize: '20px',
        fontWeight: '800',
        marginBottom: '4px',
        letterSpacing: '-0.3px'
      }}>
        🌿 AgroShield AI
      </div>
      <div style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: '20px'
      }}>
        Precision Crop Protection Platform
      </div>

      {/* Divider */}
      <div style={{
        height: '1px',
        background: 'rgba(255,255,255,0.15)',
        margin: '0 0 20px 0'
      }} />

      {/* Credits */}
      <div style={{ fontSize: '13px', marginBottom: '6px' }}>
        Designed & Built by
      </div>
      <div style={{
        fontSize: '18px',
        fontWeight: '700',
        color: '#4ade80',
        marginBottom: '4px',
        letterSpacing: '0.3px'
      }}>
        Lohith
      </div>
      <div style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        marginBottom: '20px'
      }}>
        G
      </div>

      {/* Tech Stack badges */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '20px'
      }}>
        {['Next.js', 'Gemini AI', 'Firebase', 'OpenStreetMap', 'Vercel'].map(tech => (
          <span key={tech} style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.8)'
          }}>
            {tech}
          </span>
        ))}
      </div>

      {/* Divider */}
      <div style={{
        height: '1px',
        background: 'rgba(255,255,255,0.1)',
        margin: '0 0 16px 0'
      }} />

      {/* Bottom row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
          © {currentYear} AgroShield AI. All rights reserved.
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
          Made with 💚 for Indian Farmers
        </div>
      </div>

      {/* ICAR disclaimer */}
      <div style={{
        marginTop: '12px',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.3)',
        lineHeight: '1.5',
        maxWidth: '600px',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        AI recommendations are advisory only. Follow ICAR guidelines.
        Consult a certified agricultural officer for confirmation.
      </div>
    </footer>
  )
}