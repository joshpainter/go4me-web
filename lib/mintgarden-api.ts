/**
 * Utility functions for interacting with Mint Garden API
 */

// Type definitions
export interface BadgeInfo {
  name: string
  emoji: string
  points: number
  maxCopies?: number
}

export interface BadgeTier extends BadgeInfo {
  maxCopies: number
}

export interface MintGardenOffer {
  nft_id?: string
  nftId?: string
  id?: string
}

export interface NftMetadata {
  [key: string]: any
}

export interface BadgeInfoResponse {
  badgeName: string
  emoji: string
  points: number
  nftIds: string[]
  totalOffers: number
  error?: string
}

const MINTGARDEN_BASE_URL = 'https://api.mintgarden.io'
const COLLECTION_ID = 'col15qqmhl9gmra3h07av2mcpqpqqza92n33xvcu35gahgzzhy96j2ls6faz5t'

/**
 * Badge emoji mapping based on the how-it-works page
 */
const BADGE_EMOJIS: Record<string, string> = {
  'Crown': '👑',
  'Diamond': '💎',
  'Lucky Hat': '🎩',
  'Rocket': '🚀',
  'Snorkel': '🤿',
  'Fireball': '🔥',
  'Moon': '🌙',
  'Basketball': '🏀',
  'Tractor': '🚜',
  'Seedling': '🌱'
}

/**
 * Badge points mapping based on the how-it-works page
 */
const BADGE_POINTS: Record<string, number> = {
  'Crown': 100,
  'Diamond': 90,
  'Lucky Hat': 80,
  'Rocket': 70,
  'Snorkel': 60,
  'Fireball': 50,
  'Moon': 40,
  'Basketball': 30,
  'Tractor': 20,
  'Seedling': 10
}

/**
 * Fetch NFT offers from Mint Garden API filtered by badge type
 */
export async function getMintGardenOffersByBadge(badgeType: string = 'Diamond'): Promise<MintGardenOffer[]> {
  try {
    // Try multiple API endpoints to find the right one
    const endpoints = [
      // Original endpoint
      `${MINTGARDEN_BASE_URL}/collections/${COLLECTION_ID}/nfts/by_offers?filter=Badge&filter_value=${encodeURIComponent(badgeType)}`,
      // Alternative NFTs endpoint with correct collection ID
      `${MINTGARDEN_BASE_URL}/nfts/col_1laevmkgaa2mrbyvg3hp4rg8793p4aqu8x5c7ek9rb3wn84xqyp5rsqr6an7/nfts?badge_name=${encodeURIComponent(badgeType)}&limit=50`,
      // Offers endpoint
      `${MINTGARDEN_BASE_URL}/offers?collection_id=col_1laevmkgaa2mrbyvg3hp4rg8793p4aqu8x5c7ek9rb3wn84xqyp5rsqr6an7&badge_name=${encodeURIComponent(badgeType)}&limit=50`
    ]

    let lastError: Error | null = null

    for (const [index, url] of endpoints.entries()) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        // Try different response formats
        const items: MintGardenOffer[] = data?.items || data?.nfts || data?.offers || []

        if (items.length > 0) {
          return items
        }
      } catch (error) {
        lastError = error as Error
      }
    }

    // If all endpoints failed, throw the last error
    throw lastError || new Error('All Mint Garden API endpoints failed')
  } catch (error) {
    console.error('Error fetching Mint Garden offers:', error)
    throw error
  }
}

/**
 * Get NFT metadata from Mint Garden API
 */
