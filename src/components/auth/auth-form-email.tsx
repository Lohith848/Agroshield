"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { Mail, User, MapPin, Globe } from 'lucide-react'

interface AuthFormProps {
  onSuccess: (user: any) => void
}

export function AuthFormEmail({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'farmer',
    language: 'english',
    district: '',
    village: '',
    otp: ''
  })
  
  // Cooldown timer for resend OTP
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [cooldown])
  
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
      
      console.log('Sending OTP to:', formData.email)
      
      // Use Supabase's built-in OTP flow
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          shouldCreateUser: !isLogin, // Create user only in sign-up mode
        }
      })

      if (error) {
        console.error('Supabase OTP Error:', error)
        throw error
      }

      console.log('OTP sent successfully')
      setOtpSent(true)
      setCooldown(30) // 30 seconds cooldown for resend
      
    } catch (error) {
      console.error('Error sending OTP:', error)
      alert(`Failed to send OTP: ${error instanceof Error ? error.message : 'Please try again'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (cooldown > 0) return
    await handleSendOtp()
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
      
      // Verify OTP using Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: formData.otp,
        type: 'email' // email OTP verification type (works for both signup and login)
      })

      if (error) throw error

      // Get user from response
      const user = data.user
      if (!user) {
        throw new Error('No user returned after verification')
      }

      // For sign-up, create profile
      if (!isLogin) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            language: formData.language,
            district: formData.district,
            village: formData.village,
            created_at: new Date().toISOString(),
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Don't throw - allow login even if profile creation fails
        }
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      // Save user session to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('agroshield_user', JSON.stringify({ ...user, profile }))
        console.log('💾 Session saved for:', user.email)
      }
      
      onSuccess({ ...user, profile })
      
    } catch (error) {
      console.error('Error verifying OTP:', error)
      alert(`Failed to verify OTP: ${error instanceof Error ? error.message : 'Please try again'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleModeToggle = () => {
    setIsLogin(!isLogin)
    setOtpSent(false)
    setCooldown(0)
    setFormData(prev => ({ ...prev, otp: '' }))
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
                  disabled={loading || cooldown > 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Sending...' : `Send OTP ${cooldown > 0 ? `(Resend available in ${cooldown}s)` : ''}`}
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
                    onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, ''))}
                  />
                  <p className="text-sm text-gray-600 text-center">
                    OTP sent to {formData.email}
                  </p>
                </div>

                <Button 
                  onClick={handleVerifyOtp} 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </Button>

                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setOtpSent(false)
                      setCooldown(0)
                      setFormData(prev => ({ ...prev, otp: '' }))
                    }}
                    className="w-full"
                  >
                    Back
                  </Button>
                  
                  <Button 
                    variant="link" 
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || loading}
                    className="w-full"
                  >
                    {cooldown > 0 ? `Resend OTP available in ${cooldown}s` : "Didn't receive OTP? Resend"}
                  </Button>
                </div>
              </>
            )}

            <div className="text-center text-sm text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <Button 
                variant="link" 
                onClick={handleModeToggle}
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
