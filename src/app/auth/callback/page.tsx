"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (!supabase) {
          console.error('Supabase client not initialized')
          router.push('/')
          return
        }
        
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/')
          return
        }

        if (data.session) {
          console.log('User authenticated successfully')
          router.push('/')
        } else {
          // Check URL hash for session
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          
          if (accessToken) {
            if (!supabase) {
              console.error('Supabase client not initialized')
              router.push('/')
              return
            }
            
            const { data: { session }, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || ''
            })
            
            if (sessionError) {
              console.error('Session setting error:', sessionError)
            } else {
              console.log('Session set successfully')
            }
          }
          
          router.push('/')
        }
      } catch (error) {
        console.error('Callback error:', error)
        router.push('/')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-white font-bold text-xl">AS</span>
        </div>
        <p className="text-green-800">Authenticating...</p>
      </div>
    </div>
  )
}
