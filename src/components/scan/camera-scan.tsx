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
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Mock farms data
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: 'environment' }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => {
            console.error('Video play error:', err)
          })
        }
      }
      
      setIsScanning(true)
    } catch (error: any) {
      console.error('Error accessing camera:', error)
      let message = 'Unable to access camera. '
      if (error.name === 'NotAllowedError') {
        message += 'Please allow camera permissions.'
      } else if (error.name === 'NotFoundError') {
        message += 'No camera found.'
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
        }
      )
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setScanResult(null)
    setGpsLocation(null)
    setAnalysisError(null)
    startCamera()
  }

  const uploadScan = async () => {
    if (!capturedImage || !selectedFarm) {
      alert('Please select a farm and capture an image')
      return
    }

    setIsUploading(true)
    setAnalysisError(null)

    try {
      const response = await fetch(capturedImage)
      const blob = await response.blob()
      const file = new File([blob], 'scan.jpg', { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', user.id)
      formData.append('farm_id', selectedFarm)
      if (gpsLocation) {
        formData.append('gps_lat', gpsLocation.lat.toString())
        formData.append('gps_lng', gpsLocation.lng.toString())
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const uploadResponse = await fetch(`${apiUrl}/scan/analyze-groq`, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Upload failed')
      }

      const result = await uploadResponse.json()
      const analysis = result.result || result
      
      setScanResult({
        result: analysis,
        image_url: result.image_url || capturedImage,
        disease_info: result.disease_info,
        scan_id: result.scan_id
      })
      
      onScanComplete({ result: analysis, image_url: result.image_url })

    } catch (error) {
      console.error('Error analyzing scan:', error)
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze image')
    } finally {
      setIsUploading(false)
    }
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-gray-800 rounded-full flex-shrink-0"
                      onClick={() => alert('Gallery upload coming soon!')}
                    >
                      <Upload className="w-6 h-6" />
                    </Button>

                    <button
                      onClick={capturePhoto}
                      className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 transition-all flex-shrink-0"
                    >
                      <div className="w-16 h-16 rounded-full bg-white"></div>
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-gray-800 rounded-full flex-shrink-0"
                      onClick={() => alert('Camera toggle coming soon!')}
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

                {/* Error Message */}
                {analysisError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{analysisError}</p>
                  </div>
                )}

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
        ) : (
          <>
            {!scanResult ? (
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

                    {/* Error Message */}
                    {analysisError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{analysisError}</p>
                      </div>
                    )}

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
            ) : (
              <>
                {/* Analysis Results */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                  <div className="max-w-md mx-auto space-y-4">
                    {/* Result Header */}
                    <div className="bg-white rounded-lg p-4 shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">Analysis Results</h3>
                        <Badge className={
                          scanResult.result.severity === 'healthy' ? 'bg-green-100 text-green-800' :
                          scanResult.result.severity === 'mild' ? 'bg-yellow-100 text-yellow-800' :
                          scanResult.result.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {scanResult.result.severity}
                        </Badge>
                      </div>

                      {/* Captured Image Thumbnail */}
                      <div className="mb-4">
                        <img 
                          src={capturedImage} 
                          alt="Analyzed crop"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>

                      {/* Analysis Details */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-500 uppercase">Disease Detected</label>
                          <p className="text-lg font-semibold capitalize">
                            {scanResult.result.disease_class?.replace('_', ' ') || 'Unknown'}
                          </p>
                        </div>

                        <div>
                          <label className="text-xs text-gray-500 uppercase">Plant Type</label>
                          <p className="text-base">{scanResult.result.plant_type || 'Crop'}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-xs text-gray-500 uppercase">Confidence</label>
                            <p className="text-2xl font-bold text-green-600">
                              {((scanResult.result.confidence || 0) * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <label className="text-xs text-gray-500 uppercase">Severity</label>
                            <p className="text-lg font-semibold capitalize">
                              {scanResult.result.severity || 'Unknown'}
                            </p>
                          </div>
                        </div>

                        {scanResult.result.description && (
                          <div className="pt-2 border-t">
                            <label className="text-xs text-gray-500 uppercase">Description</label>
                            <p className="text-sm text-gray-700 mt-1">
                              {scanResult.result.description}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Treatment Info (if disease_info available) */}
                      {scanResult.disease_info && (
                        <div className="pt-3 border-t">
                          <p className="text-sm font-semibold mb-2">Recommendations</p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium text-gray-500">Treatment</p>
                              <ul className="text-sm list-disc list-inside">
                                {scanResult.disease_info.treatment?.map((item: string, i: number) => (
                                  <li key={i} className="text-gray-700">{item}</li>
                                )) || <li className="text-gray-500">Consult an agricultural expert</li>}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500">Prevention</p>
                              <ul className="text-sm list-disc list-inside">
                                {scanResult.disease_info.prevention?.map((item: string, i: number) => (
                                  <li key={i} className="text-gray-700">{item}</li>
                                )) || <li className="text-gray-500">Maintain good farming practices</li>}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Success Message */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                        <p className="text-sm text-green-800 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Scan saved to your farm records
                        </p>
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
          </>
        )}

        {/* Canvas (hidden, for image processing) */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
