/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  rewrites: async () => {
    return [
      {
        source: '/go4me0001.png',
        has: [
          {
            type: 'host',
            value: '(?<pfpname>.*)\.localhost|\.go4\.me'
          }
        ],
        destination: 'https://go4me-pfps.s3.amazonaws.com/go4me0001-:pfpname.png',
      },
      {
        source: '/domain.json',
        has: [
          {
            type: 'host',
            value: '(?<pfpname>.*)\.localhost|\.go4\.me'
          }
        ],        
        destination: 'https://go4me-domains.s3.amazonaws.com/:pfpname.json',
      },      
    ]
  },
}

module.exports = nextConfig
