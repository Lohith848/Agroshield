"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Calendar,
  Phone
} from 'lucide-react'
import { CameraScan } from '@/components/scan/camera-scan'

interface DashboardProps {
  user: any
}

export function Dashboard({ user }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showCameraScan, setShowCameraScan] = useState(false)

  const profile = user.profile

  const handleScanComplete = (result: any) => {
    setShowCameraScan(false)
    // Refresh dashboard data or show success message
  }

  const stats = [
    {
      title: "Total Scans",
      value: "24",
      change: "+12%",
      icon: Camera,
      color: "text-blue-600"
    },
    {
      title: "Health Score",
      value: "87%",
      change: "+5%",
      icon: Leaf,
      color: "text-green-600"
    },
    {
      title: "Pesticide Saved",
      value: "₹4,200",
      change: "+18%",
      icon: Droplet,
      color: "text-cyan-600"
    },
    {
      title: "Active Alerts",
      value: "3",
      change: "-2",
      icon: AlertTriangle,
      color: "text-orange-600"
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

  const alerts = [
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
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'mild': return 'bg-yellow-100 text-yellow-800'
      case 'moderate': return 'bg-orange-100 text-orange-800'
      case 'severe': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-orange-200 bg-orange-50'
      case 'low': return 'border-blue-200 bg-blue-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

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
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Alerts (3)
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{profile?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                </div>
                <Avatar>
                  <AvatarFallback className="bg-green-100 text-green-800">
                    {profile?.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
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
                  <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scans">Scans</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Scans */}
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
                            <Badge className={getSeverityColor(scan.severity)}>
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

              {/* Alerts */}
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
                    {alerts.map((alert) => (
                      <div key={alert.id} className={`p-3 border rounded-lg ${getPriorityColor(alert.priority)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{alert.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                            <p className="text-xs text-gray-500 mt-2">{alert.time}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
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
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Camera className="w-4 h-4 mr-2" />
                    New Scan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Field Management</CardTitle>
                <CardDescription>
                  Manage your farms and field boundaries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Map className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No fields added yet. Add your first farm!</p>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Map className="w-4 h-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>
                  Detailed insights and trends for your farms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Analytics data will appear here as you scan more crops.</p>
                  <Button variant="outline">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Sample Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
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
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
            <div className="h-full">
              <CameraScan 
                user={user} 
                onScanComplete={handleScanComplete}
              />
              <Button
                onClick={() => setShowCameraScan(false)}
                variant="outline"
                className="absolute top-4 right-4 bg-white"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
