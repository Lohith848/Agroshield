"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { Phone, Mail, User, MapPin, Globe } from 'lucide-react'

interface AuthFormProps {
  onSuccess: (user: any) => void
}

export function AuthFormEmail({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    name: '',
    role: 'farmer',
    language: 'english',
    district: '',
    village: '',
    otp: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSendOtp = async () => {
    if (!formData.email && !formData.phone) {
      alert('Please enter email or phone number')
      return
    }

    if (formData.phone && formData.phone.length !== 10) {
      alert('Please enter a valid 10-digit phone number')
      return
    }

    if (formData.email && !formData.email.includes('@')) {
      alert('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      // Try phone first, fallback to email
      if (formData.phone) {
        console.log('Sending OTP to phone:', `+91${formData.phone}`)
        const { error } = await supabase.auth.signInWithOtp({
          phone: `+91${formData.phone}`,
        })
        if (error) throw error
      } else {
        console.log('Sending OTP to email:', formData.email)
        const { error } = await supabase.auth.signInWithOtp({
          email: formData.email,
        })
        if (error) throw error
      }

      console.log('OTP sent successfully')
      setOtpSent(true)
    } catch (error) {
      console.error('Error sending OTP:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('Unsupported phone provider')) {
          alert('Phone authentication not configured. Please use email instead.')
        } else {
          alert(`Failed to send OTP: ${error.message}`)
        }
      } else {
        alert('Failed to send OTP. Please try again.')
      }
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
      
      const verifyOptions: any = {
        token: formData.otp,
        type: formData.email ? 'email' : 'sms'
      }
      
      if (formData.email) {
        verifyOptions.email = formData.email
      }
      if (formData.phone) {
        verifyOptions.phone = `+91${formData.phone}`
      }
      
      const { data, error } = await supabase.auth.verifyOtp(verifyOptions)

      if (error) throw error

      if (!isLogin && data.user) {
        // Create profile for new user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            role: formData.role,
            language: formData.language,
            district: formData.district,
            village: formData.village,
            created_at: new Date().toISOString(),
          })

        if (profileError) console.error('Profile creation error:', profileError)
      }

      onSuccess(data.user)
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
                  <Label htmlFor="email">Email Address (Alternative to Phone)</Label>
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

                <div className="text-center text-sm text-gray-500">OR</div>

                {/* Phone Input */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
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
                  {loading ? 'Sending...' : `Send ${formData.email ? 'Email' : 'Phone'} OTP`}
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
