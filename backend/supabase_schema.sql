-- AgroShield Database Schema
-- PostgreSQL schema for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'manager', 'officer')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ta', 'te', 'hi', 'kn')),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  village TEXT,
  district TEXT,
  state TEXT DEFAULT 'Tamil Nadu',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  area_acres DECIMAL(8, 2) NOT NULL,
  boundary GEOGRAPHY(POLYGON, 4326),
  soil_type TEXT,
  irrigation_type TEXT,
  planting_date DATE,
  expected_harvest_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scans table
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  disease_class TEXT NOT NULL,
  confidence DECIMAL(5, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  severity TEXT NOT NULL CHECK (severity IN ('healthy', 'mild', 'moderate', 'severe')),
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  scan_method TEXT DEFAULT 'manual' CHECK (scan_method IN ('manual', 'drone', 'rover')),
  ai_model_version TEXT,
  processing_time_ms INTEGER,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spray Plans table
CREATE TABLE IF NOT EXISTS public.spray_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  waypoints JSONB NOT NULL,
  total_dosage DECIMAL(8, 3) NOT NULL,
  pesticide_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executing', 'completed', 'cancelled')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  estimated_duration_minutes INTEGER,
  cost_estimate DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spray Logs table
CREATE TABLE IF NOT EXISTS public.spray_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_id UUID REFERENCES public.spray_plans(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  drone_id TEXT,
  operator_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'paused')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  actual_dosage DECIMAL(8, 3),
  area_covered DECIMAL(8, 2),
  weather_conditions JSONB,
  issues TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disease Reference table
CREATE TABLE IF NOT EXISTS public.disease_reference (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  disease_name TEXT UNIQUE NOT NULL,
  scientific_name TEXT,
  crop_type TEXT NOT NULL,
  symptoms TEXT[],
  treatment_recommendations TEXT[],
  severity_levels JSONB,
  image_urls TEXT[],
  source_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Summary table
CREATE TABLE IF NOT EXISTS public.analytics_summary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_scans INTEGER DEFAULT 0,
  healthy_count INTEGER DEFAULT 0,
  mild_count INTEGER DEFAULT 0,
  moderate_count INTEGER DEFAULT 0,
  severe_count INTEGER DEFAULT 0,
  pesticide_usage DECIMAL(8, 3) DEFAULT 0,
  cost_savings DECIMAL(10, 2) DEFAULT 0,
  health_score DECIMAL(5, 2) DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(farm_id, date)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('detection', 'spray_plan', 'spray_complete', 'alert', 'reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  sent_via TEXT CHECK (sent_via IN ('push', 'whatsapp', 'sms', 'email')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Row Level Security (RLS) Policies

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Managers can view farmers in their region" ON public.profiles FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'manager'
  )
);
CREATE POLICY "Officers can view all profiles" ON public.profiles FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'officer'
  )
);

-- Farms RLS
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm owners can view own farms" ON public.farms FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Farm owners can manage own farms" ON public.farms FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Managers can view farms in their region" ON public.farms FOR SELECT USING (
  owner_id IN (
    SELECT id FROM public.profiles WHERE 
      role = 'farmer' AND 
      district = (SELECT district FROM public.profiles WHERE id = auth.uid())
  )
);
CREATE POLICY "Officers can view all farms" ON public.farms FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'officer'
  )
);

-- Scans RLS
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own scans" ON public.scans FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create scans" ON public.scans FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Farm owners can view farm scans" ON public.scans FOR SELECT USING (
  farm_id IN (
    SELECT id FROM public.farms WHERE owner_id = auth.uid()
  )
);
CREATE POLICY "Managers can view scans in their region" ON public.scans FOR SELECT USING (
  user_id IN (
    SELECT id FROM public.profiles WHERE 
      role = 'farmer' AND 
      district = (SELECT district FROM public.profiles WHERE id = auth.uid())
  )
);
CREATE POLICY "Officers can view all scans" ON public.scans FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'officer'
  )
);

-- Spray Plans RLS
ALTER TABLE public.spray_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own spray plans" ON public.spray_plans FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create spray plans" ON public.spray_plans FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Farm owners can view farm spray plans" ON public.spray_plans FOR SELECT USING (
  farm_id IN (
    SELECT id FROM public.farms WHERE owner_id = auth.uid()
  )
);

