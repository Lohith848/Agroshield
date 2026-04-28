"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
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
  onClose?: () => void
}

export function CameraScan({ user, onScanComplete, onClose }: CameraScanProps) {
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

  // Start camera on component mount
  useEffect(() => {
    startCamera()
    
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      // Request camera with optimal settings
      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: 'environment' } // Prefer back camera
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        // Wait for video to be ready and play
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => {
            console.error('Video play error:', err)
            alert('Camera preview failed. Please check permissions.')
          })
        }
      }
      
      setIsScanning(true)
    } catch (error: any) {
      console.error('Error accessing camera:', error)
      let message = 'Unable to access camera. '
      if (error.name === 'NotAllowedError') {
        message += 'Please allow camera permissions and try again.'
      } else if (error.name === 'NotFoundError') {
        message += 'No camera found on this device.'
      } else if (error.name === 'NotReadableError') {
        message += 'Camera is in use by another application.'
      } else {
        message += error.message || 'Please check permissions.'
      }
      alert(message)
      setIsScanning(false)
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

      // Create form data for Groq endpoint
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', user.id)
      formData.append('farm_id', selectedFarm)
      if (gpsLocation) {
        formData.append('gps_lat', gpsLocation.lat.toString())
        formData.append('gps_lng', gpsLocation.lng.toString())
      }

      // Upload to Groq AI backend
      const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan/analyze-groq`, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Upload failed')
      }

      const result = await uploadResponse.json()
      
      // Handle Groq result format
      const scanResult = {
        result: result.result || result,
        image_url: result.image_url || capturedImage,
        disease_info: result.disease_info,
        scan_id: result.scan_id
      }
      
      setScanResult(scanResult)
      onScanComplete(scanResult)

    } catch (error) {
      console.error('Error analyzing scan:', error)
      alert(`Failed to analyze image: ${error instanceof Error ? error.message : 'Please try again'}`)
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
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white px-4">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg">Camera is starting...</p>
                    <p className="text-sm text-gray-400 mt-2">Please allow camera access</p>
                    <Button 
                      onClick={startCamera} 
                      className="mt-4 bg-green-600 hover:bg-green-700"
                    >
                      Start Camera
                    </Button>
                  </div>
                </div>
              )}

              {/* Capture Button Overlay */}
              {isScanning && (
                <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
                  <div className="flex items-center space-x-6">
                    {/* Gallery Upload Placeholder */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-gray-800 rounded-full flex-shrink-0"
                      onClick={() => {
                        alert('Gallery upload coming soon! Use camera to capture.')
                      }}
                    >
                      <Upload className="w-6 h-6" />
                    </Button>

                    {/* Capture Button */}
                    <button
                      onClick={capturePhoto}
                      className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 transition-all flex-shrink-0"
                    >
                      <div className="w-16 h-16 rounded-full bg-white"></div>
                    </button>

                    {/* Toggle Camera (Front/Back) */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-gray-800 rounded-full flex-shrink-0"
                      onClick={() => {
                        alert('Camera toggle coming soon!')
                      }}
                    >
                      <RotateCcw className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Top overlay info */}
              {isScanning && (
                <div className="absolute top-4 left-4 right-4">
                  <div className="bg-black bg-opacity-50 rounded-lg p-3 text-white text-sm">
                    <p>Position crop in frame • Tap capture button when ready</p>
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

                {/* Cancel Button */}
                <div className="flex space-x-3">
                  <Button
                    onClick={() => {
                      stopCamera()
                      if (onClose) onClose()
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </>
         ) : (
           <>
             {/* Captured Image Preview */}
             <div className="flex-1 relative bg-black flex items-center justify-center">
               <img 
                 src={capturedImage} 
                 alt="Captured scan" 
                 className="max-w-full max-h-full object-contain"
               />
               
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
                {/* Farm Selector (passed to upload) */}
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

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    onClick={retakePhoto}
                    variant="outline"
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    onClick={uploadScan}
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
        )}

        {/* Canvas (hidden, for image processing) */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
