// Agricultural News API utilities
import { getAgriculturalNews as fetchNews } from './weather'

export type NewsArticle = {
  title: string
  description: string
  url: string
  imageUrl: string
  publishedAt: string
  source: string
}

export async function getAgriculturalNews(): Promise<NewsArticle[]> {
  return fetchNews()
}

export function formatNewsDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    return `${diffInMinutes} minutes ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hours ago`
  } else if (diffInHours < 48) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short' 
    })
  }
}

export function getNewsCategory(url: string): string {
  const urlLower = url.toLowerCase()
  if (urlLower.includes('weather') || urlLower.includes('rain') || urlLower.includes('monsoon')) {
    return 'Weather'
  } else if (urlLower.includes('crop') || urlLower.includes('harvest') || urlLower.includes('seed')) {
    return 'Crops'
  } else if (urlLower.includes('soil') || urlLower.includes('fertilizer') || urlLower.includes('irrigation')) {
    return 'Soil & Water'
  } else if (urlLower.includes('pest') || urlLower.includes('disease') || urlLower.includes('organic')) {
    return 'Pest Control'
  } else if (urlLower.includes('market') || urlLower.includes('price') || urlLower.includes('mandi')) {
    return 'Market'
  } else {
    return 'General'
  }
}
