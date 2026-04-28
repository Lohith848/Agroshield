"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Thermometer
} from 'lucide-react'

// Dynamically import Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

// Map events handler component
function MapEvents({ onMapClick, enabled }: { onMapClick: (lat: number, lng: number) => void, enabled: boolean }) {
  const [useMapEvents, setUseMapEvents] = useState<any>(null)

  useEffect(() => {
    import('react-leaflet').then((mod) => {
      setUseMapEvents(() => mod.useMapEvents)
    })
  }, [])

  if (!useMapEvents || !enabled) return null

  const map = useMapEvents({
    click(e: any) {
      const { lat, lng } = e.latlng
      onMapClick(lat, lng)
    }
  })

  return null
}

interface ScanData {
  id: string
  farm_id: string
  disease_class: string
  severity: 'healthy' | 'mild' | 'moderate' | 'severe'
  confidence: number
  gps_lat: number
  gps_lng: number
  created_at: string
}

interface ManualEntry {
  lat: number
  lng: number
  disease: string
  severity: 'healthy' | 'mild' | 'moderate' | 'severe'
  confidence: number
}

interface InfectionHeatmapProps {
  user: any
  selectedFarmId?: string
}

const SEVERITY_COLORS = {
  healthy: '#22c55e',   // green
  mild: '#eab308',      // yellow
  moderate: '#f97316',  // orange
  severe: '#ef4444'     // red
}

