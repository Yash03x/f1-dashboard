# F1 Dashboard - Enterprise Edition

A high-performance, enterprise-grade Formula 1 dashboard built with Next.js, PostgreSQL, and pre-loaded data architecture.

## 🏁 Features

- **⚡ Instant Page Loads**: Pre-loaded data in PostgreSQL database
- **🏗️ Enterprise Architecture**: Separate backend & frontend with proper caching
- **📊 Real-time Data**: Live telemetry and race data
- **🎨 Modern UI**: Beautiful, responsive design with dark mode
- **📈 Advanced Analytics**: Comprehensive charts and statistics
- **🔄 Automated Sync**: Background data synchronization
- **🚀 Production Ready**: CDN, caching, and monitoring

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js)     │◄──►│   (Next.js      │◄──►│   (PostgreSQL)  │
│                 │    │    API Routes)  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Cache     │    │   Background    │    │   Redis Cache   │
│   (Vercel/      │    │   Jobs          │    │                 │
│    CloudFlare)  │    │   (Cron/Queue)  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis (optional, for caching)

### 1. Clone and Install

```bash
git clone https://github.com/your-username/f1-dashboard.git
cd f1-dashboard
npm install
```

### 2. Database Setup

#### Option A: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database:
```sql
CREATE DATABASE f1_dashboard;
CREATE USER f1_user WITH PASSWORD 'f1_password_secure_2024';
GRANT ALL PRIVILEGES ON DATABASE f1_dashboard TO f1_user;
```

#### Option B: Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Or if you don't have docker-compose:
docker run --name f1-postgres \
  -e POSTGRES_DB=f1_dashboard \
  -e POSTGRES_USER=f1_user \
  -e POSTGRES_PASSWORD=f1_password_secure_2024 \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Environment Configuration

```bash
# Copy environment template
cp env.example .env.local

# Edit .env.local with your database credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=f1_dashboard
DB_USER=f1_user
DB_PASSWORD=f1_password_secure_2024
```

### 4. Initialize Database

```bash
# Initialize database schema and sample data
npm run db:init
```

### 5. Sync F1 Data

```bash
# Sync all seasons
npm run sync:seasons

# Sync complete data for 2024 season
npm run sync:2024

# Or run the complete setup
npm run setup
```

### 6. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your F1 dashboard!

## 📊 Data Management

### Available Scripts

```bash
# Database management
npm run db:test          # Test database connection
npm run db:init          # Initialize database schema

# Data synchronization
npm run sync:seasons     # Sync all seasons
npm run sync:season      # Sync basic season data
npm run sync:complete    # Sync complete season data
npm run sync:2024        # Sync 2024 season
npm run sync:2023        # Sync 2023 season
npm run sync:force       # Force refresh all data

# Complete setup
npm run setup            # Initialize DB + sync seasons + sync 2024
```

### Manual Data Sync

```bash
# Sync specific season with options
tsx scripts/sync-data.ts 2024 --force --concurrency 10

# Sync only basic data
tsx scripts/sync-data.ts --type season --season 2024

# Get help
tsx scripts/sync-data.ts --help
```

## 🏗️ Project Structure

```
f1-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (database queries)
│   │   ├── races/             # Races page
│   │   ├── drivers/           # Drivers page
│   │   ├── standings/         # Standings page
│   │   └── ...
│   ├── components/            # React components
│   ├── lib/
│   │   ├── database/          # Database connection & repositories
│   │   ├── services/          # Data sync services
│   │   └── ...
│   └── types/                 # TypeScript types
├── scripts/                   # Database & sync scripts
├── database/                  # Database initialization
└── docker-compose.yml         # Docker services
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `f1_dashboard` |
| `DB_USER` | Database user | `f1_user` |
| `DB_PASSWORD` | Database password | `f1_password_secure_2024` |
| `NEXT_PUBLIC_API_URL` | API base URL | `http://localhost:3000/api` |
| `F1_API_BASE_URL` | External F1 API | `https://ergast.com/api/f1` |

### Database Schema

The database includes:

- **Seasons**: Championship years and metadata
- **Races**: Race calendar with pre-loaded results
- **Drivers**: Driver information and statistics
- **Constructors**: Team information
- **Standings**: Driver and constructor standings
- **Telemetry**: Real-time telemetry data
- **Sync Logs**: Data synchronization tracking

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with automatic database migrations

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t f1-dashboard .
docker run -p 3000:3000 f1-dashboard
```

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## 📈 Performance

### Caching Strategy

- **Static Pages**: Pre-generated with ISR (Incremental Static Regeneration)
- **API Responses**: Redis caching with 1-hour TTL
- **CDN**: Global edge caching via Vercel/CloudFlare
- **Database**: Optimized queries with proper indexing

### Monitoring

- Database connection pooling
- Query performance tracking
- Sync job monitoring
- Error tracking and alerting

## 🔄 Data Synchronization

### Automatic Sync

The system includes background jobs for:

- Daily season data updates
- Race result synchronization
- Standings calculations
- Telemetry data collection

### Manual Sync

```bash
# Sync current season
npm run sync:2024

# Force refresh all data
npm run sync:force

# Sync specific data types
tsx scripts/sync-data.ts --type seasons
tsx scripts/sync-data.ts --type season --season 2024
```

## 🛠️ Development

### Adding New Features

1. **Database**: Add tables/views in `src/lib/database/schema.sql`
2. **API**: Create routes in `src/app/api/`
3. **Frontend**: Add pages in `src/app/`
4. **Types**: Update `src/types/f1.ts`

### Testing

```bash
# Test database connection
npm run db:test

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ergast API](http://ergast.com/mrd/) for F1 data
- [Next.js](https://nextjs.org/) for the framework
- [PostgreSQL](https://www.postgresql.org/) for the database
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/f1-dashboard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/f1-dashboard/discussions)
- **Email**: support@f1-dashboard.com

---

**🏁 Ready to race? Start your engines and deploy your F1 dashboard!**
