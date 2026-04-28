from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import uvicorn
import requests
from ai_service import detection_service, initialize_ai_service

load_dotenv()

# Get port from environment (Render sets this)
PORT = int(os.getenv("PORT", 8000))

app = FastAPI(title="AgroShield API", version="1.0.0")

# CORS middleware - allow all origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins - adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client - exit if missing
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("⚠️  WARNING: Supabase environment variables not set!")
    print("   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    # Create empty client (will fail on DB operations)
    supabase = None
else:
    supabase = create_client(supabase_url, supabase_key)

# Security
security = HTTPBearer()

# Pydantic models
class UserCreate(BaseModel):
    phone: str
    name: str
    role: str  # "farmer", "manager", "officer"
    language: str = "en"

class UserLogin(BaseModel):
    phone: str
    otp: str

class ScanResult(BaseModel):
    user_id: str
    farm_id: str
    image_url: str
    disease_class: str
    confidence: float
    severity: str
    gps_lat: float
    gps_lng: float

class SprayPlan(BaseModel):
    farm_id: str
    scan_results: List[ScanResult]
    waypoints: List[dict]
    total_dosage: float

# Health check
@app.get("/")
async def root():
    return {"message": "AgroShield API is running"}

# Auth endpoints
@app.post("/auth/register")
async def register_user(user: UserCreate):
    """Register a new user with phone number"""
    try:
        # Generate and send OTP (simplified)
        response = supabase.auth.sign_up({
            "phone": user.phone,
            "password": "temp_password",  # Will be replaced with OTP
        })
        
        if response.user:
            # Store additional user data in profiles table
            supabase.table("profiles").insert({
                "id": response.user.id,
                "name": user.name,
                "role": user.role,
                "language": user.language,
                "phone": user.phone
            }).execute()
            
            return {"message": "User registered successfully", "user_id": response.user.id}
        else:
            raise HTTPException(status_code=400, detail="Registration failed")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/verify-otp")
async def verify_otp(login_data: UserLogin):
    """Verify OTP and authenticate user"""
    try:
        # Verify OTP with Supabase Auth
        response = supabase.auth.verify_otp({
            "phone": login_data.phone,
            "token": login_data.otp,
            "type": "sms"
        })
        
        if response.user:
            return {"access_token": response.session.access_token, "user": response.user}
        else:
            raise HTTPException(status_code=401, detail="Invalid OTP")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Profile endpoints
@app.get("/farmer/{user_id}/profile")
async def get_farmer_profile(user_id: str):
    """Get farmer profile information"""
    try:
        response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=404, detail="Profile not found")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Scan endpoints
@app.post("/scan/upload")
async def upload_scan(
    file: UploadFile = File(...),
    user_id: str = "",
    farm_id: str = "",
    gps_lat: float = 0.0,
    gps_lng: float = 0.0
):
    """Upload image for disease detection"""
    try:
        # Read file content
        file_content = await file.read()
        
        # Run AI inference
        ai_result = detection_service.predict(file_content)
        
        # Upload image to Supabase Storage
        file_path = f"scans/{user_id}/{farm_id}/{file.filename}"
        
        storage_response = supabase.storage.from_("scan-images").upload(
            file_path, file_content
        )
        
        if storage_response:
            # Get public URL
            image_url = supabase.storage.from_("scan-images").get_public_url(file_path)
            
            # Save scan result to database
            scan_data = {
                "user_id": user_id,
                "farm_id": farm_id,
                "image_url": image_url,
                "disease_class": ai_result["disease_class"],
                "confidence": ai_result["confidence"],
                "severity": ai_result["severity"],
                "gps_lat": gps_lat,
                "gps_lng": gps_lng,
                "ai_model_version": "yolov8n_v1.0"
            }
            
            db_response = supabase.table("scans").insert(scan_data).execute()
            
            return {
                "scan_id": db_response.data[0]["id"],
                "result": ai_result,
                "image_url": image_url,
                "disease_info": detection_service.get_disease_info(ai_result["disease_class"])
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to upload image")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/scan/{farm_id}/history")
async def get_scan_history(farm_id: str):
    """Get scan history for a farm"""
    try:
        response = supabase.table("scans").select("*").eq("farm_id", farm_id).order("created_at", desc=True).execute()
        
        return {"scans": response.data}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Heatmap endpoint
@app.get("/heatmap/{farm_id}")
async def get_infection_heatmap(farm_id: str):
    """Get infection heatmap data for a farm"""
    try:
        # Get all scans for the farm
        scans_response = supabase.table("scans").select("*").eq("farm_id", farm_id).execute()
        
        # Convert to GeoJSON format for heatmap
        features = []
        for scan in scans_response.data:
            if scan["gps_lat"] and scan["gps_lng"]:
                # Color based on severity
                severity_colors = {
                    "mild": "#90EE90",      # Light green
                    "moderate": "#FFD700",  # Gold  
                    "severe": "#FF6347"     # Tomato red
                }
                
                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [scan["gps_lng"], scan["gps_lat"]]
                    },
                    "properties": {
                        "disease": scan["disease_class"],
                        "confidence": scan["confidence"],
                        "severity": scan["severity"],
                        "color": severity_colors.get(scan["severity"], "#808080"),
                        "timestamp": scan["created_at"]
                    }
                }
                features.append(feature)
        
        heatmap_data = {
            "type": "FeatureCollection",
            "features": features
        }
        
        return heatmap_data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Spray plan endpoints
