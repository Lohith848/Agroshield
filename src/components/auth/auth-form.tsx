"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Phone, Mail, User, MapPin, Languages } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AuthFormProps {
  onSuccess: (user: any) => void
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    role: 'farmer' as 'farmer' | 'manager' | 'officer',
    language: 'en' as 'en' | 'ta' | 'te' | 'hi' | 'kn',
    district: '',
    village: '',
    otp: ''
  })

  const roles = [
    { value: 'farmer', label: 'Farmer', description: 'Manage your crops and fields' },
    { value: 'manager', label: 'Cooperative Manager', description: 'Manage multiple farms' },
    { value: 'officer', label: 'Extension Officer', description: 'Regional oversight' }
  ]

  const languages = [
    { value: 'en', label: 'English', native: 'English' },
    { value: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { value: 'te', label: 'Telugu', native: 'తెలుగు' },
    { value: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { value: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' }
  ]

  const districts = [
    'Coimbatore', 'Erode', 'Tirupur', 'Salem', 'Namakkal', 'Karur', 'Dindigul', 'Madurai',
    'Trichy', 'Thanjavur', 'Kumbakonam', 'Vellore', 'Krishnagiri', 'Dharmapuri'
  ]

  const handleSendOtp = async () => {
    if (!formData.phone || formData.phone.length !== 10) {
      alert('Please enter a valid 10-digit phone number')
      return
    }

    setLoading(true)
    try {
      // Send OTP via Supabase Auth
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${formData.phone}`,
      })

      if (error) throw error

      setOtpSent(true)
    } catch (error) {
      console.error('Error sending OTP:', error)
      alert('Failed to send OTP. Please try again.')
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
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+91${formData.phone}`,
        token: formData.otp,
        type: 'sms'
      })

      if (error) throw error

      if (!isLogin && data.user) {
        // Create profile for new user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name: formData.name,
            phone: formData.phone,
            role: formData.role,
            language: formData.language,
            district: formData.district,
            village: formData.village
          })

        if (profileError) throw profileError
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .single()

      onSuccess({ ...data.user, profile })
    } catch (error) {
      console.error('Error verifying OTP:', error)
      alert('Failed to verify OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (otpSent) {
      handleVerifyOtp()
    } else {
      handleSendOtp()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">AS</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">
            {isLogin ? 'Welcome Back' : 'Join AgroShield'}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? 'Sign in to manage your crops with AI-powered precision agriculture'
              : 'Start your journey to smarter farming'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!otpSent && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter 10-digit number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    maxLength={10}
                    required
                  />
                </div>

                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Select Your Role</Label>
                      <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div>
                                <div className="font-medium">{role.label}</div>
                                <div className="text-sm text-gray-500">{role.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Languages className="w-4 h-4" />
                        Preferred Language
                      </Label>
                      <Select value={formData.language} onValueChange={(value: any) => setFormData({ ...formData, language: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label} ({lang.native})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Location
                      </Label>
                      <Select value={formData.district} onValueChange={(value) => setFormData({ ...formData, district: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select district" />
                        </SelectTrigger>
                        <SelectContent>
                          {districts.map((district) => (
                            <SelectItem key={district} value={district}>
                              {district}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="village">Village (Optional)</Label>
                      <Input
                        id="village"
                        type="text"
                        placeholder="Enter your village name"
                        value={formData.village}
                        onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {otpSent && (
              <div className="space-y-2">
                <Label htmlFor="otp" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Enter OTP
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                  maxLength={6}
                  required
                />
                <p className="text-sm text-gray-600">
                  OTP sent to +91{formData.phone}
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700" 
              disabled={loading}
            >
              {loading ? 'Processing...' : otpSent ? 'Verify OTP' : 'Send OTP'}
            </Button>

            {otpSent && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setOtpSent(false)}
                disabled={loading}
              >
                Change Phone Number
              </Button>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setOtpSent(false)
                  setFormData({ ...formData, otp: '' })
                }}
                className="text-green-600 hover:text-green-700 text-sm"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </CardContent>

        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="secondary" className="text-xs">🌱 AI-Powered</Badge>
            <Badge variant="secondary" className="text-xs">🎯 Precision</Badge>
            <Badge variant="secondary" className="text-xs">💰 Cost Saving</Badge>
            <Badge variant="secondary" className="text-xs">🌱 Eco-Friendly</Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}
