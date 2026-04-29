import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const crop = searchParams.get('crop') || 'Tomato'
  const state = searchParams.get('state') || 'Tamil Nadu'

  try {
    const apiKey = process.env.DATAGOVIN_API_KEY
    if (!apiKey) {
      throw new Error('Data.gov.in API key not configured')
    }

    const url = `https://api.data.gov.in/resource/` +
      `9ef84268-d588-465a-a308-a864a43d0070` +
      `?api-key=${apiKey}` +
      `&format=json&limit=5` +
      `&filters[State]=${encodeURIComponent(state)}` +
      `&filters[Commodity]=${encodeURIComponent(crop)}`

    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`Market prices API error: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data.records || [])
  } catch (err) {
    console.error('Market prices API error:', err)
    // Fallback mock data if API unavailable
    return NextResponse.json([
      {
        Market: "Coimbatore",
        Commodity: crop,
        Min_x0020_Price: "2400",
        Max_x0020_Price: "3200",
        Modal_x0020_Price: "2800",
        Arrival_Date: new Date().toLocaleDateString('en-IN')
      },
      {
        Market: "Chennai",
        Commodity: crop,
        Min_x0020_Price: "2600",
        Max_x0020_Price: "3400",
        Modal_x0020_Price: "3000",
        Arrival_Date: new Date().toLocaleDateString('en-IN')
      }
    ])
  }
}