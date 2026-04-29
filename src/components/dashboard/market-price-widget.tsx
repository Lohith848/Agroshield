"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MarketPriceWidgetProps {
  cropType?: string
}

export function MarketPriceWidget({ cropType }: MarketPriceWidgetProps) {
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cropType) {
      setLoading(false)
      return
    }

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/market-prices?crop=${encodeURIComponent(cropType)}&state=Tamil%20Nadu`)
        if (!res.ok) throw new Error('Failed to fetch prices')
        const data = await res.json()
        setPrices(data)
      } catch (err) {
        console.error('Error fetching market prices:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
  }, [cropType])

  if (!cropType) return null

  return (
    <div style={{
      background: "#fff",
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}>
      <div style={{ fontWeight: "700", marginBottom: "12px" }}>
        💰 Today's Mandi Price — {cropType}
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "12px", color: "#666" }}>
          Loading prices...
        </div>
      ) : prices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "12px", color: "#666" }}>
          No prices available
        </div>
      ) : (
        <div>
          {prices.map((p, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: i < prices.length - 1 ? "1px solid #f3f4f6" : "none",
              fontSize: "14px"
            }}>
              <span>{p.Market}</span>
              <span style={{ fontWeight: "700", color: "#16a34a" }}>
                ₹{p.Modal_x0020_Price}/q
              </span>
              <span style={{ fontSize: "12px", color: "#666" }}>
                ₹{p.Min_x0020_Price}–{p.Max_x0020_Price}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}