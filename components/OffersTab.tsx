import { useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { Icon, Dropdown, Loader } from 'semantic-ui-react'
import { CollectionOffer } from '../lib/offers-cache'
import { TakeOfferButton } from './wallet/TakeOfferButton'
import { TakeMintgardenOfferButton } from './wallet/TakeMintgardenOfferButton'
import styles from '../styles/Home.module.css'

// Constants for better performance
const SORT_OPTIONS = [
  { key: 'price-asc', text: 'Price: Low to High', value: 'price-asc' },
  { key: 'price-desc', text: 'Price: High to Low', value: 'price-desc' },
  { key: 'date-newest', text: 'Date: Newest First', value: 'date-newest' },
  { key: 'date-oldest', text: 'Date: Oldest First', value: 'date-oldest' }
]

// Reusable style objects
const FILTER_CONTAINER_STYLE = {
  display: 'flex',
  gap: '8px',
  marginBottom: 20,
  justifyContent: 'flex-start' as const,
  flexWrap: 'wrap' as const,
  alignItems: 'center' as const,
  overflow: 'visible' as const
}

const FILTER_LABEL_STYLE = {
  fontWeight: 500,
  color: 'var(--color-text)',
  flexShrink: 0,
  minWidth: 'fit-content' as const
}

const DROPDOWN_STYLE = {
  backgroundColor: 'var(--color-bg-alt)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)'
}

const SORT_WRAPPER_STYLE = {
  display: 'flex',
  alignItems: 'center' as const,
  gap: '8px',
  flexShrink: 0
}

// Asset priority helper function
const getAssetPriority = (asset: string): number => {
  if (asset === 'XCH') return 0
  if (asset === 'G4M') return 1
  return 2
}

// Optimized sorting function
const createSortComparator = (sortBy: string) => {
  return (a: CollectionOffer, b: CollectionOffer): number => {
    switch (sortBy) {
      case 'price-asc':
      case 'price-desc': {
        const priorityA = getAssetPriority(a.price_asset)
        const priorityB = getAssetPriority(b.price_asset)

        if (priorityA !== priorityB) return priorityA - priorityB

        const priceComparison = a.price_amount - b.price_amount
        return sortBy === 'price-asc' ? priceComparison : -priceComparison
      }
      case 'date-newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'date-oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      default:
        return 0
    }
  }
}

interface OffersTabProps {
  username: string
  rootHostForLinks?: string
  offers: CollectionOffer[]
  isLoading?: boolean
  error?: string | null
}

export function OffersTab({ username, rootHostForLinks, offers, isLoading = false, error = null }: OffersTabProps) {
  // Filter states
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all')
  const [selectedBadge, setSelectedBadge] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('price-asc')

  // Consolidated filtering and sorting logic for better performance
  const { filteredOffers, offersFilteredByBadge, offersFilteredByCurrency } = useMemo(() => {
    // Pre-filter for context-aware dropdowns
    const byBadge = selectedBadge === 'all' ? offers : offers.filter(o => o.badge_name === selectedBadge)
    const byCurrency = selectedCurrency === 'all' ? offers : offers.filter(o => o.price_asset === selectedCurrency)

    // Final filtered offers
    const filtered = offers.filter(o => (
      (selectedCurrency === 'all' || o.price_asset === selectedCurrency) &&
      (selectedBadge === 'all' || o.badge_name === selectedBadge)
    ))

    // Apply optimized sorting
    const sortComparator = createSortComparator(sortBy)
    const sorted = [...filtered].sort(sortComparator)

    return {
      filteredOffers: sorted,
      offersFilteredByBadge: byBadge,
      offersFilteredByCurrency: byCurrency
    }
  }, [offers, selectedCurrency, selectedBadge, sortBy])

  // Optimized dropdown options creation
  const { currencyOptions, badgeOptions } = useMemo(() => {
    // Build currency counts and options
    const currencyMap = new Map<string, number>()
    for (const o of offersFilteredByBadge) {
      if (o.price_asset) currencyMap.set(o.price_asset, (currencyMap.get(o.price_asset) || 0) + 1)
    }

    // Sort currency keys with asset priority
    const currencyKeys = Array.from(currencyMap.keys()).sort((a, b) => {
      const priorityA = getAssetPriority(a)
      const priorityB = getAssetPriority(b)
      if (priorityA !== priorityB) return priorityA - priorityB
      return a.localeCompare(b)
    })

    const currencyOpts = [
      { key: 'all', text: `All Currencies (${offersFilteredByBadge.length})`, value: 'all' }
    ]
    for (const k of currencyKeys) {
      const count = currencyMap.get(k) || 0
      currencyOpts.push({ key: k, text: `${k} (${count})`, value: k })
    }
    // Ensure selected currency remains visible
    if (selectedCurrency !== 'all' && !currencyMap.has(selectedCurrency)) {
      currencyOpts.push({ key: selectedCurrency, text: `${selectedCurrency} (0)`, value: selectedCurrency })
    }

    // Build badge counts and options
    const badgeMap = new Map<string, number>()
    for (const o of offersFilteredByCurrency) {
      if (o.badge_name) badgeMap.set(o.badge_name, (badgeMap.get(o.badge_name) || 0) + 1)
    }

    const badgeKeys = Array.from(badgeMap.keys()).sort()
    const badgeOpts = [
      { key: 'all', text: `All Badges (${offersFilteredByCurrency.length})`, value: 'all' }
    ]
    for (const k of badgeKeys) {
      const count = badgeMap.get(k) || 0
      badgeOpts.push({ key: k, text: `${k} (${count})`, value: k })
    }
    // Ensure selected badge remains visible
    if (selectedBadge !== 'all' && !badgeMap.has(selectedBadge)) {
      badgeOpts.push({ key: selectedBadge, text: `${selectedBadge} (0)`, value: selectedBadge })
    }

    return {
      currencyOptions: currencyOpts,
      badgeOptions: badgeOpts
    }
  }, [offersFilteredByBadge, offersFilteredByCurrency, selectedCurrency, selectedBadge])

  // Event handlers with useCallback for performance
  const handleCurrencyChange = useCallback((_: any, { value }: { value: any }) => {
    setSelectedCurrency(value as string)
  }, [])

  const handleBadgeChange = useCallback((_: any, { value }: { value: any }) => {
    setSelectedBadge(value as string)
  }, [])

  const handleSortChange = useCallback((_: any, { value }: { value: any }) => {
    setSortBy(value as string)
  }, [])

  const handleReset = useCallback(() => {
    setSelectedCurrency('all')
    setSelectedBadge('all')
    setSortBy('price-asc')
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Loader active inline='centered' size='medium' />
        <div style={{ marginTop: 16, fontSize: 14, color: 'var(--color-text-subtle)' }}>
          Loading offers for @{username}...
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Icon name='exclamation triangle' size='large' color='orange' />
        <div style={{ marginTop: 12, fontSize: 14, color: 'var(--color-text-subtle)' }}>
          {error}
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-subtle)' }}>
          Please try refreshing the page or check back later.
        </div>
      </div>
    )
  }

  // Empty state
  if (offers.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Icon name='handshake outline' size='large' style={{ opacity: 0.3 }} />
        <div style={{ marginTop: 12, opacity: 0.55, fontSize: 14 }}>
          No offers available for @{username} at the moment.
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-subtle)' }}>
          Check back later or browse other profiles for available offers.
        </div>
      </div>
    )
  }



  return (
    <div>
      {/* Filter Controls - Optimised for mobile */}
      <div style={FILTER_CONTAINER_STYLE}>
        <span className="offers-filter-label" style={FILTER_LABEL_STYLE}>
          Filter:
        </span>
        <Dropdown
          placeholder="Currency"
          selection
          compact
          options={currencyOptions}
          value={selectedCurrency}
          onChange={handleCurrencyChange}
          className="offers-filter-dropdown"
          style={DROPDOWN_STYLE}
        />
        <Dropdown
          placeholder="Badge"
          selection
          compact
          options={badgeOptions}
          value={selectedBadge}
          onChange={handleBadgeChange}
          className="offers-filter-dropdown"
          style={DROPDOWN_STYLE}
        />
        <div style={SORT_WRAPPER_STYLE}>
          <span className="offers-filter-label" style={FILTER_LABEL_STYLE}>
            Sort:
          </span>
          <Dropdown
            placeholder="Sort"
            selection
            compact
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={handleSortChange}
            className="offers-filter-dropdown"
            style={DROPDOWN_STYLE}
          />
        </div>
        {(selectedCurrency !== 'all' || selectedBadge !== 'all' || sortBy !== 'price-asc') && (
          <button
            onClick={handleReset}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              color: 'var(--color-text-subtle)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-alt)'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text-subtle)'
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Info text */}
      <div style={{
        marginBottom: 20,
        fontSize: 13,
        color: 'var(--color-text-subtle)',
        textAlign: 'center'
      }}>
        Showing {filteredOffers.length} of {offers.length} offer{offers.length !== 1 ? 's' : ''} for @{username} NFTs
      </div>

      {/* No filtered results message */}
      {filteredOffers.length === 0 && offers.length > 0 && (
        <div style={{ textAlign: 'center', opacity: 0.55, fontSize: 14, padding: '40px 0' }}>
          No offers match the selected filters. Try adjusting your filter criteria.
        </div>
      )}

      {/* Offers Grid */}
      {filteredOffers.length > 0 && (
        <div className={styles.lbGrid}>
          {filteredOffers.map(offer => {
          const profileHref = offer.username
            ? `//${offer.username}.${rootHostForLinks || 'go4.me'}/`
            : null

          return (
            <div key={offer.id} className={styles.lbCard}>
              {/* NFT Thumbnail - matching PfpFlipThumb structure */}
              <div className={styles.cardImgWrap}>
                {profileHref ? (
                  <a href={profileHref} aria-label={offer.username ? `Open ${offer.username}.go4.me` : 'Open profile'} style={{ position: 'absolute', inset: 0, display: 'block' }}>
                    {offer.thumbnail_uri ? (
                      <Image
                        src={offer.thumbnail_uri}
                        alt={offer.nft_name}
                        fill
                        sizes="180px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'var(--color-bg-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-subtle)'
                      }}>
                        <Icon name='image' size='large' />
                      </div>
                    )}
                  </a>
                ) : (
                  <>
                    {offer.thumbnail_uri ? (
                      <Image
                        src={offer.thumbnail_uri}
                        alt={offer.nft_name}
                        fill
                        sizes="180px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'var(--color-bg-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-subtle)'
                      }}>
                        <Icon name='image' size='large' />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Card Content - matching existing structure */}
              <div className={styles.cardBody}>
                {/* NFT Name - matching fullName style */}
                {offer.nft_name && (
                  <div className={styles.fullName} title={offer.nft_name}>
                    {offer.nft_name}
                  </div>
                )}

                {/* Username - matching username style */}
                {offer.username && (
                  <div className={styles.username} title={`@${offer.username}`}>
                    <a
                      href={`https://x.com/${offer.username}`}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                      aria-label={`View @${offer.username} on X`}
                    >
                      @{offer.username}
                    </a>
                  </div>
                )}

                {/* Badge and Price Row - matching badgeRow style */}
                <div className={styles.badgeRow}>
                  {/* Badge */}
                  {offer.badge_emoji && offer.badge_name && (
                    <span className={styles.miniBadge}>
                      {offer.badge_emoji} {offer.badge_name}
                    </span>
                  )}

                  {/* Price Badge */}
                  <span className={`${styles.miniBadge} ${styles.primaryBadge}`}>
                    {offer.price_display}
                  </span>
                </div>

                {/* Action Buttons - matching existing offer button layout */}
                {offer.offer_id && (
                  <div className={styles.badgeRow} style={{ marginTop: 8 }}>
                    <TakeOfferButton
                      offerId={offer.offer_id}
                      className={styles.miniBadge}
                      ariaLabel='Take offer via WalletConnect or view on Dexie'
                      title='Dexie'
                      labelDefault='Dexie'
                      labelWhenSage='Take Offer'
                    >
                      <Image
                        src="https://raw.githubusercontent.com/dexie-space/dexie-kit/main/svg/duck.svg"
                        alt="Dexie"
                        width={16}
                        height={16}
                      />
                    </TakeOfferButton>
                    <TakeMintgardenOfferButton
                      offerId={offer.offer_id}
                      className={styles.miniBadge}
                      ariaLabel='Take offer via WalletConnect or view on Mintgarden'
                      title='Mintgarden'
                      labelDefault='Mintgarden'
                    >
                      <Image
                        src="https://mintgarden.io/mint-logo-round.svg"
                        alt="MintGarden"
                        width={16}
                        height={16}
                      />
                    </TakeMintgardenOfferButton>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        </div>
      )}
    </div>
  )
}
