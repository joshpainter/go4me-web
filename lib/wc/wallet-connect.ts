import type { CoreTypes, ProposalTypes } from '@walletconnect/types'
import { CHAIN_ID } from './env'

export enum ChiaMethod {
  SignMessageById = 'chia_signMessageById',
  SignMessageByAddress = 'chia_signMessageByAddress',
  TakeOffer = 'chia_takeOffer',
}

export const REQUIRED_NAMESPACES: ProposalTypes.RequiredNamespaces = {
  chia: {
    methods: Object.values(ChiaMethod),
    chains: [CHAIN_ID],
    events: [],
  },
}

export const METADATA: CoreTypes.Metadata = {
  name: 'go4.me',
  description: 'Chia NFT Leaderboard & Marketplace',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://go4.me',
  icons: [
    typeof window !== 'undefined' ? `${window.location.origin}/collection-icon.png` : 'https://go4.me/collection-icon.png',
    typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : 'https://go4.me/favicon.ico'
  ],
}