@app.post("/spray/plan")
async def generate_spray_plan(plan_data: SprayPlan):
    """Generate spray action plan"""
    try:
        # Calculate waypoints and dosage based on scan results
        waypoints = []
        total_dosage = 0.0
        
        for scan in plan_data.scan_results:
            if scan.severity == "mild":
                dosage = 0.3  # 30% of standard dose
            elif scan.severity == "moderate":
                dosage = 0.65  # 65% of standard dose
            else:  # severe
                dosage = 1.0  # 100% of standard dose
            
            waypoint = {
                "lat": scan.gps_lat,
                "lng": scan.gps_lng,
                "dosage": dosage,
                "disease": scan.disease_class
            }
            waypoints.append(waypoint)
            total_dosage += dosage
        
        # Save spray plan
        spray_plan = {
            "farm_id": plan_data.farm_id,
            "waypoints": waypoints,
            "total_dosage": total_dosage,
            "status": "pending"
        }
        
        response = supabase.table("spray_plans").insert(spray_plan).execute()
        
        return {
            "plan_id": response.data[0]["id"],
            "waypoints": waypoints,
            "total_dosage": total_dosage,
            "estimated_time": len(waypoints) * 2  # 2 minutes per waypoint
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/spray/execute/{plan_id}")
async def execute_spray_plan(plan_id: str):
    """Dispatch spray plan to drone"""
    try:
        # Get spray plan
        plan_response = supabase.table("spray_plans").select("*").eq("id", plan_id).execute()
        
        if not plan_response.data:
            raise HTTPException(status_code=404, detail="Spray plan not found")
        
        plan = plan_response.data[0]
        
        # Update status to executing
        supabase.table("spray_plans").update({"status": "executing"}).eq("id", plan_id).execute()
        
        # TODO: Integrate with drone API (DJI SDK or MAVLink)
        # For now, simulate drone execution
        
        # Create spray log
        spray_log = {
            "plan_id": plan_id,
            "status": "in_progress",
            "started_at": "now()"
        }
        
        log_response = supabase.table("spray_logs").insert(spray_log).execute()
        
        return {
            "message": "Spray plan dispatched to drone",
            "log_id": log_response.data[0]["id"],
            "estimated_completion": "30 minutes"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Analytics endpoint
@app.get("/analytics/{farm_id}")
async def get_farm_analytics(farm_id: str):
    """Get farm analytics data"""
    try:
        # Get scan statistics
        scans_response = supabase.table("scans").select("*").eq("farm_id", farm_id).execute()
        scans = scans_response.data
        
        # Calculate metrics
        total_scans = len(scans)
        disease_counts = {}
        severity_counts = {"mild": 0, "moderate": 0, "severe": 0}
        
        for scan in scans:
            disease = scan["disease_class"]
            disease_counts[disease] = disease_counts.get(disease, 0) + 1
            severity_counts[scan["severity"]] += 1
        
        # Get spray data
        spray_response = supabase.table("spray_logs").select("*").eq("farm_id", farm_id).execute()
        spray_logs = spray_response.data
        
        total_sprays = len(spray_logs)
        pesticide_saved = total_scans * 0.4  # Assuming 40% reduction
        
        analytics = {
            "total_scans": total_scans,
            "disease_breakdown": disease_counts,
            "severity_breakdown": severity_counts,
            "total_sprays": total_sprays,
            "pesticide_reduction_percent": 40,
            "estimated_cost_savings": pesticide_saved * 100,  # ₹100 per unit saved
            "health_score": calculate_health_score(severity_counts)
        }
        
        return analytics
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def calculate_health_score(severity_counts):
    """Calculate farm health score based on disease severity"""
    total = sum(severity_counts.values())
    if total == 0:
        return 100
    
    # Weight severity: mild=0.2, moderate=0.5, severe=1.0
    weighted_score = (
        severity_counts["mild"] * 0.2 +
        severity_counts["moderate"] * 0.5 +
        severity_counts["severe"] * 1.0
    )
    
    health_score = max(0, 100 - (weighted_score / total) * 100)
    return round(health_score, 1)

@app.get("/disease/info/{disease_class}")
async def get_disease_information(disease_class: str):
    """Get detailed information about a specific disease"""
    try:
        disease_info = detection_service.get_disease_info(disease_class)
        return disease_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        initialize_ai_service()
        print("✅ AI Service initialized")
    except Exception as e:
        print(f"⚠️  AI Service warning: {e}")
        print("   App will continue without AI model")

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    # Check if AI is loaded
    ai_status = "loaded" if (detection_service and detection_service.model) else "not_loaded"
    supabase_status = "connected" if supabase else "not_configured"
    
    return {
        "status": "healthy",
        "service": "AgroShield API",
        "ai_loaded": ai_status,
        "supabase": supabase_status,
        "timestamp": int(__import__('time').time())
    }

if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting AgroShield API on port {PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
