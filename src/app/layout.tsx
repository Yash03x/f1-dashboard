import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'F1 Dashboard',
  description: 'Comprehensive Formula 1 data and statistics dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-gray-800 text-white p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <a href="/" className="text-xl font-bold">
                🏎️ F1 Dashboard
              </a>
              <a href="/races" className="hover:text-gray-300 transition-colors">
                Races
              </a>
              <a href="/drivers" className="hover:text-gray-300 transition-colors">
                Drivers
              </a>
              <a href="/constructors" className="hover:text-gray-300 transition-colors">
                Constructors
              </a>
              <a href="/standings" className="hover:text-gray-300 transition-colors">
                Standings
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/api-docs" 
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm font-medium transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                📚 API Docs
              </a>
              <a 
                href="/api/health" 
                className="text-gray-300 hover:text-white text-sm transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Health
              </a>
            </div>
          </div>
        </nav>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
}