import { Options } from 'swagger-jsdoc'

const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'F1 Dashboard API',
      version: '1.0.0',
      description: 'Comprehensive API for Formula 1 data and statistics',
      contact: {
        name: 'F1 Dashboard Team',
        email: 'support@f1dashboard.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.f1dashboard.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            }
          }
        },
        Race: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Race ID'
            },
            round: {
              type: 'integer',
              description: 'Race round number'
            },
            race_name: {
              type: 'string',
              description: 'Name of the race'
            },
            circuit_name: {
              type: 'string',
              description: 'Name of the circuit'
            },
            circuit_country: {
              type: 'string',
              description: 'Country where the circuit is located'
            },
            race_date: {
              type: 'string',
              format: 'date',
              description: 'Race date'
            },
            status: {
              type: 'string',
              enum: ['scheduled', 'completed', 'cancelled'],
              description: 'Race status'
            },
            season_year: {
              type: 'integer',
              description: 'Season year'
            }
          }
        },
        Driver: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Driver ID'
            },
            driver_code: {
              type: 'string',
              description: 'Driver code (3 letters)'
            },
            first_name: {
              type: 'string',
              description: 'Driver first name'
            },
            last_name: {
              type: 'string',
              description: 'Driver last name'
            },
            nationality: {
              type: 'string',
              description: 'Driver nationality'
            },
            date_of_birth: {
              type: 'string',
              format: 'date',
              description: 'Driver date of birth'
            }
          }
        },
        Constructor: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Constructor ID'
            },
            name: {
              type: 'string',
              description: 'Constructor name'
            },
            nationality: {
              type: 'string',
              description: 'Constructor nationality'
            }
          }
        },
        DriverStanding: {
          type: 'object',
          properties: {
            position: {
              type: 'integer',
              description: 'Driver position in standings'
            },
            driver_id: {
              type: 'string',
              description: 'Driver ID'
            },
            driver_name: {
              type: 'string',
              description: 'Driver full name'
            },
            constructor_name: {
              type: 'string',
              description: 'Constructor name'
            },
            points: {
              type: 'number',
              description: 'Total points'
            },
            wins: {
              type: 'integer',
              description: 'Number of wins'
            },
            podiums: {
              type: 'integer',
              description: 'Number of podiums'
            }
          }
        },
        ConstructorStanding: {
          type: 'object',
          properties: {
            position: {
              type: 'integer',
              description: 'Constructor position in standings'
            },
            constructor_id: {
              type: 'string',
              description: 'Constructor ID'
            },
            constructor_name: {
              type: 'string',
              description: 'Constructor name'
            },
            points: {
              type: 'number',
              description: 'Total points'
            },
            wins: {
              type: 'integer',
              description: 'Number of wins'
            },
            podiums: {
              type: 'integer',
              description: 'Number of podiums'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              description: 'Response data'
            },
            success: {
              type: 'boolean',
              description: 'Request success status'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata'
            }
          }
        }
      },
      parameters: {
        SeasonParam: {
          name: 'season',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            pattern: '^\\d{4}$',
            example: '2024'
          },
          description: 'Season year (4-digit format)'
        },
        TypeParam: {
          name: 'type',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['driver', 'constructor'],
            default: 'driver'
          },
          description: 'Standings type'
        },
        RoundParam: {
          name: 'round',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 25
          },
          description: 'Race round number'
        }
      },
      responses: {
        RateLimitExceeded: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Rate limit exceeded',
                message: 'Too many requests, please try again later.',
                retryAfter: 900,
                limit: 100,
                remaining: 0
              }
            }
          },
          headers: {
            'X-RateLimit-Limit': {
              schema: {
                type: 'string'
              },
              description: 'Rate limit maximum requests'
            },
            'X-RateLimit-Remaining': {
              schema: {
                type: 'string'
              },
              description: 'Rate limit remaining requests'
            },
            'X-RateLimit-Reset': {
              schema: {
                type: 'string'
              },
              description: 'Rate limit reset time'
            },
            'Retry-After': {
              schema: {
                type: 'string'
              },
              description: 'Seconds to wait before retrying'
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Validation failed',
                message: 'Invalid request parameters',
                details: [
                  {
                    field: 'season',
                    message: 'Season must be a 4-digit year',
                    code: 'invalid_string'
                  }
                ]
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Internal server error',
                message: 'An unexpected error occurred',
                timestamp: '2024-01-01T12:00:00.000Z'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Races',
        description: 'Race-related endpoints'
      },
      {
        name: 'Drivers',
        description: 'Driver-related endpoints'
      },
      {
        name: 'Constructors',
        description: 'Constructor-related endpoints'
      },
      {
        name: 'Standings',
        description: 'Championship standings endpoints'
      },
      {
        name: 'Sync',
        description: 'Data synchronization endpoints'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      }
    ],
    externalDocs: {
      description: 'F1 Dashboard Documentation',
      url: 'https://docs.f1dashboard.com'
    }
  },
  apis: [
    './src/app/api/**/*.ts',
    './src/app/api/**/*.js',
    './src/lib/swagger/**/*.ts'
  ]
}

export default swaggerOptions
