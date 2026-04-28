"use client"

import { useState, useEffect } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { Dashboard } from '@/components/dashboard/dashboard'
import { AuthWrapper } from '@/components/auth/auth-wrapper'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simple loading simulation for build
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
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

  return <AuthWrapper user={user} onUserChange={setUser} />
}
