"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Camera,
  Upload,
  MapPin,
  Leaf,
  CheckCircle,
  Loader2,
  X,
  RotateCcw,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface CameraScanProps {
  user: any
  onScanComplete: (result: any) => void
  onClose?: () => void
}

export function CameraScan({ user, onScanComplete, onClose }: CameraScanProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<any>(null)
  const [selectedFarm, setSelectedFarm] = useState<string>('')
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mock farms data
  const farms = [
    { id: '1', name: 'Tomato Field A', crop: 'Tomato', area: '2.5 acres' },
    { id: '2', name: 'Chili Field B', crop: 'Chili', area: '1.8 acres' },
    { id: '3', name: 'Mixed Crop Field C', crop: 'Mixed', area: '3.2 acres' }
  ]

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve({ base64, mimeType: file.type || 'image/jpeg' })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Capture from camera
  const captureFromCamera = (): { base64: string; mimeType: string } => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      throw new Error('Camera or canvas not available')
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas context not available')
    }
    
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    const base64 = dataUrl.split(',')[1]
    return { base64, mimeType: 'image/jpeg' }
  }

  const startCamera = async () => {
    try {
      const video = videoRef.current
      if (video?.srcObject instanceof MediaStream) {
        video.srcObject.getTracks().forEach(t => t.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      if (!video) return

      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      video.muted = true
      video.play()

      setIsScanning(true)
    } catch (err) {
      console.error('Camera error:', err)
      setIsScanning(false)
    }
  }

  useEffect(() => {
    startCamera()

    return () => {
      const video = videoRef.current
      if (video?.srcObject instanceof MediaStream) {
        video.srcObject.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const stopCamera = () => {
    const video = videoRef.current
    if (video?.srcObject instanceof MediaStream) {
      video.srcObject.getTracks().forEach(t => t.stop())
    }
    setIsScanning(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setCapturedImage(dataUrl)
        setCapturedFile(null)
        stopCamera()
        getCurrentLocation()
      }
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('GPS error:', error)
        },
        { timeout: 5000 }
      )
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setCapturedFile(null)
    setScanResult(null)
    setGpsLocation(null)
    setAnalysisError(null)
    startCamera()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCapturedFile(file)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const result = e.target?.result as string
      setCapturedImage(result)
      stopCamera()
      getCurrentLocation()
    }
    reader.readAsDataURL(file)
  }

  const analyzeImage = async () => {
    if (!selectedFarm) {
      setAnalysisError('Please select a field first')
      return
    }

    let imageData: { base64: string; mimeType: string } | null = null

    try {
      if (capturedFile) {
        // File upload
        imageData = await fileToBase64(capturedFile)
      } else if (capturedImage) {
        // Camera capture (already in data URL format)
        imageData = {
          base64: capturedImage.split(',')[1],
          mimeType: 'image/jpeg'
        }
      } else {
        setAnalysisError('No image captured. Please take a photo or upload one.')
        return
      }

      // Validate base64
      if (!imageData.base64 || imageData.base64.length < 100) {
        setAnalysisError('Image conversion failed. Please try again.')
        return
      }

      console.log('📤 Sending to API:')
      console.log('   Base64 length:', imageData.base64.length)
      console.log('   MIME:', imageData.mimeType)

      setIsUploading(true)
      setAnalysisError(null)

      const response = await fetch('/api/analyze-crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mimeType: imageData.mimeType,
          fieldName: farms.find(f => f.id === selectedFarm)?.name,
          cropType: farms.find(f => f.id === selectedFarm)?.crop
        })
      })

      const data = await response.json()

      if (data.success && data.analysis) {
        const analysis = data.analysis

        // Save scan to Supabase
        const { error: scanError } = await supabase!
          .from('scans')
          .insert({
            user_id: user.id,
            farm_id: selectedFarm,
            image_url: capturedImage || '',
            disease_class: analysis.disease || (analysis.isHealthy ? 'healthy' : 'unknown'),
            confidence: analysis.confidence / 100,
            severity: analysis.severity,
            gps_lat: gpsLocation?.lat || null,
            gps_lng: gpsLocation?.lng || null,
            scan_method: capturedFile ? 'gallery' : 'manual',
            ai_model_version: 'gemini-2.0-flash',
            processing_time_ms: null,
            is_verified: false,
            verified_by: null,
            notes: null
          })

        if (scanError) console.error('Scan save error:', scanError)

        // Also save to heatmap_points
        if (gpsLocation) {
          const { error: heatmapError } = await supabase!
            .from('heatmap_points')
            .insert({
              user_id: user.id,
              farm_id: selectedFarm,
              lat: gpsLocation.lat,
              lng: gpsLocation.lng,
              severity: analysis.severity,
              disease: analysis.disease,
              crop_type: analysis.cropType,
              confidence: analysis.confidence,
              spread_risk: analysis.spreadRisk,
              timestamp: new Date().toISOString()
            })
          if (heatmapError) console.error('Heatmap save error:', heatmapError)
        }

        setScanResult(analysis)
        onScanComplete({ result: analysis, image_url: capturedImage })
       } else {
         console.error('API error response:', data)
         const errorMsg = data.hint || data.details || data.error || 'Analysis failed'
         setAnalysisError(`Analysis failed: ${errorMsg}`)
       }
     } catch (err: any) {
      console.error('Frontend analyze error:', err)
      setAnalysisError(`Network error: ${err.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleShare = async (result: any) => {
    const text = `🌿 AgroShield Scan Result\n\n` +
      `Crop: ${result.cropType}\n` +
      `Disease: ${result.disease || "Healthy"}\n` +
      `Severity: ${result.severity?.toUpperCase()}\n` +
      `Confidence: ${result.confidence}%\n` +
      `Urgency: ${result.urgency?.replace(/_/g, ' ')}\n\n` +
      `Treatment: ${result.treatment?.chemical || "None needed"}\n` +
      `Dosage: ${result.treatment?.dosage || "N/A"}\n\n` +
      `Scanned via AgroShield AI — agroshield-ai.vercel.app`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'AgroShield Scan', text })
      } catch (shareErr) {
        console.log('Share cancelled')
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
      window.open(whatsappUrl, '_blank')
    }
  }

  const getUrgencyLabel = (urgency: string) => {
    const labels: Record<string, string> = {
      immediate: '⚠️ Act Today',
      within_3_days: '⏰ Within 3 Days',
      within_a_week: '📅 Within a Week',
      monitor_only: '👀 Monitor Only'
    }
    return labels[urgency || 'monitor_only'] || urgency
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'healthy': return '#16a34a'
      case 'mild': return '#ca8a04'
      case 'moderate': return '#ea580c'
      case 'severe': return '#dc2626'
      default: return '#6b7280'
    }
  }

  const LoadingAnalysis = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 20px',
      background: '#f0fdf4',
      borderRadius: '12px'
    }}>
      <div style={{
        fontSize: '48px',
        animation: 'spin 2s linear infinite',
        marginBottom: '16px'
      }}>🌿</div>
      <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '8px' }}>
        Analyzing your crop...
      </div>
      <div style={{ fontSize: '13px', color: '#166534', textAlign: 'center', lineHeight: '1.8' }}>
        ✓ Scanning for diseases<br/>
        ✓ Checking pest activity<br/>
        ✓ Generating treatment plan
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
            <span className="text-white font-bold text-xs">AS</span>
          </div>
          <h2 className="text-lg font-semibold">Crop Disease Scan</h2>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-gray-800">
            <X className="w-5 h-5" />
            Close
          </Button>
        )}
      </div>

      <div className="flex-1 relative flex flex-col">
        {!capturedImage ? (
          <>
            {/* Camera Preview */}
            <div className="flex-1 relative bg-gray-900">
              {isScanning ? (
                <div style={{ position: 'relative', width: '100%', height: '60vh', overflow: 'hidden', background: '#000' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      background: '#000'
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white px-4">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg">Camera is starting...</p>
                    <p className="text-sm text-gray-400 mt-2">Please allow camera access</p>
                    <Button onClick={startCamera} className="mt-4 bg-green-600 hover:bg-green-700">
                      Start Camera
                    </Button>
                  </div>
                </div>
              )}

              {/* Capture Button */}
              {isScanning && (
                <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
                  <div className="flex items-center space-x-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-gray-800 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-6 h-6" />
                    </Button>

                    <button
                      onClick={capturePhoto}
                      className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                    >
                      <div className="w-16 h-16 rounded-full bg-white"></div>
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-gray-800 rounded-full"
                      onClick={() => alert('Camera toggle coming soon!')}
                    >
                      <RotateCcw className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Top Info */}
              {isScanning && (
                <div className="absolute top-4 left-4 right-4">
                  <div className="bg-black bg-opacity-50 rounded-lg p-3 text-white text-sm">
                    <p>Position crop in frame • Tap capture when ready</p>
                  </div>
                </div>
              )}
            </div>

            {/* Farm Selection & Controls */}
            <div className="bg-gray-100 p-4 border-t" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
              <div className="max-w-md mx-auto space-y-4">
                {/* Farm Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Select Field</label>
                  <Select value={selectedFarm} onValueChange={setSelectedFarm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a field" />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id}>
                          <div>
                            <div className="font-medium">{farm.name}</div>
                            <div className="text-sm text-gray-500">{farm.crop} • {farm.area}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* File Upload */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload from Gallery
                </Button>

                {/* Error Display */}
                {analysisError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#dc2626',
                    fontSize: '14px'
                  }}>
                    ⚠️ {analysisError}
                    <br />
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      Try uploading a clearer image or check your connection.
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button onClick={retakePhoto} variant="outline" className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    onClick={analyzeImage}
                    disabled={!selectedFarm || isUploading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Leaf className="w-4 h-4 mr-2" />
                        Analyze & Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : !scanResult ? (
          <>
            {/* Captured Image Preview */}
            <div className="flex-1 relative bg-black flex items-center justify-center">
              <img src={capturedImage} alt="Captured scan" className="max-w-full max-h-full object-contain" />

              {/* Location Badge */}
              {gpsLocation && (
                <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="bg-gray-100 p-4 border-t" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
              <div className="max-w-md mx-auto space-y-4">
                {/* Farm Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Select Field</label>
                  <Select value={selectedFarm} onValueChange={setSelectedFarm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a field" />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id}>
                          <div>
                            <div className="font-medium">{farm.name}</div>
                            <div className="text-sm text-gray-500">{farm.crop} • {farm.area}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Error Display */}
                {analysisError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#dc2626',
                    fontSize: '14px'
                  }}>
                    ⚠️ {analysisError}
                    <br />
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      Try uploading a clearer image or check your connection.
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button onClick={retakePhoto} variant="outline" className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    onClick={analyzeImage}
                    disabled={!selectedFarm || isUploading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Leaf className="w-4 h-4 mr-2" />
                        Analyze & Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Analysis Results */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="max-w-md mx-auto space-y-4">
                {/* Result Header Card */}
                <div style={{
                  background: '#fff',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '700' }}>
                        {scanResult.cropType}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {scanResult.disease || 'No disease detected'}
                      </div>
                    </div>
                    <div style={{
                      background: getSeverityColor(scanResult.severity),
                      color: '#fff',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '13px',
                      textTransform: 'capitalize'
                    }}>
                      {scanResult.severity}
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      marginBottom: '4px'
                    }}>
                      <span>AI Confidence</span>
                      <span style={{ fontWeight: '700' }}>{scanResult.confidence}%</span>
                    </div>
                    <div style={{
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      height: '8px'
                    }}>
                      <div style={{
                        background: getSeverityColor(scanResult.severity),
                        width: `${scanResult.confidence}%`,
                        height: '100%',
                        borderRadius: '4px',
                        transition: 'width 0.5s'
                      }} />
                    </div>
                  </div>

                  {/* Urgency */}
                  <div style={{
                    background: '#fef9c3',
                    border: '1px solid #fde047',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {getUrgencyLabel(scanResult.urgency)}
                    {scanResult.urgency === 'immediate' &&
                      ` — Spread Risk: ${scanResult.spreadRisk?.toUpperCase()}`}
                  </div>

                  {/* Treatment */}
                  {!scanResult.isHealthy && scanResult.treatment && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '15px' }}>
                        💊 Treatment
                      </div>
                      <div style={{
                        background: '#f0fdf4',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '14px',
                        lineHeight: '1.8'
                      }}>
                        <div><strong>Chemical:</strong> {scanResult.treatment.chemical}</div>
                        <div><strong>Dosage:</strong> {scanResult.treatment.dosage}</div>
                        <div><strong>Method:</strong> {scanResult.treatment.applicationMethod}</div>
                        <div><strong>Frequency:</strong> {scanResult.treatment.frequency}</div>
                      </div>
                      {scanResult.organicAlternative && (
                        <div style={{
                          background: '#ecfdf5',
                          borderRadius: '8px',
                          padding: '10px',
                          marginTop: '8px',
                          fontSize: '13px'
                        }}>
                          🌿 <strong>Organic Option:</strong> {scanResult.organicAlternative}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prevention Tips */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: '700', marginBottom: '8px' }}>
                      🛡️ Prevention Tips
                    </div>
                    {scanResult.preventionTips?.map((tip: string, i: number) => (
                      <div key={i} style={{
                        fontSize: '13px',
                        color: '#374151',
                        padding: '4px 0',
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        {i + 1}. {tip}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleShare(scanResult)}
                      style={{
                        flex: 1,
                        background: '#25D366',
                        color: '#fff',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      📱 Share via WhatsApp
                    </button>
                    <button
                      onClick={async () => {
                        const { generateSprayMapPDF } = await import('@/utils/generateSprayMap')
                        generateSprayMapPDF(
                          scanResult,
                          farms.find(f => f.id === selectedFarm)?.name,
                          user?.displayName || 'Farmer'
                        )
                      }}
                      style={{
                        flex: 1,
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      🗺️ Spray Map PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Close Button */}
            <div className="bg-gray-100 p-4 border-t" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
              <div className="max-w-md mx-auto">
                <Button
                  onClick={() => {
                    if (onClose) onClose()
                  }}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Done
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Canvas (hidden) */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'healthy': return '#16a34a'
    case 'mild': return '#ca8a04'
    case 'moderate': return '#ea580c'
    case 'severe': return '#dc2626'
    default: return '#6b7280'
  }
}