export function InfectionHeatmap({ user, selectedFarmId }: InfectionHeatmapProps) {
  const [scanData, setScanData] = useState<ScanData[]>([])
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([])
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [newEntry, setNewEntry] = useState<ManualEntry>({
    lat: 11.1271,
    lng: 78.6569,
    disease: 'Early Blight',
    severity: 'mild',
    confidence: 85
  })
  const [mapCenter, setMapCenter] = useState<[number, number]>([11.1271, 78.6569])
  const [mapZoom, setMapZoom] = useState(7)
  const [loading, setLoading] = useState(true)

  const diseaseOptions = [
    'Healthy',
    'Early Blight',
    'Late Blight',
    'Leaf Curl',
    'Leaf Spot',
    'Powdery Mildew',
    'Rust',
    'Bacterial Spot',
    'Mosaic Virus'
  ]

  // Load scan data from backend
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const farmId = selectedFarmId || '1'
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/heatmap/${farmId}`)
        if (response.ok) {
          const data = await response.json()
          setScanData(data.features?.map((f: any) => ({
            id: f.properties?.scan_id || Math.random().toString(),
            farm_id: farmId,
            disease_class: f.properties?.disease || 'Unknown',
            severity: f.properties?.severity || 'mild',
            confidence: f.properties?.confidence || 0.5,
            gps_lat: f.geometry?.coordinates[1] || 0,
            gps_lng: f.geometry?.coordinates[0] || 0,
            created_at: f.properties?.timestamp || new Date().toISOString()
          })) || [])
        }
      } catch (error) {
        console.error('Error loading heatmap data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedFarmId])

  const handleAddManualEntry = () => {
    setManualEntries(prev => [...prev, { ...newEntry }])
    setShowManualEntry(false)
    // Reset form
    setNewEntry({
      lat: mapCenter[0],
      lng: mapCenter[1],
      disease: 'Early Blight',
      severity: 'mild',
      confidence: 85
    })
  }

  const handleMapClick = (lat: number, lng: number) => {
    if (showManualEntry) {
      setNewEntry(prev => ({ ...prev, lat, lng }))
      setMapCenter([lat, lng])
      setMapZoom(13)
    }
  }

  const handleDeleteEntry = (index: number) => {
    setManualEntries(prev => prev.filter((_, i) => i !== index))
  }

  // Combine scan data and manual entries for display
  const allPoints = [
    ...scanData.map(s => ({
      key: `scan-${s.id}`,
      position: [s.gps_lat, s.gps_lng] as [number, number],
      disease: s.disease_class,
      severity: s.severity,
      confidence: s.confidence
    })),
    ...manualEntries.map((e, i) => ({
      key: `manual-${i}`,
      position: [e.lat, e.lng] as [number, number],
      disease: e.disease,
      severity: e.severity,
      confidence: e.confidence
    }))
  ]

  const getRadius = (severity: string) => {
    switch (severity) {
      case 'severe': return 25
      case 'moderate': return 20
      case 'mild': return 15
      default: return 10
    }
  }

  const getSeverityLabel = (severity: string) => {
    return severity.charAt(0).toUpperCase() + severity.slice(1)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Disease Heatmap</h1>
          <p className="text-gray-600">Visualize disease spread across your fields</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Infection Map
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowManualEntry(!showManualEntry)}
                    variant={showManualEntry ? "default" : "outline"}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Data Point
                  </Button>
                </div>
                <CardDescription>
                  {showManualEntry 
                    ? 'Click on the map to place a disease detection point' 
                    : 'Real-time disease detection heatmap'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Map */}
                <div className="h-96 rounded-lg overflow-hidden border mb-4">
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Map Click Handler */}
                    <MapEvents onMapClick={handleMapClick} enabled={showManualEntry} />

                    {/* Disease Points */}
                    {allPoints.map(point => (
                      <Circle
                        key={point.key}
                        center={point.position}
                        radius={getRadius(point.severity)}
                        pathOptions={{
                          color: SEVERITY_COLORS[point.severity],
                          fillColor: SEVERITY_COLORS[point.severity],
                          fillOpacity: 0.5
                        }}
                      >
                        <Popup>
                          <div>
                            <h4 className="font-semibold">{point.disease}</h4>
                            <p className="text-sm">Severity: {getSeverityLabel(point.severity)}</p>
                            <p className="text-sm">Confidence: {(point.confidence * 100).toFixed(0)}%</p>
                          </div>
                        </Popup>
                      </Circle>
                    ))}

                    {/* Marker for manual entry preview */}
                    {showManualEntry && newEntry.lat && newEntry.lng && (
                      <Circle
                        center={[newEntry.lat, newEntry.lng]}
                        radius={15}
                        pathOptions={{
                          color: '#3b82f6',
                          fillColor: '#3b82f6',
                          fillOpacity: 0.4,
                          dashArray: '5, 5'
                        }}
                      />
                    )}
                  </MapContainer>
                </div>

                {/* Manual Entry Form */}
                {showManualEntry && (
                  <div className="border rounded-lg p-4 bg-blue-50 mb-4">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Manual Data Point
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="disease">Disease Type</Label>
                        <select
                          id="disease"
                          className="w-full mt-1 p-2 border rounded"
                          value={newEntry.disease}
                          onChange={(e) => setNewEntry({...newEntry, disease: e.target.value})}
                        >
                          {diseaseOptions.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="severity">Severity</Label>
                        <select
                          id="severity"
                          className="w-full mt-1 p-2 border rounded"
                          value={newEntry.severity}
                          onChange={(e) => setNewEntry({...newEntry, severity: e.target.value as any})}
                        >
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="confidence">Confidence (%)</Label>
                        <Input
                          id="confidence"
                          type="number"
                          min="0"
                          max="100"
                          value={newEntry.confidence}
                          onChange={(e) => setNewEntry({...newEntry, confidence: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div>
                        <Label>Coordinates</Label>
                        <div className="text-sm text-gray-600 mt-1">
                          {newEntry.lat.toFixed(6)}, {newEntry.lng.toFixed(6)}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" onClick={handleAddManualEntry}>
                        Add Point
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowManualEntry(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Legend & Stats */}
          <div className="space-y-6">
            {/* Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(SEVERITY_COLORS).map(([severity, color]) => (
                  <div key={severity} className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-sm capitalize">{severity}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Data Points List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">Detection Points</span>
                  <Badge>{allPoints.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allPoints.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No detection data yet. Click "Add Data Point" to start.
                    </p>
                  ) : (
                    [...allPoints].reverse().map((point, index) => (
                      <div 
                        key={point.key} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: SEVERITY_COLORS[point.severity] }}
                            ></div>
                            <span className="font-medium text-sm">{point.disease}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {point.position[0].toFixed(4)}, {point.position[1].toFixed(4)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="capitalize">
                            {point.severity}
                          </Badge>
                          {point.key.startsWith('manual-') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500"
                              onClick={() => handleDeleteEntry(parseInt(point.key.split('-')[1]))}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {manualEntries.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => {
                      // Could save to backend here
                      alert('Manual entries would be saved to database')
                    }}
                  >
                    Save All Entries
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Thermometer className="w-5 h-5 mr-2" />
                  Area Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-xl font-bold text-red-600">
                      {allPoints.filter(p => p.severity === 'severe').length}
                    </p>
                    <p className="text-xs text-gray-600">Severe</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-xl font-bold text-orange-600">
                      {allPoints.filter(p => p.severity === 'moderate').length}
                    </p>
                    <p className="text-xs text-gray-600">Moderate</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xl font-bold text-yellow-600">
                      {allPoints.filter(p => p.severity === 'mild').length}
                    </p>
                    <p className="text-xs text-gray-600">Mild</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-600">
                      {allPoints.filter(p => p.severity === 'healthy').length}
                    </p>
                    <p className="text-xs text-gray-600">Healthy</p>
                  </div>
                </div>

                {allPoints.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Risk Level</span>
                      <Badge variant={
                        allPoints.some(p => p.severity === 'severe') ? 'destructive' :
                        allPoints.some(p => p.severity === 'moderate') ? 'secondary' : 'outline'
                      }>
                        {allPoints.some(p => p.severity === 'severe') ? 'High' :
                         allPoints.some(p => p.severity === 'moderate') ? 'Medium' : 'Low'}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
