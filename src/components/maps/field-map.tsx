"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Save, 
  Edit3, 
  Layers, 
  Search,
  Plus,
  Trash2
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
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Polygon = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polygon),
  { ssr: false }
)

interface Field {
  id: string
  name: string
  crop_type: string
  area_acres: number
  boundary?: [number, number][]
  center_lat: number
  center_lng: number
  soil_type?: string
  irrigation_type?: string
}

interface FieldMapProps {
  user: any
  onFieldSaved?: (field: Field) => void
}

export function FieldMap({ user, onFieldSaved }: FieldMapProps) {
  const [fields, setFields] = useState<Field[]>([])
  const [selectedField, setSelectedField] = useState<Field | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newField, setNewField] = useState<Partial<Field>>({
    name: '',
    crop_type: '',
    area_acres: 0,
    center_lat: 11.1271, // Tamil Nadu center
    center_lng: 78.6569,
    soil_type: '',
    irrigation_type: ''
  })
  const [mapCenter, setMapCenter] = useState<[number, number]>([11.1271, 78.6569])
  const [mapZoom, setMapZoom] = useState(7)
  const [boundaryPoints, setBoundaryPoints] = useState<[number, number][]>([])
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false)

  const cropTypes = [
    'Tomato', 'Chili', 'Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Mixed'
  ]

  const soilTypes = [
    'Red Soil', 'Black Soil', 'Alluvial Soil', 'Laterite Soil', 'Sandy Loam'
  ]

  const irrigationTypes = [
    'Drip Irrigation', 'Sprinkler', 'Flood Irrigation', 'Rain-fed', 'Manual'
  ]

  // Load user's fields
  useEffect(() => {
    // Mock data - replace with actual API call
    const mockFields: Field[] = [
      {
        id: '1',
        name: 'Tomato Field A',
        crop_type: 'Tomato',
        area_acres: 2.5,
        center_lat: 11.0168,
        center_lng: 76.9558,
        soil_type: 'Red Soil',
        irrigation_type: 'Drip Irrigation',
        boundary: [
          [11.0165, 76.9555],
          [11.0170, 76.9555],
          [11.0170, 76.9561],
          [11.0165, 76.9561]
        ]
      },
      {
        id: '2',
        name: 'Chili Field B',
        crop_type: 'Chili',
        area_acres: 1.8,
        center_lat: 10.7905,
        center_lng: 78.7047,
        soil_type: 'Black Soil',
        irrigation_type: 'Sprinkler'
      }
    ]
    setFields(mockFields)
  }, [])

  const handleMapClick = (lat: number, lng: number) => {
    if (isDrawingBoundary) {
      setBoundaryPoints(prev => [...prev, [lat, lng]])
    } else if (isEditing && newField) {
      setNewField(prev => ({
        ...prev,
        center_lat: lat,
        center_lng: lng
      }))
      setMapCenter([lat, lng])
      setMapZoom(13)
    }
  }

  // Create a wrapper component for map events
  const MapEvents = () => {
    const [map, setMap] = useState<any>(null)
    
    useEffect(() => {
      if (map) {
        const handleClick = (e: any) => {
          const { lat, lng } = e.latlng
          handleMapClick(lat, lng)
        }
        
        map.on('click', handleClick)
        return () => map.off('click', handleClick)
      }
    }, [map, isDrawingBoundary, isEditing, newField])
    
    return null
  }

  const startDrawingBoundary = () => {
    setIsDrawingBoundary(true)
    setBoundaryPoints([])
  }

  const finishDrawingBoundary = () => {
    if (boundaryPoints.length >= 3) {
      setNewField(prev => ({
        ...prev,
        boundary: boundaryPoints
      }))
    }
    setIsDrawingBoundary(false)
  }

  const clearBoundary = () => {
    setBoundaryPoints([])
    setIsDrawingBoundary(false)
  }

  const saveField = () => {
    if (newField.name && newField.crop_type) {
      const field: Field = {
        id: Date.now().toString(),
        name: newField.name,
        crop_type: newField.crop_type,
        area_acres: newField.area_acres || 1,
        center_lat: newField.center_lat || 11.1271,
        center_lng: newField.center_lng || 78.6569,
        soil_type: newField.soil_type,
        irrigation_type: newField.irrigation_type,
        boundary: newField.boundary
      }
      
      setFields(prev => [...prev, field])
      onFieldSaved?.(field)
      
      // Reset form
      setNewField({
        name: '',
        crop_type: '',
        area_acres: 0,
        center_lat: 11.1271,
        center_lng: 78.6569,
        soil_type: '',
        irrigation_type: ''
      })
      setIsEditing(false)
      setBoundaryPoints([])
    }
  }

  const deleteField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId))
    if (selectedField?.id === fieldId) {
      setSelectedField(null)
    }
  }

  const focusField = (field: Field) => {
    setSelectedField(field)
    setMapCenter([field.center_lat, field.center_lng])
    setMapZoom(15)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Field Management</h1>
          <p className="text-gray-600">Manage your farm fields and boundaries using OpenStreetMap</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Field Map
                  </CardTitle>
                  <div className="flex space-x-2">
                    {isEditing && (
                      <>
                        {isDrawingBoundary ? (
                          <>
                            <Button size="sm" onClick={finishDrawingBoundary}>
                              Finish Boundary
                            </Button>
                            <Button size="sm" variant="outline" onClick={clearBoundary}>
                              Clear
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={startDrawingBoundary}>
                            Draw Boundary
                          </Button>
                        )}
                        <Button size="sm" onClick={saveField}>
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                      </>
                    )}
                    {!isEditing && (
                      <Button size="sm" onClick={() => setIsEditing(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Field
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Click on the map to place field markers or draw boundaries
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
                    
                    {/* Field Markers */}
                    {fields.map(field => (
                      <Marker
                        key={field.id}
                        position={[field.center_lat, field.center_lng]}
                      />
                    ))}
                    
                    {/* Field Boundaries */}
                    {fields.map(field => 
                      field.boundary ? (
                        <Polygon
                          key={`boundary-${field.id}`}
                          positions={field.boundary}
                          pathOptions={{
                            color: selectedField?.id === field.id ? '#16a34a' : '#3b82f6',
                            weight: 2,
                            fillOpacity: 0.3
                          }}
                        />
                      ) : null
                    )}
                    
                    {/* New Field Boundary */}
                    {boundaryPoints.length > 0 && (
                      <Polygon
                        positions={boundaryPoints}
                        pathOptions={{
                          color: '#ef4444',
                          weight: 2,
                          fillOpacity: 0.3,
                          dashArray: '5, 5'
                        }}
                      />
                    )}
                    
                    {/* New Field Marker */}
                    {isEditing && newField.center_lat && newField.center_lng && (
                      <Marker
                        position={[newField.center_lat, newField.center_lng]}
                      />
                    )}
                  </MapContainer>
                </div>

                {/* Field List */}
                <div className="mt-4 space-y-2">
                  <h3 className="font-medium text-sm">Your Fields</h3>
                  <div className="space-y-2">
                    {fields.map(field => (
                      <div
                        key={field.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedField?.id === field.id 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => focusField(field)}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{field.name}</div>
                          <div className="text-sm text-gray-600">
                            {field.crop_type} • {field.area_acres} acres
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{field.crop_type}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteField(field.id)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Field Details/Editor */}
          <div className="space-y-6">
            {selectedField && !isEditing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit3 className="w-5 h-5 mr-2" />
                    Field Details
                  </CardTitle>
                  <CardDescription>
                    {selectedField.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Crop Type</Label>
                    <p className="text-sm text-gray-600">{selectedField.crop_type}</p>
                  </div>
                  <div>
                    <Label>Area</Label>
                    <p className="text-sm text-gray-600">{selectedField.area_acres} acres</p>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <p className="text-sm text-gray-600">
                      {selectedField.center_lat.toFixed(4)}, {selectedField.center_lng.toFixed(4)}
                    </p>
                  </div>
                  {selectedField.soil_type && (
                    <div>
                      <Label>Soil Type</Label>
                      <p className="text-sm text-gray-600">{selectedField.soil_type}</p>
                    </div>
                  )}
                  {selectedField.irrigation_type && (
                    <div>
                      <Label>Irrigation</Label>
                      <p className="text-sm text-gray-600">{selectedField.irrigation_type}</p>
                    </div>
                  )}
                  {selectedField.boundary && (
                    <div>
                      <Label>Boundary Points</Label>
                      <p className="text-sm text-gray-600">
                        {selectedField.boundary.length} points defined
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isEditing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Add New Field
                  </CardTitle>
                  <CardDescription>
                    Fill in field details and click on map to set location
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="field-name">Field Name</Label>
                    <Input
                      id="field-name"
                      placeholder="e.g., Tomato Field A"
                      value={newField.name}
                      onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="crop-type">Crop Type</Label>
                    <Select value={newField.crop_type} onValueChange={(value) => setNewField(prev => ({ ...prev, crop_type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select crop type" />
                      </SelectTrigger>
                      <SelectContent>
                        {cropTypes.map(crop => (
                          <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="area">Area (acres)</Label>
                    <Input
                      id="area"
                      type="number"
                      placeholder="1.0"
                      value={newField.area_acres}
                      onChange={(e) => setNewField(prev => ({ ...prev, area_acres: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="soil-type">Soil Type</Label>
                    <Select value={newField.soil_type} onValueChange={(value) => setNewField(prev => ({ ...prev, soil_type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select soil type" />
                      </SelectTrigger>
                      <SelectContent>
                        {soilTypes.map(soil => (
                          <SelectItem key={soil} value={soil}>{soil}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="irrigation">Irrigation Type</Label>
                    <Select value={newField.irrigation_type} onValueChange={(value) => setNewField(prev => ({ ...prev, irrigation_type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select irrigation type" />
                      </SelectTrigger>
                      <SelectContent>
                        {irrigationTypes.map(irrigation => (
                          <SelectItem key={irrigation} value={irrigation}>{irrigation}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> Click on the map to set field location. 
                      Use "Draw Boundary" to outline the field area.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Map Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="w-5 h-5 mr-2" />
                  Map Legend
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Field Location</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-300 border border-blue-500"></div>
                  <span className="text-sm">Field Boundary</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-300 border border-green-500"></div>
                  <span className="text-sm">Selected Field</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-300 border border-red-500 border-dashed"></div>
                  <span className="text-sm">Drawing Boundary</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
