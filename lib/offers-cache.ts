/**
 * Server-side caching for offers data to improve performance
 */

import { getAllCollectionOffers, filterOffersByUsername, DexieOffer } from './dexie-api'

/**
 * Mintgarden NFT metadata interface
 */
interface MintgardenNFTMetadata {
  id: string
  encoded_id: string
  data: {
    metadata_json: {
      attributes?: Array<{
        trait_type: string
        value: string
      }>
    }
  }
}

interface CacheEntry {
  data: DexieOffer[]
  timestamp: number
  expiresAt: number
}

export interface CollectionOffer {
  id: string
  nft_id: string
  nft_name: string
  nft_encoded_id: string
  thumbnail_uri: string
  offer_id: string
  price_amount: number
  price_asset: string
  price_display: string
  created_at: string
  username: string | null
  badge_name: string | null
  badge_emoji: string | null
}

interface ProcessedOffer extends CollectionOffer {}

// In-memory cache
const cache = new Map<string, CacheEntry>()

// Cache TTL configurations (optimised for production)
// RAW_OFFERS and PROCESSED_OFFERS set to 2 minutes to keep cross-domain views in sync
const CACHE_TTL = {
  RAW_OFFERS: 2 * 60 * 1000,      // 2 minutes - offers change frequently
  PROCESSED_OFFERS: 2 * 60 * 1000, // 2 minutes - keep consistent across domains
  NFT_METADATA: 24 * 60 * 60 * 1000, // 24 hours - metadata rarely changes
  FAILED_REQUESTS: 2 * 60 * 1000    // 2 minutes - retry failed requests sooner
}

// Cache size limits to prevent memory issues
const CACHE_LIMITS = {
  MAX_RAW_OFFERS: 1000,
  MAX_PROCESSED_OFFERS: 500,
  MAX_NFT_METADATA: 2000
}

// Cache key for all offers
const ALL_OFFERS_KEY = 'all_collection_offers'

// Enhanced rate limiting with burst capacity
const apiCallTimestamps: number[] = []
const MAX_API_CALLS_PER_MINUTE = 30 // Increased for better performance
const BURST_CAPACITY = 10 // Allow burst of 10 calls

// Performance metrics
let cacheStats = {
  hits: 0,
  misses: 0,
  apiCalls: 0,
  errors: 0,
  lastReset: Date.now()
}

// Cache for NFT metadata from Mintgarden
const nftMetadataCache = new Map<string, { data: MintgardenNFTMetadata | null, timestamp: number, expiresAt: number }>()

/**
 * Fetch NFT metadata from Mintgarden API
 */
