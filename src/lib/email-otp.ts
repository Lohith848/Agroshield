// Custom Email OTP System
interface OTPData {
  email: string
  otp: string
  timestamp: number
}

// Store OTPs in memory (in production, use Redis or database)
const otpStore = new Map<string, OTPData>()

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Store OTP with expiration (10 minutes)
export function storeOTP(email: string, otp: string): void {
  const data: OTPData = {
    email,
    otp,
    timestamp: Date.now()
  }
  otpStore.set(email, data)
}

// Verify OTP
export function verifyOTP(email: string, otp: string): boolean {
  const data = otpStore.get(email)
  if (!data) return false
  
  // Check if OTP is expired (10 minutes)
  const isExpired = Date.now() - data.timestamp > 10 * 60 * 1000
  if (isExpired) {
    otpStore.delete(email)
    return false
  }
  
  // Check if OTP matches
  const isValid = data.otp === otp
  if (isValid) {
    otpStore.delete(email) // Clean up after successful verification
  }
  
  return isValid
}

// Real email sending function using Resend
export async function sendEmailOTP(email: string, otp: string): Promise<boolean> {
  try {
    console.log(`📧 Sending OTP to ${email}: ${otp}`)
    
    // In development, still show the OTP for testing
    if (process.env.NODE_ENV === 'development') {
      console.log(`
      ══════════════════════════════════════════════════════════════
      🌾 AGROSHIELD - EMAIL OTP VERIFICATION 🌾
      ══════════════════════════════════════════════════════════════
      
      Your OTP code is: ${otp}
      
      This code will expire in 10 minutes.
      
      Thank you for using AgroShield!
      🌱 Precision Agriculture Platform
      ══════════════════════════════════════════════════════════════
      `)
    }
    
    // Try to send real email using Resend API
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (resendApiKey && process.env.NODE_ENV === 'production') {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'noreply@agroshield.app',
          to: [email],
          subject: '🌾 AgroShield - Your OTP Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 60px; height: 60px; background-color: #16a34a; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                  <span style="color: white; font-weight: bold; font-size: 24px;">AS</span>
                </div>
                <h1 style="color: #16a34a; margin: 0;">🌾 AgroShield</h1>
                <p style="color: #64748b; margin: 5px 0 0;">Precision Agriculture Platform</p>
              </div>
              
              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="color: #1f2937; margin-top: 0;">Email Verification</h2>
                <p style="color: #6b7280; font-size: 16px;">Your verification code is:</p>
                
                <div style="background-color: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; color: #16a34a; letter-spacing: 4px;">${otp}</span>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0;">
                  This code will expire in <strong>10 minutes</strong>. Please do not share this code with anyone.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  If you didn't request this code, you can safely ignore this email.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0;">
                  © 2024 AgroShield. All rights reserved.
                </p>
              </div>
            </div>
          `
        })
      })
      
      if (!response.ok) {
        throw new Error(`Email service error: ${response.statusText}`)
      }
      
      console.log('✅ Real email sent successfully')
      return true
    } else {
      // Fallback for development or missing API key
      console.log('📧 Using development mode (no real email sent)')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate email delay
      return true
    }
  } catch (error) {
    console.error('Failed to send email OTP:', error)
    // Still return true so OTP verification works in development
    return process.env.NODE_ENV === 'development'
  }
}