export async function getNftMetadata(nftId: string): Promise<NftMetadata> {
  try {
    const url = `${MINTGARDEN_BASE_URL}/nfts/${nftId}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Mint Garden NFT API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching NFT metadata:', error)
    throw error
  }
}

/**
 * Get all available badge types with their emojis and points
 */
export function getAllBadgeTypes(): BadgeInfo[] {
  return Object.keys(BADGE_EMOJIS).map(badgeName => ({
    name: badgeName,
    emoji: BADGE_EMOJIS[badgeName],
    points: BADGE_POINTS[badgeName]
  }))
}

/**
 * Get badge emoji for a given badge name
 */
export function getBadgeEmoji(badgeName: string): string {
  return BADGE_EMOJIS[badgeName] || '❓'
}

/**
 * Get badge points for a given badge name
 */
export function getBadgePoints(badgeName: string): number {
  return BADGE_POINTS[badgeName] || 0
}

/**
 * Extract NFT IDs from Mint Garden offers response
 */
export function extractNftIds(offers: MintGardenOffer[]): string[] {
  if (!Array.isArray(offers)) {
    return []
  }

  return offers
    .map(offer => offer?.nft_id || offer?.nftId || offer?.id)
    .filter((id): id is string => Boolean(id))
}

/**
 * Badge tier thresholds based on total copies sold
 * Lower numbers = rarer badges (fewer copies sold)
 */
const BADGE_TIERS: BadgeTier[] = [
  { name: 'Crown', maxCopies: 1, emoji: '👑', points: 100 },
  { name: 'Diamond', maxCopies: 5, emoji: '💎', points: 90 },
  { name: 'Lucky Hat', maxCopies: 10, emoji: '🎩', points: 80 },
  { name: 'Rocket', maxCopies: 20, emoji: '🚀', points: 70 },
  { name: 'Snorkel', maxCopies: 35, emoji: '🤿', points: 60 },
  { name: 'Fireball', maxCopies: 55, emoji: '🔥', points: 50 },
  { name: 'Moon', maxCopies: 80, emoji: '🌙', points: 40 },
  { name: 'Basketball', maxCopies: 110, emoji: '🏀', points: 30 },
  { name: 'Tractor', maxCopies: 150, emoji: '🚜', points: 20 },
  { name: 'Seedling', maxCopies: Infinity, emoji: '🌱', points: 10 }
]

/**
 * Determine what badge a user will get for their next mint based on current total sold
 */
export function getNextMintBadge(currentTotalSold: number = 0): BadgeTier {
  const nextMintCount = currentTotalSold + 1

  // Find the appropriate badge tier for the next mint
  const badgeTier = BADGE_TIERS.find(tier => nextMintCount <= tier.maxCopies)

  if (!badgeTier) {
    // Fallback to Seedling if somehow no tier matches
    return BADGE_TIERS[BADGE_TIERS.length - 1]
  }

  return badgeTier
}

/**
 * Determine what badge a user currently has based on their total sold
 */
export function getCurrentBadge(currentTotalSold: number = 0): BadgeTier | null {
  if (currentTotalSold === 0) {
    return null // No badge if nothing sold yet
  }

  // Find the appropriate badge tier for the current total sold
  // We want the badge for the highest tier they've achieved
  let currentBadge: BadgeTier | null = null

  for (let i = BADGE_TIERS.length - 1; i >= 0; i--) {
    const tier = BADGE_TIERS[i]
    if (currentTotalSold >= tier.maxCopies) {
      currentBadge = tier
      break
    }
  }

  // If no tier matches (shouldn't happen), return the lowest tier
  return currentBadge || BADGE_TIERS[BADGE_TIERS.length - 1]
}

/**
 * Fetch badge information for display in how-it-works
 */
export async function getBadgeInfo(badgeType: string = 'Diamond'): Promise<BadgeInfoResponse> {
  try {
    const offers = await getMintGardenOffersByBadge(badgeType)
    const nftIds = extractNftIds(offers)

    return {
      badgeName: badgeType,
      emoji: getBadgeEmoji(badgeType),
      points: getBadgePoints(badgeType),
      nftIds: nftIds.slice(0, 5), // Return first 5 NFT IDs as examples
      totalOffers: offers.length
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      badgeName: badgeType,
      emoji: getBadgeEmoji(badgeType),
      points: getBadgePoints(badgeType),
      nftIds: [],
      totalOffers: 0,
      error: errorMessage
    }
  }
}
