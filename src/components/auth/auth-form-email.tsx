"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { generateOTP, storeOTP, verifyOTP, sendEmailOTP } from '@/lib/email-otp'
import { Mail, User, MapPin, Globe } from 'lucide-react'

interface AuthFormProps {
  onSuccess: (user: any) => void
}

export function AuthFormEmail({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'farmer',
    language: 'english',
    district: '',
    village: '',
    otp: ''
  })
  
  const [generatedOTP, setGeneratedOTP] = useState<string>('')

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSendOtp = async () => {
    if (!formData.email) {
      alert('Please enter your email address')
      return
    }

    if (!formData.email.includes('@')) {
      alert('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      // Generate and store custom OTP
      const otp = generateOTP()
      storeOTP(formData.email, otp)
      setGeneratedOTP(otp)
      
      console.log('Sending OTP to email:', formData.email)
      const emailSent = await sendEmailOTP(formData.email, otp)
      
      if (!emailSent) {
        throw new Error('Failed to send email OTP')
      }

      console.log('OTP sent successfully')
      setOtpSent(true)
      
      // Development helper - show OTP in console and UI
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔓 DEV MODE - OTP for ${formData.email}: ${otp}`)
      }
    } catch (error) {
      console.error('Error sending OTP:', error)
      alert(`Failed to send OTP: ${error instanceof Error ? error.message : 'Please try again'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!formData.otp || formData.otp.length !== 6) {
      alert('Please enter a valid 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      // Verify custom OTP
      const isValidOTP = verifyOTP(formData.email, formData.otp)
      
      if (!isValidOTP) {
        throw new Error('Invalid or expired OTP')
      }

      // Create or authenticate user in Supabase
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: 'temp-password-' + Date.now(), // Temporary password
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            language: formData.language,
            district: formData.district,
            village: formData.village,
          }
        }
      })

      if (error && !error.message.includes('already registered')) {
        throw error
      }

      // If user already exists, sign them in
      if (error?.message.includes('already registered')) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: 'temp-password-' + Date.now()
        })
        
        if (signInError) {
          // For existing users, we need to handle this differently
          // For now, create a mock user object
          const mockUser = {
            id: 'temp-user-' + Date.now(),
            email: formData.email,
            user_metadata: {
              name: formData.name,
              role: formData.role,
              language: formData.language,
              district: formData.district,
              village: formData.village,
            }
          }
          
          // Save user session to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('agroshield_user', JSON.stringify(mockUser))
            console.log('💾 Session saved for:', mockUser.email)
          }
          
          onSuccess(mockUser)
          return
        }
        
        if (!isLogin && signInData.user) {
          // Update profile if needed
          await supabase
            .from('profiles')
            .upsert({
              id: signInData.user.id,
              name: formData.name,
              email: formData.email,
              role: formData.role,
              language: formData.language,
              district: formData.district,
              village: formData.village,
              updated_at: new Date().toISOString(),
            })
        }
        
        // Save user session to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('agroshield_user', JSON.stringify(signInData.user))
          console.log('💾 Session saved for:', signInData.user.email)
        }
        
        onSuccess(signInData.user)
      } else if (data.user) {
        // Create profile for new user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            language: formData.language,
            district: formData.district,
            village: formData.village,
            created_at: new Date().toISOString(),
          })

        if (profileError) console.error('Profile creation error:', profileError)
        
        // Save user session to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('agroshield_user', JSON.stringify(data.user))
          console.log('💾 Session saved for:', data.user.email)
        }
        
        onSuccess(data.user)
      }
    } catch (error) {
      console.error('Error verifying OTP:', error)
      alert('Failed to verify OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">AS</span>
            </div>
            <CardTitle>
              {isLogin ? 'Welcome Back' : 'Join AgroShield'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Sign in to access your farming dashboard'
                : 'Get started with AI-powered crop protection'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!otpSent ? (
              <>
                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="farmer@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="name"
                          placeholder="Raj Kumar"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="farmer">Farmer</SelectItem>
                            <SelectItem value="manager">Farm Manager</SelectItem>
                            <SelectItem value="officer">Agriculture Officer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="tamil">தமிழ்</SelectItem>
                            <SelectItem value="hindi">हिंदी</SelectItem>
                            <SelectItem value="telugu">తెలుగు</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="district">District</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="district"
                            placeholder="Coimbatore"
                            value={formData.district}
                            onChange={(e) => handleInputChange('district', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="village">Village</Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="village"
                            placeholder="Pollachi"
                            value={formData.village}
                            onChange={(e) => handleInputChange('village', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Button 
                  onClick={handleSendOtp} 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Sending...' : 'Send Email OTP'}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={formData.otp}
                    onChange={(e) => handleInputChange('otp', e.target.value)}
                  />
                  {process.env.NODE_ENV === 'development' && generatedOTP && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-yellow-800">🔓 Development OTP:</span>
                        <span className="font-mono text-yellow-900 bg-yellow-100 px-2 py-1 rounded">
                          {generatedOTP}
                        </span>
                      </div>
                      <p className="text-yellow-700 mt-1">Use this code for testing (shown in dev mode only)</p>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleVerifyOtp} 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => setOtpSent(false)}
                  className="w-full"
                >
                  Back
                </Button>
              </>
            )}

            <div className="text-center text-sm text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <Button 
                variant="link" 
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 p-0 h-auto font-normal text-green-600 hover:text-green-700"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