-- Functions and Triggers

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON public.farms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_spray_plans_updated_at BEFORE UPDATE ON public.spray_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Analytics summary calculation function
CREATE OR REPLACE FUNCTION calculate_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.analytics_summary (
    farm_id, 
    date, 
    total_scans, 
    healthy_count, 
    mild_count, 
    moderate_count, 
    severe_count,
    health_score
  )
  SELECT 
    NEW.farm_id,
    NEW.created_at::DATE,
    COUNT(*),
    COUNT(*) FILTER (WHERE severity = 'healthy'),
    COUNT(*) FILTER (WHERE severity = 'mild'),
    COUNT(*) FILTER (WHERE severity = 'moderate'),
    COUNT(*) FILTER (WHERE severity = 'severe'),
    CASE 
      WHEN COUNT(*) = 0 THEN 100
      ELSE ROUND(100 - (
        (COUNT(*) FILTER (WHERE severity = 'mild') * 0.2 +
         COUNT(*) FILTER (WHERE severity = 'moderate') * 0.5 +
         COUNT(*) FILTER (WHERE severity = 'severe') * 1.0
        ) / COUNT(*) * 100, 2)
    END
  FROM public.scans 
  WHERE farm_id = NEW.farm_id AND created_at::DATE = NEW.created_at::DATE
  ON CONFLICT (farm_id, date) 
  DO UPDATE SET
    total_scans = EXCLUDED.total_scans,
    healthy_count = EXCLUDED.healthy_count,
    mild_count = EXCLUDED.mild_count,
    moderate_count = EXCLUDED.moderate_count,
    severe_count = EXCLUDED.severe_count,
    health_score = EXCLUDED.health_score;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for analytics calculation
CREATE TRIGGER calculate_analytics_trigger
AFTER INSERT ON public.scans
FOR EACH ROW
EXECUTE FUNCTION calculate_daily_analytics();

-- Indexes for performance
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_farms_owner_id ON public.farms(owner_id);
CREATE INDEX idx_scans_user_id ON public.scans(user_id);
CREATE INDEX idx_scans_farm_id ON public.scans(farm_id);
CREATE INDEX idx_scans_created_at ON public.scans(created_at);
CREATE INDEX idx_spray_plans_farm_id ON public.spray_plans(farm_id);
CREATE INDEX idx_spray_plans_status ON public.spray_plans(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Insert sample disease reference data
INSERT INTO public.disease_reference (disease_name, scientific_name, crop_type, symptoms, treatment_recommendations, severity_levels) VALUES
('Tomato_Early_Blight', 'Alternaria solani', 'tomato', 
 ARRAY['Dark brown spots on lower leaves', 'Concentric rings in spots', 'Yellowing of leaves'],
 ARRAY['Remove infected leaves', 'Apply copper-based fungicide', 'Improve air circulation'],
 '{"mild": "10-20% leaf area", "moderate": "20-50% leaf area", "severe": ">50% leaf area"}'),

('Tomato_Late_Blight', 'Phytophthora infestans', 'tomato',
 ARRAY['Water-soaked lesions on leaves', 'White fungal growth on underside', 'Dark brown lesions on stems'],
 ARRAY['Apply metalaxyl-based fungicide', 'Remove infected plants', 'Reduce humidity'],
 '{"mild": "Few scattered lesions", "moderate": "Multiple lesions per leaf", "severe": "Extensive lesions, plant collapse"}'),

('Chili_Leaf_Curl', 'Begomovirus', 'chili',
 ARRAY['Upward curling of leaves', 'Yellow mosaic patterns', 'Stunted growth'],
 ARRAY['Remove infected plants', 'Control whitefly vectors', 'Use resistant varieties'],
 '{"mild": "Slight curling", "moderate": "Severe curling + yellowing", "severe": "Complete deformation, no fruit"}'),

('Wheat_Rust', 'Puccinia spp.', 'wheat',
 ARRAY['Orange-brown pustules on leaves', 'Yellowing of tissue', 'Reduced grain fill'],
 ARRAY['Apply propiconazole fungicide', 'Use resistant cultivars', 'Early planting'],
 '{"mild": "Few pustules", "moderate": "Many pustules per leaf", "severe": "Coalesced pustules, leaf death"}');
