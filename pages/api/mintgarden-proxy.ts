import type { NextApiRequest, NextApiResponse } from 'next'

// Type definitions
interface BadgeData {
  name: string
  emoji: string
  points: number
}

interface ApiResponse {
  badge: BadgeData | null
}

interface ErrorResponse {
  error: string
}

interface MintgardenOfferResponse {
  nft_id: string
}

interface MintgardenMetadataResponse {
  attributes?: Array<{
    trait_type: string
    value: string
  }>
}

// API proxy to avoid CORS issues with Mint Garden API
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { offerId } = req.query

  if (!offerId || typeof offerId !== 'string') {
    return res.status(400).json({ error: 'offerId is required' })
  }

  try {
    // First get the NFT ID from the offer
    const offerResponse = await fetch(`https://api.mintgarden.io/offers/${offerId}`)
    if (!offerResponse.ok) {
      throw new Error(`Failed to fetch offer: ${offerResponse.status}`)
    }
    
    const offerData: MintgardenOfferResponse = await offerResponse.json()
    const nftId = offerData.nft_id

    if (!nftId) {
      throw new Error('No NFT ID found in offer')
    }

    // Then get the metadata using the NFT ID
    const metadataResponse = await fetch(`https://api.mintgarden.io/nfts/${nftId}/metadata`)
    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch metadata: ${metadataResponse.status}`)
    }

    const metadata: MintgardenMetadataResponse = await metadataResponse.json()
    
    // Extract badge information from metadata
    const badge = metadata.attributes?.find(attr => 
      attr.trait_type === 'Badge' || attr.trait_type === 'badge'
    )
    
    const badgeData: BadgeData | null = badge ? {
      name: badge.value,
      emoji: getBadgeEmoji(badge.value),
      points: getBadgePoints(badge.value)
    } : null

    res.status(200).json({ badge: badgeData })
    
  } catch (error) {
    console.error('Error fetching badge info:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: errorMessage })
  }
}

function getBadgeEmoji(badgeName: string): string {
  const badges: Record<string, string> = {
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
  return badges[badgeName] || '🏷️'
}

function getBadgePoints(badgeName: string): number {
  const points: Record<string, number> = {
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
  return points[badgeName] || 0
}
