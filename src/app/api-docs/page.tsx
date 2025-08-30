import SwaggerUIComponent from '@/components/SwaggerUI'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Documentation - F1 Dashboard',
  description: 'Comprehensive API documentation for the F1 Dashboard',
  keywords: ['API', 'Documentation', 'F1', 'Formula 1', 'Racing', 'OpenAPI', 'Swagger'],
  openGraph: {
    title: 'API Documentation - F1 Dashboard',
    description: 'Comprehensive API documentation for the F1 Dashboard',
    type: 'website',
  },
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                API Documentation
              </h1>
              <p className="mt-2 text-gray-600">
                Comprehensive API documentation for the F1 Dashboard
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Dashboard
              </a>
              <a
                href="/api/docs/spec"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Download Spec
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <SwaggerUIComponent />
        </div>
      </div>
      
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>
              F1 Dashboard API Documentation • Built with OpenAPI 3.0 and Swagger UI
            </p>
            <p className="mt-2 text-sm">
              For support, contact{' '}
              <a href="mailto:support@f1dashboard.com" className="text-blue-600 hover:text-blue-800">
                support@f1dashboard.com
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
