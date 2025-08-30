/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['media.formula1.com', 'www.formula1.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://api.jolpi.ca/ergast/f1',
    NEXT_PUBLIC_OPENF1_API_URL: process.env.NEXT_PUBLIC_OPENF1_API_URL || 'https://api.openf1.org/v1',
  }
}

module.exports = nextConfig