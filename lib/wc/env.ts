export const PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || ''
export const RELAY_URL = process.env.NEXT_PUBLIC_WC_RELAY_URL || 'wss://relay.walletconnect.com'
export const rawChainId = (process.env.NEXT_PUBLIC_WC_CHAIN_ID || 'chia:mainnet').trim()
export const CHAIN_ID = rawChainId.toLowerCase().startsWith('chia:') ? rawChainId.toLowerCase() : 'chia:mainnet'

