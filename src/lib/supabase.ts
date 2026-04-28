import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create client only if environment variables are available
let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Log warning for development
  if (typeof window !== 'undefined') {
    console.warn('Supabase environment variables not found. Please check your .env.local file.')
  }
}

export { supabase }

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          phone: string
          role: 'farmer' | 'manager' | 'officer'
          language: 'en' | 'ta' | 'te' | 'hi' | 'kn'
          location_lat: number | null
          location_lng: number | null
          village: string | null
          district: string | null
          state: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          phone: string
          role: 'farmer' | 'manager' | 'officer'
          language?: 'en' | 'ta' | 'te' | 'hi' | 'kn'
          location_lat?: number | null
          location_lng?: number | null
          village?: string | null
          district?: string | null
          state?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          role?: 'farmer' | 'manager' | 'officer'
          language?: 'en' | 'ta' | 'te' | 'hi' | 'kn'
          location_lat?: number | null
          location_lng?: number | null
          village?: string | null
          district?: string | null
          state?: string
          updated_at?: string
        }
      }
      farms: {
        Row: {
          id: string
          owner_id: string
          name: string
          crop_type: string
          area_acres: number
          boundary: string | null
          soil_type: string | null
          irrigation_type: string | null
          planting_date: string | null
          expected_harvest_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          owner_id: string
          name: string
          crop_type: string
          area_acres: number
          boundary?: string | null
          soil_type?: string | null
          irrigation_type?: string | null
          planting_date?: string | null
          expected_harvest_date?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          crop_type?: string
          area_acres?: number
          boundary?: string | null
          soil_type?: string | null
          irrigation_type?: string | null
          planting_date?: string | null
          expected_harvest_date?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          user_id: string
          farm_id: string
          image_url: string
          disease_class: string
          confidence: number
          severity: 'healthy' | 'mild' | 'moderate' | 'severe'
          gps_lat: number | null
          gps_lng: number | null
          scan_method: 'manual' | 'drone' | 'rover'
          ai_model_version: string | null
          processing_time_ms: number | null
          is_verified: boolean
          verified_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          farm_id: string
          image_url: string
          disease_class: string
          confidence: number
          severity: 'healthy' | 'mild' | 'moderate' | 'severe'
          gps_lat?: number | null
          gps_lng?: number | null
          scan_method?: 'manual' | 'drone' | 'rover'
          ai_model_version?: string | null
          processing_time_ms?: number | null
          is_verified?: boolean
          verified_by?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          farm_id?: string
          image_url?: string
          disease_class?: string
          confidence?: number
          severity?: 'healthy' | 'mild' | 'moderate' | 'severe'
          gps_lat?: number | null
          gps_lng?: number | null
          scan_method?: 'manual' | 'drone' | 'rover'
          ai_model_version?: string | null
          processing_time_ms?: number | null
          is_verified?: boolean
          verified_by?: string | null
          notes?: string | null
        }
      }
      spray_plans: {
        Row: {
          id: string
          farm_id: string
          created_by: string
          waypoints: any[]
          total_dosage: number
          pesticide_type: string
          status: 'pending' | 'approved' | 'executing' | 'completed' | 'cancelled'
          approved_by: string | null
          approved_at: string | null
          scheduled_at: string | null
          estimated_duration_minutes: number | null
          cost_estimate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          farm_id: string
          created_by: string
          waypoints: any[]
          total_dosage: number
          pesticide_type: string
          status?: 'pending' | 'approved' | 'executing' | 'completed' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          scheduled_at?: string | null
          estimated_duration_minutes?: number | null
          cost_estimate?: number | null
        }
        Update: {
          id?: string
          farm_id?: string
          created_by?: string
          waypoints?: any[]
          total_dosage?: number
          pesticide_type?: string
          status?: 'pending' | 'approved' | 'executing' | 'completed' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          scheduled_at?: string | null
          estimated_duration_minutes?: number | null
          cost_estimate?: number | null
          updated_at?: string
        }
      }
      spray_logs: {
        Row: {
          id: string
          plan_id: string
          farm_id: string
          drone_id: string | null
          operator_id: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
          started_at: string | null
          completed_at: string | null
          actual_dosage: number | null
          area_covered: number | null
          weather_conditions: any | null
          issues: string | null
          created_at: string
        }
        Insert: {
          plan_id: string
          farm_id: string
          drone_id?: string | null
          operator_id?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
          started_at?: string | null
          completed_at?: string | null
          actual_dosage?: number | null
          area_covered?: number | null
          weather_conditions?: any | null
          issues?: string | null
        }
        Update: {
          id?: string
          plan_id?: string
          farm_id?: string
          drone_id?: string | null
          operator_id?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
          started_at?: string | null
          completed_at?: string | null
          actual_dosage?: number | null
          area_covered?: number | null
          weather_conditions?: any | null
          issues?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          farm_id: string | null
          type: 'detection' | 'spray_plan' | 'spray_complete' | 'alert' | 'reminder'
          title: string
          message: string
          data: any | null
          is_read: boolean
          sent_via: 'push' | 'whatsapp' | 'sms' | 'email' | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          farm_id?: string | null
          type: 'detection' | 'spray_plan' | 'spray_complete' | 'alert' | 'reminder'
          title: string
          message: string
          data?: any | null
          is_read?: boolean
          sent_via?: 'push' | 'whatsapp' | 'sms' | 'email' | null
          sent_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          farm_id?: string | null
          type?: 'detection' | 'spray_plan' | 'spray_complete' | 'alert' | 'reminder'
          title?: string
          message?: string
          data?: any | null
          is_read?: boolean
          sent_via?: 'push' | 'whatsapp' | 'sms' | 'email' | null
          sent_at?: string | null
        }
      }
      settings: {
        Row: {
          id: string
          user_id: string
          key: string
          value: any
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          key: string
          value: any
        }
        Update: {
          id?: string
          user_id?: string
          key?: string
          value?: any
          updated_at?: string
        }
      }
    }
  }
}
