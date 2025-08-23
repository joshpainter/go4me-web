import Head from 'next/head'
import React from 'react'
import { SITE_CONFIG } from '../../lib/constants'

export function OrganizationSchema(): React.JSX.Element {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": SITE_CONFIG.name,
    "url": SITE_CONFIG.url,
    "logo": SITE_CONFIG.logo,
    "description": SITE_CONFIG.description,
    "sameAs": [SITE_CONFIG.twitterUrl],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": "English"
    }
  }

  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Head>
  )
}

export function WebSiteSchema(): React.JSX.Element {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_CONFIG.name,
    "url": SITE_CONFIG.url,
    "description": SITE_CONFIG.description,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_CONFIG.url}/?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Head>
  )
}

interface PersonSchemaProps {
  username?: string
  fullName?: string
  description?: string
  avatarUrl?: string
  profileUrl?: string
}

export function PersonSchema({ username, fullName, description, avatarUrl, profileUrl }: PersonSchemaProps): React.JSX.Element | null {
  if (!username) return null

  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": fullName || username,
    "alternateName": username,
    "description": description || `${username} profile on ${SITE_CONFIG.name}`,
    "url": profileUrl || `https://${username}.${SITE_CONFIG.name}/`,
    "image": avatarUrl || '/templates/pfp0001.png',
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": profileUrl || `https://${username}.${SITE_CONFIG.name}/`
    }
  }

  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Head>
  )
}

interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbSchemaProps {
  items?: BreadcrumbItem[]
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps): React.JSX.Element | null {
  if (!items || items.length === 0) return null

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  }

  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Head>
  )
}
