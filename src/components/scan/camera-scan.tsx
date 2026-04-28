"use client"

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Camera, 
  Upload, 
  MapPin, 
  Leaf, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  X,
  RotateCcw
} from 'lucide-react'

interface CameraScanProps {
  user: any
  onScanComplete: (result: any) => void
}

export function CameraScan({ user, onScanComplete }: CameraScanProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<any>(null)
  const [selectedFarm, setSelectedFarm] = useState<string>('')
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Mock farms data - in real app this would come from database
  const farms = [
    { id: '1', name: 'Tomato Field A', crop: 'Tomato', area: '2.5 acres' },
    { id: '2', name: 'Chili Field B', crop: 'Chili', area: '1.8 acres' },
    { id: '3', name: 'Mixed Crop Field C', crop: 'Mixed', area: '3.2 acres' }
  ]

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
      
      setIsScanning(true)
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageData)
        stopCamera()
        
        // Get GPS location
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
          console.error('Error getting location:', error)
          // Continue without GPS
        }
      )
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setScanResult(null)
    setGpsLocation(null)
    startCamera()
  }

  const uploadScan = async () => {
    if (!capturedImage || !selectedFarm) {
      alert('Please select a farm and capture an image')
      return
    }

    setIsUploading(true)

    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage)
      const blob = await response.blob()
      const file = new File([blob], 'scan.jpg', { type: 'image/jpeg' })

      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', user.id)
      formData.append('farm_id', selectedFarm)
      if (gpsLocation) {
        formData.append('gps_lat', gpsLocation.lat.toString())
        formData.append('gps_lng', gpsLocation.lng.toString())
      }

      // Upload to backend
      const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan/upload`, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Upload failed')
      }

      const result = await uploadResponse.json()
      setScanResult(result)
      onScanComplete(result)

    } catch (error) {
      console.error('Error uploading scan:', error)
      alert('Failed to upload scan. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'mild': return 'bg-yellow-100 text-yellow-800'
      case 'moderate': return 'bg-orange-100 text-orange-800'
      case 'severe': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDiseaseIcon = (disease: string) => {
    if (disease === 'Healthy' || disease === 'healthy') {
      return <CheckCircle className="w-5 h-5 text-green-600" />
    }
    return <AlertTriangle className="w-5 h-5 text-orange-600" />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Crop Disease Scan</h1>
          <p className="text-gray-600">Capture and analyze crop health with AI-powered detection</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera/Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="w-5 h-5 mr-2" />
                {capturedImage ? 'Review Image' : 'Capture Image'}
              </CardTitle>
              <CardDescription>
                {capturedImage ? 'Review and confirm the scan details' : 'Take a clear photo of the affected plant area'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!capturedImage ? (
                <>
                  {!isScanning ? (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">Click below to start camera</p>
                        <Button onClick={startCamera} className="bg-green-600 hover:bg-green-700">
                          <Camera className="w-4 h-4 mr-2" />
                          Start Camera
                        </Button>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-500">or</p>
                        <Button variant="outline" className="mt-2">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload from Gallery
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-lg"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      
                      <div className="flex space-x-3">
                        <Button onClick={capturePhoto} className="flex-1 bg-green-600 hover:bg-green-700">
                          <Camera className="w-4 h-4 mr-2" />
                          Capture Photo
                        </Button>
                        <Button onClick={stopCamera} variant="outline">
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <img 
                    src={capturedImage} 
                    alt="Captured scan" 
                    className="w-full rounded-lg"
                  />
                  
                  <div className="flex space-x-3">
                    <Button onClick={retakePhoto} variant="outline">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retake
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scan Details & Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Leaf className="w-5 h-5 mr-2" />
                Scan Details
              </CardTitle>
              <CardDescription>
                Configure scan parameters and view results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Farm Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Farm</label>
                <Select value={selectedFarm} onValueChange={setSelectedFarm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a farm" />
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

              {/* GPS Location */}
              {gpsLocation && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    GPS Location
                  </label>
                  <div className="text-sm text-gray-600">
                    {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
                  </div>
                </div>
              )}

              {/* Scan Results */}
              {scanResult ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Detection Results</h3>
                      {getDiseaseIcon(scanResult.result.disease_class)}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Disease:</span>
                        <span className="text-sm font-medium">{scanResult.result.disease_class.replace('_', ' ')}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Confidence:</span>
                        <span className="text-sm font-medium">{(scanResult.result.confidence * 100).toFixed(1)}%</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Severity:</span>
                        <Badge className={getSeverityColor(scanResult.result.severity)}>
                          {scanResult.result.severity}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      ✅ Scan completed successfully! Results have been saved to your farm records.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Leaf className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Results will appear here after scanning</p>
                </div>
              )}

              {/* Upload Button */}
              {capturedImage && !scanResult && (
                <Button 
                  onClick={uploadScan} 
                  disabled={!selectedFarm || isUploading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Leaf className="w-4 h-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
