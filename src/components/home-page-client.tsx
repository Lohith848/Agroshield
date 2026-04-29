"use client"

import { useState, useEffect } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { Dashboard } from '@/components/dashboard/dashboard'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { SplashScreen } from '@/components/splash/splash-screen'

export default function HomePageClient() {
  const [user, setUser] = useState<any>(null)
  const [showSplash, setShowSplash] = useState(true)

  // Hide splash after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  if (showSplash) {
    return <SplashScreen />
  }

   return <AuthWrapper user={user} onUserChange={setUser} />
 }