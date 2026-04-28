"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, User, Cloud, Droplets, Thermometer, Wind } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Camera, 
  Map, 
  BarChart3, 
  Settings, 
  Bell, 
  Leaf, 
  Droplet, 
  AlertTriangle,
  TrendingUp,
  ExternalLink
} from 'lucide-react'
import { CameraScan } from '@/components/scan/camera-scan'
import { FieldMap } from '@/components/maps/field-map'
import { InfectionHeatmap } from '@/components/maps/infection-heatmap'
import { getWeatherByCoords, getWeatherIconUrl } from '@/lib/weather'
import { getAgriculturalNews, formatNewsDate, getNewsCategory } from '@/lib/news'

interface DashboardProps {
  user: any
  onLogout?: () => void
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showCameraScan, setShowCameraScan] = useState(false)
  const [selectedFarmId, setSelectedFarmId] = useState<string>('')
  const [weather, setWeather] = useState<any>(null)
  const [news, setNews] = useState<any[]>([])
  const [loadingWeather, setLoadingWeather] = useState(true)
  const [loadingNews, setLoadingNews] = useState(true)

  const profile = user.profile

  // Fetch weather on component mount
  useEffect(() => {
    const fetchWeather = async () => {
      // Try to get user's location from profile or use default (Tamil Nadu center)
      const lat = profile?.location_lat || 11.1271
      const lng = profile?.location_lng || 78.6569

      const weatherData = await getWeatherByCoords(lat, lng)
      if (weatherData) {
        setWeather(weatherData)
      }
      setLoadingWeather(false)
    }

    fetchWeather()
  }, [profile])

  // Fetch news on component mount
  useEffect(() => {
    const fetchNews = async () => {
      const newsData = await getAgriculturalNews()
      setNews(newsData.slice(0, 5)) // Show only top 5
      setLoadingNews(false)
    }

    fetchNews()
  }, [])

  const handleScanComplete = (result: any) => {
    setShowCameraScan(false)
    // Refresh dashboard data or show success message
  }

  const handleFieldSaved = (field: any) => {
    // Handle field save
    console.log('Field saved:', field)
  }

  const handleLogout = () => {
    // Clear localStorage session
    if (typeof window !== 'undefined') {
      localStorage.removeItem('agroshield_user')
      console.log('🔒 Session cleared')
    }
    
    // Clear user state
    if (onLogout) {
      onLogout()
    } else {
      // Fallback: reload page to clear auth state
      window.location.reload()
    }
  }

  const stats = [
    {
      title: "Total Scans",
      value: "24",
      change: "+12%",
      icon: Camera,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Health Score",
      value: "87%",
      change: "+5%",
      icon: Leaf,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Pesticide Saved",
      value: "₹4,200",
      change: "+18%",
      icon: Droplet,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100"
    },
    {
      title: "Active Alerts",
      value: "3",
      change: "-2",
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ]

  const recentScans = [
    {
      id: 1,
      farm: "Tomato Field A",
      disease: "Early Blight",
      severity: "moderate",
      confidence: 92,
      time: "2 hours ago",
      status: "treatment_needed"
    },
    {
      id: 2,
      farm: "Chili Field B", 
      disease: "Healthy",
      severity: "healthy",
      confidence: 96,
      time: "5 hours ago",
      status: "healthy"
    },
    {
      id: 3,
      farm: "Tomato Field A",
      disease: "Leaf Curl",
      severity: "mild",
      confidence: 78,
      time: "1 day ago",
      status: "monitoring"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">AS</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">AgroShield</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {weather && !loadingWeather && (
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                  <Cloud className="w-4 h-4" />
                  <span>{weather.temperature}°C</span>
                  <span className="text-gray-400">|</span>
                  <Droplets className="w-4 h-4" />
                  <span>{weather.humidity}%</span>
                </div>
              )}
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Alerts
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              <div className="flex items-center">
                <Avatar className="w-8 h-8 mr-2">
                  <AvatarFallback className="bg-green-100 text-green-800">
                    {profile?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{profile?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{profile?.role || 'Farmer'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {profile?.name}! 👋
          </h2>
          <p className="text-gray-600">
            Here's what's happening with your farms today.
          </p>
        </div>

        {/* Weather Card (Top) */}
        {weather && !loadingWeather && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img 
                    src={getWeatherIconUrl(weather.icon)} 
                    alt={weather.description}
                    className="w-16 h-16"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-2xl font-bold text-gray-900">{weather.temperature}°C</h3>
                      <Badge variant="outline" className="capitalize">
                        {weather.description}
                      </Badge>
                    </div>
                    <p className="text-gray-600">Feels like {weather.feels_like}°C</p>
                    <p className="text-sm text-gray-500">{weather.location}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <Droplets className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-sm font-semibold">{weather.humidity}%</p>
                    <p className="text-xs text-gray-500">Humidity</p>
                  </div>
                  <div className="text-center">
                    <Wind className="w-5 h-5 mx-auto text-gray-500 mb-1" />
                    <p className="text-sm font-semibold">{weather.wind_speed} m/s</p>
                    <p className="text-xs text-gray-500">Wind</p>
                  </div>
                  <div className="text-center">
                    <Thermometer className="w-5 h-5 mx-auto text-red-500 mb-1" />
                    <p className="text-sm font-semibold">{weather.pressure} hPa</p>
                    <p className="text-xs text-gray-500">Pressure</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <div className="flex items-center mt-1">
                      <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                      <span className="text-xs text-green-600">{stat.change}</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor} ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* News & Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Scans Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  Recent Scans
                </CardTitle>
                <CardDescription>
                  Latest disease detection results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentScans.map((scan) => (
                    <div key={scan.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{scan.farm}</p>
                          <Badge className={
                            scan.severity === 'healthy' ? 'bg-green-100 text-green-800' :
                            scan.severity === 'mild' ? 'bg-yellow-100 text-yellow-800' :
                            scan.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {scan.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">{scan.disease}</p>
                        <p className="text-xs text-gray-500 mt-1">{scan.time}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium">{scan.confidence}%</p>
                        <p className="text-xs text-gray-500">confidence</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Scans
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Agricultural News Card */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Agri News
                </CardTitle>
                <CardDescription>
                  Latest farming updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingNews ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {news.map((article, index) => (
                      <a 
                        key={index} 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <h4 className="font-medium text-sm line-clamp-2 mb-1">
                          {article.title}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {article.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {getNewsCategory(article.url)}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatNewsDate(article.publishedAt)}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="w-full mt-4" asChild>
                  <a href="https://newsapi.org/" target="_blank" rel="noopener noreferrer">
                    More News
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Active Alerts
              </CardTitle>
              <CardDescription>
                Important notifications and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    id: 1,
                    type: "disease_detected",
                    title: "Moderate Early Blight Detected",
                    message: "Tomato Field A shows signs of Early Blight. Consider treatment within 48 hours.",
                    time: "2 hours ago",
                    priority: "medium"
                  },
                  {
                    id: 2,
                    type: "spray_reminder",
                    title: "Spray Plan Ready",
                    message: "Your precision spray plan for Tomato Field A is ready for review.",
                    time: "3 hours ago",
                    priority: "low"
                  },
                  {
                    id: 3,
                    type: "weather_alert",
                    title: "High Humidity Warning",
                    message: "High humidity expected tomorrow. Increased disease risk.",
                    time: "5 hours ago",
                    priority: "high"
                  }
                ].map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-3 border rounded-lg ${
                      alert.priority === 'high' ? 'border-red-200 bg-red-50' :
                      alert.priority === 'medium' ? 'border-orange-200 bg-orange-50' :
                      'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">{alert.time}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {alert.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Alerts
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for other sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scans">Scans</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weather Details */}
              {weather && !loadingWeather && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Cloud className="w-5 h-5 mr-2" />
                      Weather Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600">Temperature</p>
                        <p className="text-2xl font-bold">{weather.temperature}°C</p>
                      </div>
                      <div className="p-3 bg-cyan-50 rounded-lg">
                        <p className="text-sm text-cyan-600">Humidity</p>
                        <p className="text-2xl font-bold">{weather.humidity}%</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Wind Speed</p>
                        <p className="text-xl font-bold">{weather.wind_speed} m/s</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600">Pressure</p>
                        <p className="text-xl font-bold">{weather.pressure} hPa</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => setShowCameraScan(true)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    New Crop Scan
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => setActiveTab('fields')}
                  >
                    <Map className="w-4 h-4 mr-2" />
                    Manage Fields
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => setActiveTab('heatmap')}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Heatmap
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scan History</CardTitle>
                <CardDescription>
                  Complete history of all crop scans and disease detections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No scans yet. Start by scanning your crops!</p>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setShowCameraScan(true)}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    New Scan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields" className="space-y-6">
            <FieldMap user={user} onFieldSaved={handleFieldSaved} />
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-6">
            <InfectionHeatmap user={user} selectedFarmId={selectedFarmId} />
          </TabsContent>
        </Tabs>

        {/* Quick Scan Button */}
        <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
          <Button 
            onClick={() => setShowCameraScan(true)}
            className="bg-green-600 hover:bg-green-700 rounded-full w-14 h-14 shadow-lg"
          >
            <Camera className="w-6 h-6" />
          </Button>
        </div>

        {/* Camera Scan Modal */}
        {showCameraScan && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="w-full max-w-4xl mx-4">
              <CameraScan 
                user={user} 
                onScanComplete={handleScanComplete}
                onClose={() => setShowCameraScan(false)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
