import type { CoreTypes, ProposalTypes } from '@walletconnect/types'
import { CHAIN_ID } from './env'

export enum ChiaMethod {
  LogIn = 'chia_logIn',
  GetWallets = 'chia_getWallets',
  GetTransaction = 'chia_getTransaction',
  GetWalletBalance = 'chia_getWalletBalance',
  GetCurrentAddress = 'chia_getCurrentAddress',
  SendTransaction = 'chia_sendTransaction',
  SignMessageById = 'chia_signMessageById',
  SignMessageByAddress = 'chia_signMessageByAddress',
  VerifySignature = 'chia_verifySignature',
  GetNextAddress = 'chia_getNextAddress',
  GetSyncStatus = 'chia_getSyncStatus',
  GetAllOffers = 'chia_getAllOffers',
  GetOffersCount = 'chia_getOffersCount',
  CreateOfferForIds = 'chia_createOfferForIds',
  CancelOffer = 'chia_cancelOffer',
  CheckOfferValidity = 'chia_checkOfferValidity',
  TakeOffer = 'chia_takeOffer',
  GetOfferSummary = 'chia_getOfferSummary',
  GetOfferData = 'chia_getOfferData',
  GetOfferRecord = 'chia_getOfferRecord',
  CreateNewCatWallet = 'chia_createNewCATWallet',
  GetCatWalletInfo = 'chia_getCATWalletInfo',
  GetCatAssetId = 'chia_getCATAssetId',
  SpendCat = 'chia_spendCAT',
  AddCatToken = 'chia_addCATToken',
  GetNfts = 'chia_getNFTs',
  GetNftInfo = 'chia_getNFTInfo',
  MintNft = 'chia_mintNFT',
  TransferNft = 'chia_transferNFT',
  GetNftsCount = 'chia_getNFTsCount',
  CreateNewDidWallet = 'chia_createNewDIDWallet',
  SetDidName = 'chia_setDIDName',
  SetNftDid = 'chia_setNFTDID',
  GetNftWalletsWithDids = 'chia_getNFTWalletsWithDIDs',
  GetWalletAddresses = 'chia_getWalletAddresses',
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

