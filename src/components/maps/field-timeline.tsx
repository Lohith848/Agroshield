"use client"

"use client"

import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

interface Scan {
  date: string
  severity: 'healthy' | 'mild' | 'moderate' | 'severe'
  disease: string | null
}

interface FieldTimelineProps {
  fieldId: string | null
}

export function FieldTimeline({ fieldId }: FieldTimelineProps) {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!fieldId) return

    const fetchScans = async () => {
      setLoading(true)
      try {
        if (!supabase) {
          console.error('Supabase not initialized')
          setLoading(false)
          return
        }
        const { data, error } = await supabase!
          .from('scans')
          .select('created_at, severity, disease_class')
          .eq('farm_id', fieldId)
          .order('created_at', { ascending: true })
          .limit(20)

        if (error) throw error

        setScans(
          (data || []).map(s => ({
            date: s.created_at,
            severity: s.severity as 'healthy' | 'mild' | 'moderate' | 'severe',
            disease: s.disease_class
          }))
        )
      } catch (err) {
        console.error('Error fetching scans:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchScans()
  }, [fieldId])

  if (!fieldId) return null

  const severityToNum: Record<string, number> = { healthy: 0, mild: 1, moderate: 2, severe: 3 }
  const severityLabels = ['Healthy', 'Mild', 'Moderate', 'Severe']

  const labels = scans.map(s => new Date(s.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }))
  const dataPoints = scans.map(s => severityToNum[s.severity] || 0)

  const chartData = {
    labels,
    datasets: [{
      label: 'Disease Severity',
      data: dataPoints,
      borderColor: '#16a34a',
      backgroundColor: 'rgba(22,163,74,0.1)',
      pointBackgroundColor: dataPoints.map(d =>
        d === 0 ? '#16a34a' : d === 1 ? '#ca8a04' : d === 2 ? '#ea580c' : '#dc2626'
      ),
      pointRadius: 6,
      tension: 0.3,
      fill: true
    }]
  }

  const options = {
    scales: {
      y: {
        min: 0,
        max: 3,
        stepSize: 1,
        ticks: {
          callback: function (value: string | number) {
            return severityLabels[value as number] || ''
          }
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const s = scans[ctx.dataIndex]
            return `${severityLabels[ctx.raw]} — ${s.disease || 'No disease'}`
          }
        }
      }
    }
  }

  return (
    <div style={{
      background: "#fff",
      padding: "16px",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      marginTop: "16px"
    }}>
      <div style={{ fontWeight: "700", marginBottom: "12px", fontSize: "15px" }}>
        📈 Field Health Timeline
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
          Loading timeline...
        </div>
      ) : scans.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
          No scans yet for this field.
        </div>
      ) : (
        <Line data={chartData} options={options as any} />
      )}
    </div>
  )
}