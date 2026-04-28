"use client"

import { useState, useEffect } from 'react'
import { AuthForm } from './auth-form'
import { AuthFormEmail } from './auth-form-email'
import { Dashboard } from '../dashboard/dashboard'

interface AuthWrapperProps {
  user: any
  onUserChange: (user: any) => void
}

export function AuthWrapper({ user, onUserChange }: AuthWrapperProps) {
  const [loading, setLoading] = useState(true)
  const [supabaseReady, setSupabaseReady] = useState(false)

  useEffect(() => {
    // Check if Supabase environment variables are available
    const checkSupabase = () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      // Debug logging for production
      console.log('Environment Check:', {
        supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
        supabaseKey: supabaseKey ? 'SET' : 'MISSING',
        isProduction: process.env.NODE_ENV
      })
      
      const hasEnvVars = !!(supabaseUrl && supabaseKey)
      
      setSupabaseReady(hasEnvVars)
      setLoading(false)
    }

    checkSupabase()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-xl">AS</span>
          </div>
          <p className="text-green-800">Loading AgroShield...</p>
        </div>
      </div>
    )
  }

  if (!supabaseReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Configuration Required</h2>
          <p className="text-gray-600 mb-4">
            Please set up your environment variables to connect to Supabase.
          </p>
          <div className="bg-gray-100 rounded-lg p-4 text-left">
            <p className="text-sm font-mono text-gray-700">
              NEXT_PUBLIC_SUPABASE_URL=your_supabase_url<br/>
              NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (user) {
    return <Dashboard user={user} />
  }

  // Show both auth forms as fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose Authentication Method</h1>
          <p className="text-gray-600">Phone authentication may not be configured. Use email as alternative.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">📱 Phone Authentication</h3>
            <AuthForm onSuccess={onUserChange} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">📧 Email Authentication</h3>
            <AuthFormEmail onSuccess={onUserChange} />
          </div>
        </div>
      </div>
    </div>
  )
}
