from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import List, Optional
import os
import base64
import json
import re
from dotenv import load_dotenv
from supabase import create_client, Client
import uvicorn
import requests
from ai_service import detection_service, initialize_ai_service
from google.generativeai import configure, GenerativeModel

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

# Gemini AI Crop Analysis Endpoint
@app.post("/analyze-crop")
async def analyze_crop_image(request: dict):
    """
    Analyze crop image using Google Gemini AI
    
    Expected JSON body:
    {
        "imageBase64": "base64 encoded image string",
        "mimeType": "image/jpeg",
        "fieldName": "Field name (optional)",
        "cropType": "Crop type (optional)"
    }
    """
    try:
        imageBase64 = request.get("imageBase64")
        mimeType = request.get("mimeType", "image/jpeg")
        fieldName = request.get("fieldName", "")
        cropType = request.get("cropType", "")
        
        if not imageBase64:
            raise HTTPException(status_code=400, detail="No image provided")
        
        if len(imageBase64) < 100:
            raise HTTPException(status_code=400, detail="Image too small or corrupted")
        
        apiKey = os.getenv("GEMINI_API_KEY")
        if not apiKey:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")
        
        validMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"]
        finalMimeType = mimeType if mimeType in validMimeTypes else "image/jpeg"
        
        print(f"📸 Analysis request: {fieldName or 'Unknown'}, {cropType or 'Auto-detect'}, size: {round(len(imageBase64) * 0.75 / 1024)} KB")
        
        configure(api_key=apiKey)
        model = GenerativeModel(
            "gemini-2.0-flash",
            generationConfig={
                "temperature": 0.1,
                "topK": 32,
                "topP": 1,
                "maxOutputTokens": 1024,
            }
        )
        
        prompt = f"""You are an expert agricultural plant pathologist AI specialized in Indian crops. Analyze this crop image carefully.

Context:
- Field Name: {fieldName or "Not specified"}
- Crop Type: {cropType or "Auto-detect from image"}
- Location: India

IMPORTANT: Respond ONLY with a valid JSON object. No markdown. No backticks. No explanation. Start with {{ and end with }}.

Required JSON structure:
{{
  "cropType": "crop name",
  "isHealthy": true or false,
  "disease": "disease name or null",
  "pestDetected": "pest name or null",
  "severity": "healthy" | "mild" | "moderate" | "severe",
  "confidence": 0-100,
  "affectedAreaPercent": 0-100,
  "cause": "fungal" | "bacterial" | "viral" | "pest" | "nutrient_deficiency" | "unknown",
  "symptoms": ["string"],
  "treatment": {{
    "chemical": "specific chemical name",
    "dosage": "dosage per acre",
    "applicationMethod": "spray/soil drench/foliar",
    "frequency": "how often"
  }},
  "organicAlternative": "organic treatment or null",
  "urgency": "immediate" | "within_3_days" | "within_a_week" | "monitor_only",
  "spreadRisk": "high" | "medium" | "low",
  "estimatedYieldLoss": "percentage",
  "preventionTips": ["tip1", "tip2", "tip3"],
  "nextScanRecommended": "when to scan again"
}}"""
        
        print("🤖 Sending to Gemini...")
        
        result = await model.generate_content_async([
            {"text": prompt},
            {
                "inline_data": {
                    "mimeType": finalMimeType,
                    "data": imageBase64
                }
            }
        ])
        
        responseText = result.text
        print(f"📥 Response received: {len(responseText)} chars")
        
        # Clean and extract JSON
        cleaned = re.sub(r'```json\n?', '', responseText)
        cleaned = re.sub(r'```\n?', '', cleaned)
        cleaned = cleaned.strip()
        
        jsonStart = cleaned.find("{")
        jsonEnd = cleaned.rfind("}")
        
        if jsonStart == -1 or jsonEnd == -1:
            raise HTTPException(status_code=500, detail="AI returned invalid format")
        
        cleaned = cleaned[jsonStart:jsonEnd + 1]
        analysis = json.loads(cleaned)
        
        # Defaults
        if analysis.get("confidence") is None:
            analysis["confidence"] = 70
        if not analysis.get("severity"):
            analysis["severity"] = "unknown"
        if "isHealthy" not in analysis:
            analysis["isHealthy"] = not bool(analysis.get("disease"))
        
        print(f"✅ Analysis: {analysis.get('cropType')}, {analysis.get('disease')}, severity: {analysis.get('severity')}")
        
        return {"success": True, "analysis": analysis}
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        raise HTTPException(status_code=500, detail=f"AI response parsing failed: {str(e)}")
    except Exception as e:
        print(f"❌ Gemini API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# Weather API Endpoint
@app.get("/weather/current")
async def get_current_weather(lat: Optional[float] = None, lon: Optional[float] = None, city: Optional[str] = None):
    """Get current weather data using OpenWeather API"""
    try:
        api_key = os.getenv("OPENWEATHER_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenWeather API key not configured")

        if lat and lon:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        elif city:
            url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
        else:
            # Default to user's location from profile or Tamil Nadu center
            url = f"https://api.openweathermap.org/data/2.5/weather?lat=11.1271&lon=78.6569&appid={api_key}&units=metric"

        response = requests.get(url)
        if not response.ok:
            raise HTTPException(status_code=response.status_code, detail="Weather API error")

        data = response.json()
        return {
            "temperature": round(data["main"]["temp"]),
            "humidity": data["main"]["humidity"],
            "description": data["weather"][0]["description"],
            "wind_speed": data["wind"]["speed"],
            "pressure": data["main"]["pressure"],
            "feels_like": round(data["main"]["feels_like"]),
            "icon": data["weather"][0]["icon"],
            "location": data.get("name", "Unknown"),
            "country": data.get("sys", {}).get("country", ""),
            "timestamp": data["dt"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Soil Moisture API Endpoint
@app.get("/soil/moisture")
async def get_soil_moisture(polyid: str):
    """Get soil moisture data from AgroMonitoring API"""
    try:
        api_key = os.getenv("AGROMONITORING_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AgroMonitoring API key not configured")

        url = f"https://api.agromonitoring.com/agro/1.0/soil?polyid={polyid}&appid={api_key}"
        response = requests.get(url)
        
        if not response.ok:
            raise HTTPException(status_code=response.status_code, detail="Soil API error")

        data = response.json()
        return {
            "timestamp": data.get("dt"),
            "temperature_10cm": kelvin_to_celsius(data.get("t10")),
            "temperature_surface": kelvin_to_celsius(data.get("t0")),
            "moisture": data.get("moisture"),
            "unit": "m3/m3"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def kelvin_to_celsius(kelvin: float) -> float:
    """Convert Kelvin to Celsius"""
    return round(kelvin - 273.15, 2)

# Agricultural News API Endpoint
@app.get("/news/agriculture")
async def get_agricultural_news(limit: int = 5):
    """Get latest agricultural news from NewsAPI"""
    try:
        api_key = os.getenv("NEWS_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="News API key not configured")

        # Search for agriculture, farming, crop related news
        query = "agriculture OR farming OR crops OR weather OR soil OR irrigation OR pesticides OR harvest"
        url = f"https://newsapi.org/v2/everything?q={query}&language=en&sortBy=publishedAt&pageSize={limit}&apiKey={api_key}"

        response = requests.get(url)
        if not response.ok:
            raise HTTPException(status_code=response.status_code, detail="News API error")

        data = response.json()
        articles = []
        
        for article in data.get("articles", []):
            articles.append({
                "title": article.get("title"),
                "description": article.get("description"),
                "url": article.get("url"),
                "imageUrl": article.get("urlToImage", ""),
                "publishedAt": article.get("publishedAt"),
                "source": article.get("source", {}).get("name", "News")
            })

        return {"articles": articles, "total": len(articles)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# User location-based weather (from stored user profile)
@app.get("/weather/user")
async def get_user_weather(user_id: str):
    """Get weather for user's farm location"""
    try:
        # Get user's farm location from database
        farms_response = supabase.table("farms").select("*").eq("owner_id", user_id).execute()
        
        if not farms_response.data:
            # Default to Tamil Nadu center
            return await get_current_weather(lat=11.1271, lon=78.6569)
        
        # Use first farm's coordinates
        farm = farms_response.data[0]
        lat = farm.get("location_lat") or 11.1271
        lng = farm.get("location_lng") or 78.6569
        
        return await get_current_weather(lat=lat, lon=lng)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan/analyze-groq")
async def analyze_scan_groq(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    farm_id: str = Form(...),
    gps_lat: float = Form(0.0),
    gps_lng: float = Form(0.0)
):
    """Analyze crop image using Groq AI (vision model)"""
    try:
        # Read image
        image_bytes = await file.read()
        
        # Convert to base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Get Groq API key
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise HTTPException(status_code=500, detail="Groq API key not configured")
        
        # Prepare Groq API request (using Llama 3.2 90B Vision)
        groq_url = "https://api.groq.com/openai/v1/chat/completions"
        
        prompt = """Analyze this crop image and identify:
1. Plant type (e.g., tomato, chili, wheat, rice, cotton, sugarcane, maize)
2. Disease or pest infestation (if any)
3. Severity level (healthy, mild, moderate, severe)
4. Specific disease name (e.g., Early Blight, Late Blight, Leaf Curl, Powdery Mildew, Rust)
5. Confidence score (0-1)

Respond in JSON format:
{
  "disease_class": "disease_name_or_Healthy",
  "confidence": 0.95,
  "severity": "healthy|mild|moderate|severe",
  "plant_type": "crop_name",
  "description": "brief description of findings"
}"""
        
        payload = {
            "model": "meta-llama/llama-3.2-90b-vision-preview",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500,
            "temperature": 0.3,
            "top_p": 0.9
        }
        
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(groq_url, json=payload, headers=headers, timeout=30)
        
        if not response.ok:
            error_detail = response.json().get("error", {}).get("message", "Unknown error")
            raise HTTPException(status_code=response.status_code, detail=f"Groq API error: {error_detail}")
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        # Parse JSON from response
        try:
            # Extract JSON from the content (it might be wrapped in markdown)
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                analysis = json.loads(json_str)
            else:
                # Fallback: try to parse entire content
                analysis = json.loads(content)
        except json.JSONDecodeError:
            # If not JSON, create a fallback result
            analysis = {
                "disease_class": "Unknown",
                "confidence": 0.5,
                "severity": "moderate",
                "plant_type": "Unknown",
                "description": content[:200]
            }
        
        # Upload image to Supabase Storage (optional)
        image_url = None
        try:
            file_path = f"scans/{user_id}/{farm_id}/{file.filename}"
            storage_response = supabase.storage.from_("scan-images").upload(
                file_path, image_bytes
            )
            
            if storage_response:
                image_url = supabase.storage.from_("scan-images").get_public_url(file_path)
        except Exception as storage_error:
            print(f"Storage error: {storage_error}")
            # Continue without storage
        
        # Save scan result to database
        scan_data = {
            "user_id": user_id,
            "farm_id": farm_id,
            "image_url": image_url or "",
            "disease_class": analysis.get("disease_class", "Unknown"),
            "confidence": analysis.get("confidence", 0.5),
            "severity": analysis.get("severity", "moderate"),
            "gps_lat": gps_lat,
            "gps_lng": gps_lng,
            "ai_model_version": "groq-llama-3.2-90b-vision",
            "analysis_description": analysis.get("description", "")
        }
        
        db_response = supabase.table("scans").insert(scan_data).execute()
        
        return {
            "scan_id": db_response.data[0]["id"] if db_response.data else None,
            "result": analysis,
            "image_url": image_url,
            "disease_info": detection_service.get_disease_info(analysis.get("disease_class", "Unknown"))
        }
        
    except Exception as e:
        print(f"Groq analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting AgroShield API on port {PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