async function fetchNFTMetadata(nftId: string): Promise<MintgardenNFTMetadata | null> {
  const now = Date.now()
  const cached = nftMetadataCache.get(nftId)

  // Return cached data if still valid
  if (cached && now < cached.expiresAt) {
    return cached.data
  }

  try {
    // Check rate limiting before making API call
    checkRateLimit()

    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`https://api.mintgarden.io/nfts/${nftId}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Mintgarden API error: ${response.status}`)
    }

    const metadata: MintgardenNFTMetadata = await response.json()

    // Cache the metadata (24 hour TTL since NFT metadata doesn't change often)
    nftMetadataCache.set(nftId, {
      data: metadata,
      timestamp: now,
      expiresAt: now + (24 * 60 * 60 * 1000) // 24 hours
    })

    return metadata
  } catch (error) {
    // Handle timeout and other errors gracefully
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Mintgarden API timeout for ${nftId}`)
    } else {
    console.warn(`Failed to fetch NFT metadata for ${nftId}:`, error)
    }

    // Cache null result for 2 minutes to avoid repeated failed requests (reduced from 5 minutes)
    nftMetadataCache.set(nftId, {
      data: null,
      timestamp: now,
      expiresAt: now + (2 * 60 * 1000) // 2 minutes
    })

    return null
  }
}

/**
 * Extract badge information from Mintgarden NFT metadata
 */
function extractBadgeFromMetadata(metadata: MintgardenNFTMetadata | null): { name: string | null, emoji: string | null } {
  if (!metadata?.data?.metadata_json?.attributes) {
    return { name: null, emoji: null }
  }

  // Look for badge attribute in metadata
  const badgeAttribute = metadata.data.metadata_json.attributes.find(
    attr => attr.trait_type?.toLowerCase() === 'badge' || attr.trait_type?.toLowerCase() === 'rarity'
  )

  if (!badgeAttribute?.value) {
    return { name: null, emoji: null }
  }

  const badgeName = badgeAttribute.value
  const badgeEmoji = getBadgeEmoji(badgeName)

  return { name: badgeName, emoji: badgeEmoji }
}

/**
 * Check rate limiting for API calls
 */
function checkRateLimit(): void {
  const now = Date.now()
  const oneMinuteAgo = now - 60 * 1000

  // Remove timestamps older than 1 minute
  while (apiCallTimestamps.length > 0 && apiCallTimestamps[0] < oneMinuteAgo) {
    apiCallTimestamps.shift()
  }

  // Check if we've exceeded the rate limit
  if (apiCallTimestamps.length >= MAX_API_CALLS_PER_MINUTE) {
    throw new Error('Rate limit exceeded. Please try again later.')
  }

  // Add current timestamp
  apiCallTimestamps.push(now)
}

/**
 * Get all collection offers with caching
 */
async function getCachedAllOffers(): Promise<DexieOffer[]> {
  const now = Date.now()
  const cached = cache.get(ALL_OFFERS_KEY)

  // Return cached data if still valid
  if (cached && now < cached.expiresAt) {
    return cached.data
  }

  // Check rate limiting before making API call
  checkRateLimit()

  // Fetch fresh data
  const offers = await getAllCollectionOffers()
  
  // Cache the data
  cache.set(ALL_OFFERS_KEY, {
    data: offers,
    timestamp: now,
    expiresAt: now + CACHE_TTL.RAW_OFFERS
  })
  
  // Clean up expired entries
  cleanupExpiredEntries()
  
  return offers
}

/**
 * Cache for processed offers by username to avoid reprocessing
 */
const processedOffersCache = new Map<string, { data: ProcessedOffer[], timestamp: number, expiresAt: number }>()

/**
 * Validate and sanitize username input
 */
function validateUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    throw new Error('Invalid username: must be a non-empty string')
  }

  // Remove any potentially dangerous characters and limit length
  const sanitized = username.trim().slice(0, 50).replace(/[<>'"&]/g, '')

  if (!sanitized) {
    throw new Error('Invalid username: contains only invalid characters')
  }

  return sanitized
}

/**
 * Sanitize string data from external APIs
 */
function sanitizeString(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') {
    return null
  }

  // Remove potentially dangerous characters and limit length
  return input.trim().slice(0, 200).replace(/[<>'"&]/g, '')
}

/**
 * Get offers for a specific user with caching (both raw offers and processed results)
 */
export async function getCachedUserOffers(username: string): Promise<ProcessedOffer[]> {
  try {
    // Validate and sanitize input
    const sanitizedUsername = validateUsername(username)
    const now = Date.now()
    const cacheKey = sanitizedUsername.toLowerCase() // Normalize for cache key

    // Check if we have cached processed offers for this user
    const cachedProcessed = processedOffersCache.get(cacheKey)
    if (cachedProcessed && now < cachedProcessed.expiresAt) {
      return cachedProcessed.data
    }

    // Get all offers (cached at the raw level)
    const allOffers = await getCachedAllOffers()

    // Filter by username (case-insensitive)
    const userOffers = filterOffersByUsername(allOffers, sanitizedUsername)

    // Filter for valid offers (single NFT only) first
    const validOffers = userOffers.filter(offer => {
      return offer.offered &&
             offer.offered.length === 1 &&
             offer.offered[0] &&
             offer.offered[0].is_nft
    })

    // Transform to processed format, fetching metadata for each valid offer
    const processedOffers = await Promise.all(validOffers.map(async offer => {
      const nft = offer.offered[0]

      // Determine what asset is being requested
      const requestedAsset = offer.requested[0] // Get the first requested asset
      let priceAmount = Math.max(0, parseFloat(offer.price.toString() || '0'))
      let priceAsset = 'XCH'
      let priceDisplay = `${priceAmount.toFixed(3)} XCH`

      if (requestedAsset) {
        // Determine asset type and display
        if (requestedAsset.code === 'XCH' || requestedAsset.name === 'Chia') {
          priceAsset = 'XCH'
          // For XCH offers, use the offer.price field which should already be in XCH
          priceAmount = Math.max(0, parseFloat(offer.price.toString() || '0'))
          if (priceAmount === 0) {
            priceDisplay = 'Free'
          } else if (priceAmount < 0.001) {
            // Show milliXCH for very small amounts
            priceDisplay = `${(priceAmount * 1000).toFixed(1).replace(/\.0$/, '')}m XCH`
          } else if (priceAmount < 1) {
            // Show 3 decimal places for amounts less than 1 XCH
            priceDisplay = `${priceAmount.toFixed(3).replace(/\.?0+$/, '')} XCH`
          } else if (priceAmount < 10) {
            // Show 2 decimal places for amounts 1-10 XCH
            priceDisplay = `${priceAmount.toFixed(2).replace(/\.?0+$/, '')} XCH`
          } else {
            // Show 1 decimal place for larger amounts, or no decimals if whole number
            priceDisplay = `${priceAmount.toFixed(1).replace(/\.0$/, '')} XCH`
          }
        } else {
          // CAT token or other asset - use the requested amount
          priceAmount = Math.max(0, parseFloat(requestedAsset.amount.toString() || '0'))
          priceAsset = requestedAsset.code || requestedAsset.name || 'Unknown'

          // Format CAT tokens nicely
          if (priceAmount >= 1000000) {
            priceDisplay = `${(priceAmount / 1000000).toFixed(1).replace(/\.0$/, '')}M ${priceAsset}`
          } else if (priceAmount >= 1000) {
            priceDisplay = `${(priceAmount / 1000).toFixed(1).replace(/\.0$/, '')}K ${priceAsset}`
          } else {
            priceDisplay = `${priceAmount.toLocaleString()} ${priceAsset}`
          }
        }
      }

      const nftUsername = extractUsernameFromName(nft.name || '')

      // Fetch badge information from Mintgarden metadata
      let badgeName: string | null = null
      let badgeEmoji: string | null = null

      try {
        const metadata = await fetchNFTMetadata(nft.encoded_id || nft.id)
        const badgeInfo = extractBadgeFromMetadata(metadata)
        badgeName = badgeInfo.name
        badgeEmoji = badgeInfo.emoji

        // Debug logging for badge extraction
        if (process.env.NODE_ENV === 'development') {
          const encodedId = metadata?.encoded_id || nft.encoded_id || null
          console.log('NFT ID:', nft.id)
          console.log('NFT encoded_id:', encodedId)
          console.log('NFT name:', nft.name)
          console.log('Metadata badge info:', badgeInfo)
        }
      } catch (error) {
        console.warn('Failed to fetch badge info for NFT:', nft.id, error)
        // Fallback to name-based extraction
        badgeName = extractBadgeFromName(nft.name || '')
        badgeEmoji = badgeName ? getBadgeEmoji(badgeName) : null
      }

      return {
        id: sanitizeString(nft.id) || '',
        nft_id: sanitizeString(nft.id) || '',
        nft_name: sanitizeString(nft.name) || 'Unknown NFT',
        nft_encoded_id: sanitizeString(nft.encoded_id) || '',
        thumbnail_uri: sanitizeString(nft.preview?.medium || nft.preview?.tiny) || '',
        offer_id: sanitizeString(offer.id) || '',
        price_amount: priceAmount,
        price_asset: priceAsset,
        price_display: priceDisplay,
        created_at: sanitizeString(offer.date_found) || new Date().toISOString(),
        username: sanitizeString(nftUsername) || null,
        badge_name: sanitizeString(badgeName) || null,
        badge_emoji: sanitizeString(badgeEmoji) || null
      }
    }))

    // Filter out any null results
    const validProcessedOffers = processedOffers.filter((offer): offer is ProcessedOffer => offer !== null)

    // Sort by price (lowest first) - prioritize XCH offers, then G4M, then other tokens
    validProcessedOffers.sort((a, b) => {
      // Prioritize XCH offers first
      if (a.price_asset === 'XCH' && b.price_asset !== 'XCH') return -1
      if (a.price_asset !== 'XCH' && b.price_asset === 'XCH') return 1

      // Then prioritize G4M offers over other CAT tokens
      if (a.price_asset === 'G4M' && b.price_asset !== 'G4M' && b.price_asset !== 'XCH') return -1
      if (a.price_asset !== 'G4M' && b.price_asset === 'G4M' && a.price_asset !== 'XCH') return 1

      // If same asset type, sort by amount
      return a.price_amount - b.price_amount
    })

    // Cache the processed results for this user
    processedOffersCache.set(cacheKey, {
      data: validProcessedOffers,
      timestamp: now,
      expiresAt: now + CACHE_TTL.PROCESSED_OFFERS
    })

    return validProcessedOffers
  } catch (error) {
    // Log error but don't expose internal details
    console.error('Error getting cached user offers:', error instanceof Error ? error.message : 'Unknown error')
    return []
  }
}

/**
 * Extract username from NFT name (e.g., "go4.me | 🌱 Josh Painter | @endertown" -> "endertown")
 */
function extractUsernameFromName(name: string): string | null {
  const parts = name.split(' | ')
  if (parts.length >= 3) {
    const usernamePart = parts[2].trim()
    return usernamePart.startsWith('@') ? usernamePart.substring(1) : usernamePart
  }
  return null
}

/**
 * Extract badge from NFT name (e.g., "go4.me | 🌱 Josh Painter | @endertown" -> "Seedling")
 */
function extractBadgeFromName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return null
  }

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
    'Seedling': '🌱',
    // Legacy badges (keeping for backward compatibility)
    'Sapling': '🌿',
    'Tree': '🌳',
    'Forest': '🌲',
    'Gold': '🥇',
    'Silver': '🥈',
    'Bronze': '🥉'
  }

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('Extracting badge from name:', name)
  }

  // Method 1: Try standard format "go4.me | 🌱 Josh Painter | @endertown"
  const parts = name.split(' | ')
  if (parts.length >= 2) {
    const badgePart = parts[1].trim()

    if (process.env.NODE_ENV === 'development') {
      console.log('Badge part from split:', badgePart)
    }

    // Try to find badge by emoji in the badge part
    for (const [badgeName, emoji] of Object.entries(BADGE_EMOJIS)) {
      if (badgePart.includes(emoji)) {
        return badgeName
      }
    }
  }

  // Method 2: Search for any badge emoji anywhere in the name
  for (const [badgeName, emoji] of Object.entries(BADGE_EMOJIS)) {
    if (name.includes(emoji)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Found badge emoji in full name:', badgeName, emoji)
      }
      return badgeName
    }
  }

  // Method 3: Try to find badge name as text (case insensitive)
  const lowerName = name.toLowerCase()
  for (const badgeName of Object.keys(BADGE_EMOJIS)) {
    if (lowerName.includes(badgeName.toLowerCase())) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Found badge name as text:', badgeName)
      }
      return badgeName
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('No badge found in name:', name)
  }

  return null
}

/**
 * Get badge emoji from badge name
 */
function getBadgeEmoji(badgeName: string): string | null {
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
    'Seedling': '🌱',
    // Legacy badges (keeping for backward compatibility)
    'Sapling': '🌿',
    'Tree': '🌳',
    'Forest': '🌲',
    'Gold': '🥇',
    'Silver': '🥈',
    'Bronze': '🥉'
  }

  return BADGE_EMOJIS[badgeName] || null
}

/**
 * Clean up expired cache entries (raw offers, processed offers, and NFT metadata)
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()

  // Clean up raw offers cache
  for (const [key, entry] of cache.entries()) {
    if (now >= entry.expiresAt) {
      cache.delete(key)
    }
  }

  // Clean up processed offers cache
  for (const [key, entry] of processedOffersCache.entries()) {
    if (now >= entry.expiresAt) {
      processedOffersCache.delete(key)
    }
  }

  // Clean up NFT metadata cache
  for (const [key, entry] of nftMetadataCache.entries()) {
    if (now >= entry.expiresAt) {
      nftMetadataCache.delete(key)
    }
  }
}

/**
 * Clear all cache entries (useful for testing or manual refresh)
 */
export function clearOffersCache(): void {
  cache.clear()
  processedOffersCache.clear()
  nftMetadataCache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  rawOffers: { size: number, entries: Array<{ key: string, expiresIn: number }> },
  processedOffers: { size: number, entries: Array<{ key: string, expiresIn: number }> }
} {
  const now = Date.now()

  const rawEntries = Array.from(cache.entries()).map(([key, entry]) => ({
    key,
    expiresIn: Math.max(0, entry.expiresAt - now)
  }))

  const processedEntries = Array.from(processedOffersCache.entries()).map(([key, entry]) => ({
    key,
    expiresIn: Math.max(0, entry.expiresAt - now)
  }))

  return {
    rawOffers: {
      size: cache.size,
      entries: rawEntries
    },
    processedOffers: {
      size: processedOffersCache.size,
      entries: processedEntries
    }
  }
}
