/**
 * Dexie API integration for fetching offers and NFT data
 */

const DEXIE_BASE_URL = 'https://api.dexie.space/v1'
const COLLECTION_ID = 'col15qqmhl9gmra3h07av2mcpqpqqza92n33xvcu35gahgzzhy96j2ls6faz5t'

/**
 * Dexie offer interface
 */
export interface DexieOffer {
  id: string
  status: number
  price: number
  date_found: string
  offered: Array<{
    is_nft: boolean
    id: string
    name: string
    encoded_id?: string
    preview?: {
      tiny?: string
      medium?: string
    }
  }>
  requested: Array<{
    id: string
    code: string
    name: string
    amount: number
  }>
}

/**
 * Dexie API response interface
 */
export interface DexieOffersResponse {
  success: boolean
  count: number
  page: number
  page_size: number
  offers: DexieOffer[]
}

/**
 * Fetch all active offers for the go4me collection from Dexie API
 * Pages through all results to ensure complete data
 */
export async function getAllCollectionOffers(): Promise<DexieOffer[]> {
  try {
    let allOffers: DexieOffer[] = []
    let page = 1
    let hasMorePages = true
    const pageSize = 100 // Maximum allowed by Dexie API

    while (hasMorePages) {
      const url = `${DEXIE_BASE_URL}/offers?offered_or_requested=${COLLECTION_ID}&status=0&sort=price&compact=true&page=${page}&page_size=${pageSize}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Dexie API error: ${response.status} ${response.statusText}`)
      }

      const data: DexieOffersResponse = await response.json()
      
      if (!data.success || !Array.isArray(data.offers)) {
        console.warn('Unexpected response format from Dexie API:', data)
        break
      }

      allOffers = allOffers.concat(data.offers)
      
      // Check if we have more pages
      const totalPages = Math.ceil(data.count / pageSize)
      hasMorePages = page < totalPages
      page++

      // Safety limit to prevent infinite loops
      if (page > 50) {
        console.warn('Reached maximum page limit (50) when fetching offers')
        break
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Fetched ${allOffers.length} total offers from ${page - 1} pages`)
    }
    return allOffers
  } catch (error) {
    console.error('Error fetching offers from Dexie API:', error)
    throw error
  }
}

/**
 * Filter offers by username from NFT names (case-insensitive)
 * Extracts username from NFT name format: "go4.me | Name | @username"
 */
export function filterOffersByUsername(offers: DexieOffer[], username: string): DexieOffer[] {
  // Input validation
  if (!username || typeof username !== 'string') {
    return []
  }

  const normalizedUsername = username.toLowerCase().trim()
  if (!normalizedUsername) {
    return []
  }

  return offers.filter(offer => {
    // Only process offers that have NFTs in the offered array
    if (!offer.offered || !Array.isArray(offer.offered) || offer.offered.length === 0) {
      return false
    }

    // Get the first NFT from the offered array (assuming one NFT per offer)
    const nft = offer.offered.find(item => item.is_nft) || offer.offered[0]

    if (!nft || !nft.name) {
      return false
    }

    // Extract username from NFT name (case-insensitive comparison)
    const extractedUsername = extractUsernameFromName(nft.name)
    return extractedUsername && extractedUsername.toLowerCase() === normalizedUsername
  })
}

/**
 * Extract username from NFT name (e.g., "go4.me | 🌱 Josh Painter | @endertown" -> "endertown")
 */
function extractUsernameFromName(name: string): string | undefined {
  if (!name || typeof name !== 'string') {
    return undefined
  }

  const parts = name.split(' | ')
  if (parts.length >= 3) {
    const usernamePart = parts[2].trim()
    // Remove @ symbol if present
    const username = usernamePart.startsWith('@') ? usernamePart.substring(1) : usernamePart

    // Basic validation - only allow alphanumeric, underscore, and common username characters
    if (/^[a-zA-Z0-9_.-]+$/.test(username) && username.length <= 50) {
      return username
    }
  }
  return undefined
}


