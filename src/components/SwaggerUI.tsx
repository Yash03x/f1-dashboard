'use client'

import { useEffect, useState } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

interface SwaggerUIProps {
  url?: string
  spec?: any
}

export default function SwaggerUIComponent({ url, spec }: SwaggerUIProps) {
  const [swaggerSpec, setSwaggerSpec] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSpec = async () => {
      try {
        setLoading(true)
        
        if (spec) {
          setSwaggerSpec(spec)
        } else if (url) {
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`Failed to load API spec: ${response.statusText}`)
          }
          const specData = await response.json()
          setSwaggerSpec(specData)
        } else {
          // Default to local API spec
          const response = await fetch('/api/docs/spec')
          if (!response.ok) {
            throw new Error(`Failed to load API spec: ${response.statusText}`)
          }
          const specData = await response.json()
          setSwaggerSpec(specData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API documentation')
      } finally {
        setLoading(false)
      }
    }

    loadSpec()
  }, [url, spec])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">API Documentation Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!swaggerSpec) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-600 text-6xl mb-4">📄</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No API Documentation</h2>
          <p className="text-gray-600">API specification not available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="swagger-container">
      <SwaggerUI 
        spec={swaggerSpec}
        docExpansion="list"
        defaultModelsExpandDepth={2}
        defaultModelExpandDepth={2}
        displayOperationId={false}
        displayRequestDuration={true}
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
        tryItOutEnabled={true}
        requestInterceptor={(request: any) => {
          // Add any default headers or authentication
          request.headers = {
            ...request.headers,
            'Content-Type': 'application/json'
          }
          return request
        }}
        responseInterceptor={(response: any) => {
          // Log responses for debugging
          console.log('API Response:', response)
          return response
        }}
        onComplete={(system: any) => {
          // Customize the UI after it's loaded
          console.log('Swagger UI loaded successfully')
        }}
        plugins={[
          {
            statePlugins: {
              spec: {
                wrapSelectors: {
                  allowTryItOutFor: () => () => true
                }
              }
            }
          }
        ]}
      />
      
      <style jsx global>{`
        .swagger-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .swagger-ui .topbar {
          background-color: #1f2937;
          padding: 1rem;
        }
        
        .swagger-ui .topbar .download-url-wrapper {
          display: none;
        }
        
        .swagger-ui .info {
          margin: 2rem 0;
        }
        
        .swagger-ui .scheme-container {
          background-color: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        
        .swagger-ui .opblock {
          border-radius: 0.5rem;
          margin: 1rem 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .swagger-ui .opblock.opblock-get {
          border-color: #3b82f6;
        }
        
        .swagger-ui .opblock.opblock-post {
          border-color: #10b981;
        }
        
        .swagger-ui .opblock.opblock-put {
          border-color: #f59e0b;
        }
        
        .swagger-ui .opblock.opblock-delete {
          border-color: #ef4444;
        }
        
        .swagger-ui .opblock-summary-description {
          color: #6b7280;
        }
        
        .swagger-ui .opblock-summary-operation-id {
          font-weight: 600;
        }
        
        .swagger-ui .responses-table {
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .swagger-ui .response-col_status {
          font-weight: 600;
        }
        
        .swagger-ui .response-col_description {
          color: #6b7280;
        }
        
        .swagger-ui .model {
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }
        
        .swagger-ui .model-title {
          background-color: #f9fafb;
          padding: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 600;
        }
        
        .swagger-ui .model-box {
          padding: 1rem;
        }
        
        .swagger-ui .parameter__name {
          font-weight: 600;
          color: #374151;
        }
        
        .swagger-ui .parameter__type {
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .swagger-ui .parameter__required {
          color: #ef4444;
          font-weight: 600;
        }
        
        .swagger-ui .btn.execute {
          background-color: #3b82f6;
          border-color: #3b82f6;
          color: white;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .swagger-ui .btn.execute:hover {
          background-color: #2563eb;
          border-color: #2563eb;
        }
        
        .swagger-ui .btn.authorize {
          background-color: #10b981;
          border-color: #10b981;
          color: white;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .swagger-ui .btn.authorize:hover {
          background-color: #059669;
          border-color: #059669;
        }
        
        .swagger-ui .btn.try-out__btn {
          background-color: #6b7280;
          border-color: #6b7280;
          color: white;
          border-radius: 0.375rem;
          padding: 0.25rem 0.75rem;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        
        .swagger-ui .btn.try-out__btn:hover {
          background-color: #4b5563;
          border-color: #4b5563;
        }
        
        .swagger-ui .btn.try-out__btn.cancel {
          background-color: #ef4444;
          border-color: #ef4444;
        }
        
        .swagger-ui .btn.try-out__btn.cancel:hover {
          background-color: #dc2626;
          border-color: #dc2626;
        }
      `}</style>
    </div>
  )
}
