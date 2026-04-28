"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { 
  MapPin, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'

// Dynamically import Leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
)

interface ScanData {
  id: string
  farm_id: string
  disease_class: string
  confidence: number
  severity: 'healthy' | 'mild' | 'moderate' | 'severe'
  gps_lat: number
  gps_lng: number
  created_at: string
}

interface InfectionHeatmapProps {
  user: any
  selectedFarmId?: string
}

export function InfectionHeatmap({ user, selectedFarmId }: InfectionHeatmapProps) {
  const [scanData, setScanData] = useState<ScanData[]>([])
  const [filteredData, setFilteredData] = useState<ScanData[]>([])
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [selectedDisease, setSelectedDisease] = useState<string>('all')
  const [dateRange, setDateRange] = useState<number>(7) // days
  const [mapCenter, setMapCenter] = useState<[number, number]>([11.1271, 78.6569])
  const [mapZoom, setMapZoom] = useState(7)
  const [isLoading, setIsLoading] = useState(false)

  const severityColors = {
    healthy: '#10b981',
    mild: '#eab308',
    moderate: '#f97316',
    severe: '#ef4444'
  }

  const severityRadius = {
    healthy: 8,
    mild: 12,
    moderate: 16,
    severe: 20
  }

  const diseaseTypes = [
    { value: 'all', label: 'All Diseases' },
    { value: 'Tomato_Early_Blight', label: 'Tomato Early Blight' },
    { value: 'Tomato_Late_Blight', label: 'Tomato Late Blight' },
    { value: 'Chili_Leaf_Curl', label: 'Chili Leaf Curl' },
    { value: 'Wheat_Rust', label: 'Wheat Rust' },
    { value: 'Healthy', label: 'Healthy' }
  ]

  const severityOptions = [
    { value: 'all', label: 'All Severities' },
    { value: 'healthy', label: 'Healthy' },
    { value: 'mild', label: 'Mild' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'severe', label: 'Severe' }
  ]

  // Load scan data
  useEffect(() => {
    loadScanData()
  }, [selectedFarmId, dateRange])

  // Filter data based on selections
  useEffect(() => {
    let filtered = scanData

    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(scan => scan.severity === selectedSeverity)
    }

    if (selectedDisease !== 'all') {
      filtered = filtered.filter(scan => scan.disease_class === selectedDisease)
    }

    setFilteredData(filtered)
  }, [scanData, selectedSeverity, selectedDisease])

  const loadScanData = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockData: ScanData[] = [
        {
          id: '1',
          farm_id: '1',
          disease_class: 'Tomato_Early_Blight',
          confidence: 0.85,
          severity: 'moderate',
          gps_lat: 11.0168,
          gps_lng: 76.9558,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          farm_id: '1',
          disease_class: 'Healthy',
          confidence: 0.92,
          severity: 'healthy',
          gps_lat: 11.0170,
          gps_lng: 76.9560,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          farm_id: '2',
          disease_class: 'Chili_Leaf_Curl',
          confidence: 0.78,
          severity: 'mild',
          gps_lat: 10.7905,
          gps_lng: 78.7047,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          farm_id: '2',
          disease_class: 'Tomato_Late_Blight',
          confidence: 0.91,
          severity: 'severe',
          gps_lat: 10.7910,
          gps_lng: 78.7050,
          created_at: new Date().toISOString()
        },
        {
          id: '5',
          farm_id: '1',
          disease_class: 'Tomato_Early_Blight',
          confidence: 0.88,
          severity: 'moderate',
          gps_lat: 11.0165,
          gps_lng: 76.9555,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      // Filter by date range
      const cutoffDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000)
      const filtered = mockData.filter(scan => new Date(scan.created_at) >= cutoffDate)

      setScanData(filtered)
    } catch (error) {
      console.error('Error loading scan data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatistics = () => {
    const stats = {
      total: filteredData.length,
      healthy: filteredData.filter(s => s.severity === 'healthy').length,
      mild: filteredData.filter(s => s.severity === 'mild').length,
      moderate: filteredData.filter(s => s.severity === 'moderate').length,
      severe: filteredData.filter(s => s.severity === 'severe').length,
      avgConfidence: filteredData.reduce((sum, s) => sum + s.confidence, 0) / filteredData.length || 0
    }
    return stats
  }

  const stats = getStatistics()

  const exportHeatmapData = () => {
    const csvContent = [
      ['ID', 'Farm ID', 'Disease', 'Severity', 'Confidence', 'Latitude', 'Longitude', 'Date'],
      ...filteredData.map(scan => [
        scan.id,
        scan.farm_id,
        scan.disease_class,
        scan.severity,
        scan.confidence,
        scan.gps_lat,
        scan.gps_lng,
        scan.created_at
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `infection-heatmap-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Infection Heatmap</h1>
          <p className="text-gray-600">Visualize disease outbreaks and infection patterns across your fields</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Disease Distribution Map
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={loadScanData}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Refresh
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportHeatmapData}>
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Real-time visualization of disease detection results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Map Component */}
                <div className="h-96 rounded-lg overflow-hidden border">
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {/* Infection Markers */}
                    {filteredData.map(scan => (
                      <CircleMarker
                        key={scan.id}
                        center={[scan.gps_lat, scan.gps_lng]}
                        radius={severityRadius[scan.severity]}
                        fillColor={severityColors[scan.severity]}
                        color={severityColors[scan.severity]}
                        weight={2}
                        fillOpacity={0.6}
                      />
                    ))}
                  </MapContainer>
                </div>

                {/* Map Legend */}
                <div className="mt-4 flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Healthy ({stats.healthy})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Mild ({stats.mild})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">Moderate ({stats.moderate})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Severe ({stats.severe})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Statistics */}
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Disease Type</label>
                  <Select value={selectedDisease} onValueChange={setSelectedDisease}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {diseaseTypes.map(disease => (
                        <SelectItem key={disease.value} value={disease.value}>
                          {disease.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Severity</label>
                  <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {severityOptions.map(severity => (
                        <SelectItem key={severity.value} value={severity.value}>
                          {severity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Time Range: {dateRange} days
                  </label>
                  <Slider
                    value={[dateRange]}
                    onValueChange={(value: number[]) => setDateRange(value[0])}
                    max={30}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 day</span>
                    <span>30 days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total Scans</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {(stats.avgConfidence * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Avg Confidence</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Healthy</span>
                    <Badge className="bg-green-100 text-green-800">
                      {stats.healthy}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Mild</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {stats.mild}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Moderate</span>
                    <Badge className="bg-orange-100 text-orange-800">
                      {stats.moderate}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Severe</span>
                    <Badge className="bg-red-100 text-red-800">
                      {stats.severe}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      {stats.severe > 0 ? `${stats.severe} severe cases need immediate attention` : 'No severe cases detected'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Recent Detections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredData.slice(0, 5).map(scan => (
                    <div key={scan.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {scan.disease_class.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge 
                        className={`${
                          scan.severity === 'healthy' ? 'bg-green-100 text-green-800' :
                          scan.severity === 'mild' ? 'bg-yellow-100 text-yellow-800' :
                          scan.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {scan.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
