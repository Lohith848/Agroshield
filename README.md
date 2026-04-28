# AgroShield - AI-Powered Precision Crop Protection Platform

AgroShield brings AI-powered precision agriculture to every farmer, combining YOLOv8-based plant disease detection with real-time GPS mapping, drone integration, and comprehensive analytics.

## 🌱 Features

- **AI Disease Detection**: YOLOv8-powered plant disease identification with 92%+ accuracy
- **Precision Spraying**: Targeted pesticide application based on GPS coordinates
- **Real-time Analytics**: Farm health monitoring and cost savings tracking
- **Multi-language Support**: Tamil, Telugu, Hindi, Kannada, and English
- **Offline Mode**: Continue scanning without internet connectivity
- **Drone Integration**: Automated spraying with MAVLink/DJI SDK support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.9+
- Supabase account
- Google Maps API key

### Frontend Setup

```bash
cd agroshield-frontend
npm install
cp env.example .env.local
# Configure your environment variables
npm run dev
```

### Backend Setup

```bash
cd agroshield-backend
pip install -r requirements.txt
cp .env.example .env
# Configure your environment variables
uvicorn main:app --reload
```

### Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase_schema.sql`
3. Configure authentication providers (phone OTP)

## 🏗️ Architecture

### Frontend (Next.js 14)
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Authentication**: Supabase Auth with OTP
- **State Management**: React hooks
- **Maps**: Google Maps API + Leaflet.js

### Backend (Python FastAPI)
- **AI Engine**: YOLOv8 + ONNX Runtime
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Notifications**: Firebase FCM + WhatsApp API

### AI Model
- **Base Model**: YOLOv8n trained on PlantVillage dataset
- **Classes**: 38 disease types across multiple crops
- **Performance**: <3s inference time on mobile devices
- **Optimization**: ONNX for edge deployment

## 📱 User Roles

### Farmer
- Camera-based disease scanning
- Field management and mapping
- Spray plan approval
- Cost tracking

### Manager
- Multi-farm oversight
- Regional analytics
- Alert broadcasting
- Bulk reporting

### Officer
- Regional disease monitoring
- Trend analysis
- Exportable reports
- Policy insights

## 🔧 API Endpoints

### Authentication
- `POST /auth/register` - User registration with OTP
- `POST /auth/verify-otp` - OTP verification

### Scanning
- `POST /scan/upload` - Upload image for AI analysis
- `GET /scan/{farm_id}/history` - Scan history

### Analytics
- `GET /analytics/{farm_id}` - Farm analytics
- `GET /heatmap/{farm_id}` - Infection heatmap

### Spray Operations
- `POST /spray/plan` - Generate spray plan
- `POST /spray/execute/{plan_id}` - Dispatch to drone

## 🌍 Supported Crops

- Tomato (Early Blight, Late Blight, Leaf Curl)
- Chili (Leaf Curl, Mosaic)
- Wheat (Rust, Blight)
- Rice (Blast, Brown Spot)
- Cotton (Leaf Blight, Bollworm)
- Sugarcane (Mosaic, Red Rot)
- Maize (Rough Dwarf, Streak)

## 📊 Key Metrics

- **Detection Accuracy**: ≥92% mAP
- **Processing Time**: ≤3 seconds
- **Pesticide Reduction**: ≥40%
- **Cost Savings**: ₹8,000/season/farmer
- **Health Score**: Real-time farm health monitoring

## 🛠️ Development

### Project Structure
```
agroshield-frontend/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── scan/           # Scanning components
│   │   └── ui/             # shadcn/ui components
│   └── lib/                # Utilities and configurations

agroshield-backend/
├── main.py                 # FastAPI application
├── ai_service.py          # AI inference service
├── requirements.txt       # Python dependencies
└── supabase_schema.sql   # Database schema
```

### Environment Variables

#### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key
```

#### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MODEL_PATH=./models/yolov8n.pt
ONNX_MODEL_PATH=./models/yolov8n.onnx
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
vercel --prod
```

### Backend (Koyeb/Heroku)
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Basic AI detection
- ✅ User authentication
- ✅ Dashboard interface
- ✅ Camera scanning

### Phase 2 (Next)
- 🔄 Drone integration
- 🔄 Real-time heatmap
- 🔄 Offline sync
- 🔄 Multi-farm view

### Phase 3 (Future)
- 📋 Weather integration
- 📋 AI recommendations
- 📋 Voice interface
- 📋 Mobile apps

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🌟 Impact

AgroShield aims to:
- Reduce pesticide usage by 40% per acre
- Save farmers ₹8,000 per season
- Eliminate farmer health risks from chemical exposure
- Increase crop yields through early disease detection
- Promote sustainable farming practices

---
Built by Lohith G
*AgroShield — Precision Agriculture. Less Chemical. More Crop. Safer Farmers.*
