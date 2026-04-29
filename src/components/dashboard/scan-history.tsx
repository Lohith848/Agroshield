"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

interface ScanRecord {
  id: string
  disease_class: string
  severity: 'healthy' | 'mild' | 'moderate' | 'severe'
  confidence: number
  created_at: string
  farm_id: string
  image_url: string
}

export function ScanHistory() {
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScans = async () => {
      try {
        if (!supabase) {
          console.error('Supabase not initialized')
          setLoading(false)
          return
        }
        const { data, error } = await supabase!
          .from('scans')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        setScans(data || [])
      } catch (err) {
        console.error('Error fetching scans:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchScans()
  }, [])

  const severityColors: Record<string, string> = {
    healthy: '#16a34a',
    mild: '#ca8a04',
    moderate: '#ea580c',
    severe: '#dc2626'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontWeight: '700', marginBottom: '16px' }}>
        All Scans ({scans.length})
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4">Loading scans...</p>
        </div>
      ) : scans.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          color: '#666',
          background: '#f9fafb',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌿</div>
          <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
            No scans yet
          </div>
          <div style={{ fontSize: '14px' }}>
            Scan your first crop to see history here
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {scans.map((scan) => (
            <Card
              key={scan.id}
              style={{
                borderLeft: `4px solid ${severityColors[scan.severity] || '#666'}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              <CardContent className="pt-4">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>
                      {scan.disease_class || 'Healthy Crop'}
                    </div>
                    <div style={{ color: '#666', fontSize: '13px' }}>
                      {scan.farm_id} • {scan.confidence ? Math.round(scan.confidence * 100) + '%' : ''} confidence
                    </div>
                    <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                      {new Date(scan.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <Badge
                      style={{
                        background: severityColors[scan.severity] || '#666',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        marginBottom: '4px'
                      }}
                    >
                      {scan.severity}
                    </Badge>
                    <div style={{ display: 'block' }}>
                      {scan.image_url && (
                        <img
                          src={scan.image_url}
                          alt="Scan"
                          style={{
                            width: '48px',
                            height: '48px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            marginTop: '4px',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}