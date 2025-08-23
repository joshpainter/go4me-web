// Shared site constants
export interface SiteConfig {
  name: string
  url: string
  description: string
  defaultMetaDescription: string
  logo: string
  banner: string
  twitter: string
  twitterUrl: string
  author: string
}

export const SITE_CONFIG: SiteConfig = {
  name: 'go4.me',
  url: 'https://go4.me',
  description: 'Chia NFT leaderboard and custom PFP marketplace',
  defaultMetaDescription: 'Chia NFT leaderboard and custom PFP marketplace. Claim your free go4.me profile NFT and earn royalties when others collect it.',
  logo: 'https://go4.me/collection-icon.png',
  banner: 'https://go4.me/collection-banner.png',
  twitter: '@go4mebot',
  twitterUrl: 'https://twitter.com/go4mebot',
  author: 'go4.me'
}

// Sitemap configuration constants
export const SITEMAP_CONFIG = {
  PAGE_SIZE: 1000,
  MAX_USERS: 10000
}
