import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.NEWS_API_KEY
    if (!apiKey) {
      throw new Error('NewsAPI key not configured')
    }

    const url = `https://newsapi.org/v2/everything?` +
      `q=agriculture+India+farming+crop&` +
      `language=en&sortBy=publishedAt&pageSize=5&` +
      `apiKey=${apiKey}`

    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`)
    }

    const data = await response.json()

    return NextResponse.json(data.articles || [])
  } catch (err) {
    console.error('News API error:', err)
    // Return fallback hardcoded articles if API fails
    return NextResponse.json([
      {
        title: "IMD forecasts good monsoon for Kharif 2025",
        description: "Indian Meteorological Department predicts above-normal rainfall for the upcoming Kharif season, bringing hope to farmers across India.",
        url: "https://krishijagran.com",
        publishedAt: new Date().toISOString(),
        source: { name: "Krishi Jagran" }
      },
      {
        title: "Tomato Early Blight spreading in TN — spray alert issued",
        description: "Agriculture department issues advisory for Tamil Nadu farmers as Early Blight disease spreads in tomato crops. Immediate treatment recommended.",
        url: "https://agriculturalpost.com",
        publishedAt: new Date().toISOString(),
        source: { name: "Agricultural Post" }
      },
      {
        title: "PM-KISAN 19th installment released — check status",
        description: "Government releases next installment of PM-KISAN scheme. Eligible farmers can check their payment status online.",
        url: "https://pmkisan.gov.in",
        publishedAt: new Date().toISOString(),
        source: { name: "PM-KISAN Portal" }
      }
    ])
  }
}