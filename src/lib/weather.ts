// OpenWeather API utilities
const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5'

export interface WeatherData {
  temperature: number
  humidity: number
  description: string
  wind_speed: number
  pressure: number
  feels_like: number
  icon: string
  location: string
  timestamp: number
}

export interface SoilMoistureData {
  dt: number
  t10: number // Temperature at 10cm depth (Kelvin)
  moisture: number // Soil moisture m3/m3
  t0: number // Surface temperature (Kelvin)
}

export async function getWeatherByCoords(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    if (!OPENWEATHER_API_KEY) {
      console.error('OpenWeather API key not configured')
      return null
    }

    const url = `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      wind_speed: data.wind.speed,
      pressure: data.main.pressure,
      feels_like: Math.round(data.main.feels_like),
      icon: data.weather[0].icon,
      location: data.name,
      timestamp: data.dt
    }
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

export async function getWeatherByCity(city: string): Promise<WeatherData | null> {
  try {
    if (!OPENWEATHER_API_KEY) {
      console.error('OpenWeather API key not configured')
      return null
    }

    const url = `${OPENWEATHER_BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      wind_speed: data.wind.speed,
      pressure: data.main.pressure,
      feels_like: Math.round(data.main.feels_like),
      icon: data.weather[0].icon,
      location: data.name,
      timestamp: data.dt
    }
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

// AgroMonitoring API - Soil Moisture
const AGROMONITORING_API_KEY = process.env.NEXT_PUBLIC_AGROMONITORING_API_KEY
const AGROMONITORING_BASE_URL = 'https://api.agromonitoring.com/agro/1.0'

export async function getSoilMoisture(polyId: string): Promise<SoilMoistureData | null> {
  try {
    if (!AGROMONITORING_API_KEY) {
      console.error('AgroMonitoring API key not configured')
      return null
    }

    const url = `${AGROMONITORING_BASE_URL}/soil?polyid=${polyId}&appid=${AGROMONITORING_API_KEY}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Soil moisture API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching soil moisture:', error)
    return null
  }
}

// NewsAPI - Agricultural News
const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY
const NEWS_BASE_URL = 'https://newsapi.org/v2'

export interface NewsArticle {
  title: string
  description: string
  url: string
  imageUrl: string
  publishedAt: string
  source: string
}

export async function getAgriculturalNews(): Promise<NewsArticle[]> {
  try {
    if (!NEWS_API_KEY) {
      console.error('NewsAPI key not configured')
      return []
    }

    // Search for agriculture, farming, weather, crop related news
    const query = encodeURIComponent('agriculture OR farming OR crops OR weather OR soil OR irrigation')
    const url = `${NEWS_BASE_URL}/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`News API error: ${response.statusText}`)
    }

    const data = await response.json()

    return data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      imageUrl: article.urlToImage || '',
      publishedAt: article.publishedAt,
      source: article.source?.name || 'News'
    }))
  } catch (error) {
    console.error('Error fetching agricultural news:', error)
    return []
  }
}

// Get weather icon URL
export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`
}

// Convert Kelvin to Celsius
export function kelvinToCelsius(kelvin: number): number {
  return Math.round(kelvin - 273.15)
}
