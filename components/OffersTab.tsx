import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Icon, Dropdown, Loader } from 'semantic-ui-react'
import { CollectionOffer } from '../lib/offers-cache'
import { TakeOfferButton } from './wallet/TakeOfferButton'
import { TakeMintgardenOfferButton } from './wallet/TakeMintgardenOfferButton'
import styles from '../styles/Home.module.css'

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

  // Dependent filter logic
  // Offers filtered by the other dropdown to build context-aware options
  const offersFilteredByBadge = useMemo(() => (
    selectedBadge === 'all' ? offers : offers.filter(o => o.badge_name === selectedBadge)
  ), [offers, selectedBadge])

  const offersFilteredByCurrency = useMemo(() => (
    selectedCurrency === 'all' ? offers : offers.filter(o => o.price_asset === selectedCurrency)
  ), [offers, selectedCurrency])

  // Final offers filtered by both selections
  const filteredOffers = useMemo(() => {
    return offers.filter(o => (
      (selectedCurrency === 'all' || o.price_asset === selectedCurrency) &&
      (selectedBadge === 'all' || o.badge_name === selectedBadge)
    ))
  }, [offers, selectedCurrency, selectedBadge])

  // Build currency options based on the badge-filtered set
  const { currencyCountsFilteredByBadge, currencyKeysFilteredByBadge } = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of offersFilteredByBadge) {
      if (o.price_asset) map.set(o.price_asset, (map.get(o.price_asset) || 0) + 1)
    }
    const keys = Array.from(map.keys()).sort()
    return { currencyCountsFilteredByBadge: map, currencyKeysFilteredByBadge: keys }
  }, [offersFilteredByBadge])

  // Build badge options based on the currency-filtered set
  const { badgeCountsFilteredByCurrency, badgeKeysFilteredByCurrency } = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of offersFilteredByCurrency) {
      if (o.badge_name) map.set(o.badge_name, (map.get(o.badge_name) || 0) + 1)
    }
    const keys = Array.from(map.keys()).sort()
    return { badgeCountsFilteredByCurrency: map, badgeKeysFilteredByCurrency: keys }
  }, [offersFilteredByCurrency])

  // Create dropdown options with counts (context-aware)
  const currencyOptions = useMemo(() => {
    const baseCount = offersFilteredByBadge.length
    const opts = [
      { key: 'all', text: `All Currencies (${baseCount})`, value: 'all' }
    ]
    for (const k of currencyKeysFilteredByBadge) {
      const count = currencyCountsFilteredByBadge.get(k) || 0
      opts.push({ key: k, text: `${k} (${count})`, value: k })
    }
    // Ensure the currently selected currency remains visible even if count is 0 due to other filter
    if (selectedCurrency !== 'all' && !currencyCountsFilteredByBadge.has(selectedCurrency)) {
      opts.push({ key: selectedCurrency, text: `${selectedCurrency} (0)`, value: selectedCurrency })
    }
    return opts
  }, [offersFilteredByBadge.length, currencyKeysFilteredByBadge, currencyCountsFilteredByBadge, selectedCurrency])

  const badgeOptions = useMemo(() => {
    const baseCount = offersFilteredByCurrency.length
    const opts = [
      { key: 'all', text: `All Badges (${baseCount})`, value: 'all' }
    ]
    for (const k of badgeKeysFilteredByCurrency) {
      const count = badgeCountsFilteredByCurrency.get(k) || 0
      opts.push({ key: k, text: `${k} (${count})`, value: k })
    }
    // Ensure the currently selected badge remains visible even if count is 0 due to other filter
    if (selectedBadge !== 'all' && !badgeCountsFilteredByCurrency.has(selectedBadge)) {
      opts.push({ key: selectedBadge, text: `${selectedBadge} (0)`, value: selectedBadge })
    }
    return opts
  }, [offersFilteredByCurrency.length, badgeKeysFilteredByCurrency, badgeCountsFilteredByCurrency, selectedBadge])

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

  // Skeleton loading component
  const SkeletonCard = () => (
    <div className={styles.lbCard} style={{ opacity: 0.6 }}>
      <div className={styles.cardImgWrap} style={{ background: 'var(--skeleton-stop-1)' }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, var(--skeleton-stop-1) 25%, var(--skeleton-stop-2) 50%, var(--skeleton-stop-1) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
      </div>
      <div className={styles.cardBody}>
        <div style={{
          height: '16px',
          background: 'var(--skeleton-stop-1)',
          borderRadius: '4px',
          marginBottom: '8px'
        }} />
        <div style={{
          height: '12px',
          background: 'var(--skeleton-stop-1)',
          borderRadius: '4px',
          width: '70%',
          marginBottom: '12px'
        }} />
        <div className={styles.badgeRow}>
          <div style={{
            height: '20px',
            background: 'var(--skeleton-stop-1)',
            borderRadius: '10px',
            width: '60px'
          }} />
          <div style={{
            height: '20px',
            background: 'var(--skeleton-stop-1)',
            borderRadius: '10px',
            width: '80px'
          }} />
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* Filter Controls - Optimised for mobile */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: 20,
        justifyContent: 'flex-start',
        flexWrap: 'wrap', // Allow wrapping to avoid horizontal scrolling on small screens
        alignItems: 'center',
        overflow: 'visible' // Allow dropdown menus to render outside the row without being clipped
      }}>
        <span
          className="offers-filter-label"
          style={{
            fontWeight: 500,
            color: 'var(--color-text)',
            flexShrink: 0, // Do not shrink the label
            minWidth: 'fit-content'
          }}
        >
          Filter:
        </span>
        <Dropdown
          placeholder="Currency"
          selection
          compact
          options={currencyOptions}
          value={selectedCurrency}
          onChange={(_, { value }) => setSelectedCurrency(value as string)}
          className="offers-filter-dropdown"
          style={{
            backgroundColor: 'var(--color-bg-alt)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)'
          }}
        />
        <Dropdown
          placeholder="Badge"
          selection
          compact
          options={badgeOptions}
          value={selectedBadge}
          onChange={(_, { value }) => setSelectedBadge(value as string)}
          className="offers-filter-dropdown"
          style={{
            backgroundColor: 'var(--color-bg-alt)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)'
          }}
        />
        {(selectedCurrency !== 'all' || selectedBadge !== 'all') && (
          <button
            onClick={() => {
              setSelectedCurrency('all')
              setSelectedBadge('all')
            }}
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
            Clear Filters
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
        Showing {filteredOffers.length} of {offers.length} offer{offers.length !== 1 ? 's' : ''} for @{username} NFTs, sorted by price (lowest first)
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
