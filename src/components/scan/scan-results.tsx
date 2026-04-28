"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Droplet, 
  Calendar,
  MapPin,
  Camera,
  Download,
  Share,
  Leaf
} from 'lucide-react'

interface ScanResultsProps {
  scanResult: any
  diseaseInfo: any
  onRetakeScan: () => void
  onGenerateSprayPlan: () => void
}

export function ScanResults({ 
  scanResult, 
  diseaseInfo, 
  onRetakeScan, 
  onGenerateSprayPlan 
}: ScanResultsProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200'
      case 'mild': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'moderate': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'severe': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'mild': return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'moderate': return <AlertTriangle className="w-5 h-5 text-orange-600" />
      case 'severe': return <AlertTriangle className="w-5 h-5 text-red-600" />
      default: return <Info className="w-5 h-5 text-gray-600" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-orange-600'
  }

  const getActionRecommendation = (severity: string) => {
    switch (severity) {
      case 'healthy':
        return {
          action: 'Continue Monitoring',
          urgency: 'Low',
          timeframe: 'Weekly checks recommended',
          color: 'bg-green-50 border-green-200'
        }
      case 'mild':
        return {
          action: 'Increase Monitoring',
          urgency: 'Medium',
          timeframe: 'Check every 2-3 days',
          color: 'bg-yellow-50 border-yellow-200'
        }
      case 'moderate':
        return {
          action: 'Consider Treatment',
          urgency: 'High',
          timeframe: 'Treatment within 48 hours',
          color: 'bg-orange-50 border-orange-200'
        }
      case 'severe':
        return {
          action: 'Immediate Treatment Required',
          urgency: 'Critical',
          timeframe: 'Treat within 24 hours',
          color: 'bg-red-50 border-red-200'
        }
      default:
        return {
          action: 'Consult Expert',
          urgency: 'Unknown',
          timeframe: 'Seek professional advice',
          color: 'bg-gray-50 border-gray-200'
        }
    }
  }

  const recommendation = getActionRecommendation(scanResult.severity)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Scan Analysis Complete</h1>
        <p className="text-gray-600">AI-powered disease detection results</p>
      </div>

      {/* Main Result Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getSeverityIcon(scanResult.severity)}
              <div>
                <CardTitle className="text-xl">
                  {scanResult.disease_class.replace('_', ' ')}
                </CardTitle>
                <CardDescription>
                  Detected with {(scanResult.confidence * 100).toFixed(1)}% confidence
                </CardDescription>
              </div>
            </div>
            <Badge className={getSeverityColor(scanResult.severity)}>
              {scanResult.severity.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Camera className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Scan Method</p>
              <p className="text-xs text-gray-600">AI Camera Analysis</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Scan Time</p>
              <p className="text-xs text-gray-600">Just now</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <MapPin className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Location</p>
              <p className="text-xs text-gray-600">GPS Recorded</p>
            </div>
          </div>

          {/* Action Recommendation */}
          <div className={`p-4 rounded-lg border ${recommendation.color}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{recommendation.action}</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Urgency:</span> {recommendation.urgency}</p>
                  <p><span className="font-medium">Timeframe:</span> {recommendation.timeframe}</p>
                </div>
              </div>
              <div className="ml-4">
                <Leaf className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Information Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="treatment">Treatment</TabsTrigger>
          <TabsTrigger value="prevention">Prevention</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disease Information</CardTitle>
              <CardDescription>
                Scientific details about the detected condition
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Scientific Name</h4>
                <p className="text-gray-600">{diseaseInfo.scientific_name}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Common Symptoms</h4>
                <ul className="space-y-1">
                  {diseaseInfo.symptoms.map((symptom: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <span className="text-sm text-gray-600">{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Detection Confidence</h4>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getConfidenceColor(scanResult.confidence)}`}
                      style={{ width: `${scanResult.confidence * 100}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${getConfidenceColor(scanResult.confidence)}`}>
                    {(scanResult.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treatment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Treatment Recommendations</CardTitle>
              <CardDescription>
                Recommended actions to address the detected condition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diseaseInfo.treatment.map((treatment: string, index: number) => (
                  <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                    <Droplet className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                    <span className="text-sm text-gray-700">{treatment}</span>
                  </div>
                ))}
              </div>
              
              {scanResult.severity !== 'healthy' && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <strong>Important:</strong> Always follow proper safety precautions when applying treatments. 
                    Consider consulting with an agricultural expert for severe cases.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prevention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prevention Strategies</CardTitle>
              <CardDescription>
                Proactive measures to prevent future occurrences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diseaseInfo.prevention.map((prevention: string, index: number) => (
                  <div key={index} className="flex items-start p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                    <span className="text-sm text-gray-700">{prevention}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {scanResult.severity !== 'healthy' && (
          <Button 
            onClick={onGenerateSprayPlan}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Droplet className="w-4 h-4 mr-2" />
            Generate Spray Plan
          </Button>
        )}
        
        <Button variant="outline" onClick={onRetakeScan} className="flex-1">
          <Camera className="w-4 h-4 mr-2" />
          Retake Scan
        </Button>
        
        <Button variant="outline" className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </Button>
        
        <Button variant="outline" className="flex-1">
          <Share className="w-4 h-4 mr-2" />
          Share Results
        </Button>
      </div>

      {/* Additional Information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">AI Analysis Note</p>
              <p>
                This analysis was performed using advanced computer vision technology. 
                While highly accurate, results should be used as a guide alongside 
                professional agricultural advice, especially for severe cases.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
