import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preconnect to external domains for performance */}


        <link rel="preconnect" href="https://can.seedsn.app" />
        <link rel="preconnect" href="https://raw.githubusercontent.com" />
        <link rel="preconnect" href="https://mintgarden.io" />
        <link rel="preconnect" href="https://platform.twitter.com" />

        {/* Preconnect to Supabase for faster database requests */}
        <link rel="preconnect" href="https://wsrdqcvzoshyjvtfsjjp.supabase.co" />
        
        {/* DNS prefetch for additional performance */}
        <link rel="dns-prefetch" href="https://dexie.space" />
        <link rel="dns-prefetch" href="https://assets.mainnet.mintgarden.io" />
        
        {/* CSP is now handled in next.config.js headers */}

        {/* Resource hints for critical resources */}
        <link rel="preload" href="/fonts/Inter-VariableFont_slnt,wght.ttf" as="font" type="font/ttf" crossOrigin="" />




      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
