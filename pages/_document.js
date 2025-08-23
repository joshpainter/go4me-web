import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Essential meta tags */}
        <meta charSet="utf-8" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="go4.me" />
        <meta name="theme-color" content="#000000" />

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
        
        {/* Ensure HTTPS for any external resources */}
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />

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
