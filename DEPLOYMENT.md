# Deployment Guide

This guide covers deploying the ProFootball backend to production.

## Prerequisites

- Production PostgreSQL database (Supabase recommended)
- Production Redis instance (Redis Docker, or self-hosted)
- Node.js 18+ runtime environment
- Environment variables configured

## Environment Variables

Set the following environment variables in your production environment:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# Redis (Production)
REDIS_URL=redis://your-redis-host:6379
# Or with password:
REDIS_URL=redis://:password@your-redis-host:6379

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS (comma-separated list of allowed origins)
ALLOWED_ORIGINS=https://your-frontend.com,https://www.your-frontend.com
```

## Build Steps

### 1. Install Dependencies

```bash
npm ci --production=false
```

### 2. Build Application

```bash
npm run build
```

### 3. Run Migrations

```bash
npm run migration:run
```

### 4. Start Application

```bash
npm run start:prod
```

## Docker Deployment

### Dockerfile

Create a `Dockerfile` in the root directory:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main.js"]
```

### Docker Compose (Production)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - PORT=3000
      - NODE_ENV=production
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    restart: unless-stopped
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

### Build and Run

```bash
# Build
docker-compose -f docker-compose.prod.yml build

# Run
docker-compose -f docker-compose.prod.yml up -d
```

## Platform-Specific Deployment

### Railway

1. Connect your repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically detect the Node.js app and deploy
4. Ensure `PORT` environment variable is set (Railway provides this automatically)

### Heroku

1. Install Heroku CLI
2. Create `Procfile`:
   ```
   web: node dist/main.js
   ```
3. Deploy:
   ```bash
   heroku create your-app-name
   heroku config:set DATABASE_URL=...
   heroku config:set REDIS_URL=...
   heroku config:set NODE_ENV=production
   git push heroku main
   ```

### AWS (EC2/ECS)

1. Build Docker image
2. Push to ECR (Elastic Container Registry)
3. Deploy using ECS or EC2
4. Configure load balancer for port 3000
5. Set up RDS for PostgreSQL and ElastiCache for Redis

### Vercel/Netlify

These platforms are optimized for serverless functions. For a full NestJS app with WebSockets, consider:
- Railway
- Render
- Fly.io
- DigitalOcean App Platform

## Health Checks

The application exposes health check endpoints:

- `GET /api` - Basic health check
- `GET /api/matches` - Can be used as a health check (returns empty array if no matches)

## Monitoring

### Recommended Tools

- **Application Monitoring**: Sentry, New Relic, or Datadog
- **Logging**: Winston or Pino with centralized logging (Logtail, Papertrail)
- **Uptime Monitoring**: UptimeRobot, Pingdom, or StatusCake

### Logging

The application uses NestJS built-in logger. In production, configure structured logging:

```typescript
// In main.ts
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'log'],
});
```

## Scaling Considerations

### Horizontal Scaling

For multiple instances:

1. **Socket.IO with Redis Adapter**: Use `@socket.io/redis-adapter` for multi-instance WebSocket support
2. **Load Balancer**: Use sticky sessions or Redis adapter for Socket.IO
3. **Database Connection Pooling**: Configured in TypeORM
4. **Redis**: Shared Redis instance for all instances

### Vertical Scaling

- Increase Node.js memory limit if needed: `NODE_OPTIONS=--max-old-space-size=4096`
- Monitor CPU and memory usage
- Consider using PM2 for process management

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set secure CORS origins (no wildcards)
- [ ] Use environment variables for secrets
- [ ] Enable database SSL connections
- [ ] Set up rate limiting (consider using `@nestjs/throttler`)
- [ ] Regular security updates for dependencies
- [ ] Use Redis password authentication
- [ ] Enable PostgreSQL SSL connections
- [ ] Set up firewall rules
- [ ] Regular backups of database

## Post-Deployment

1. **Verify API**: Test all endpoints
2. **Test WebSockets**: Connect and verify real-time updates
3. **Monitor Logs**: Check for errors
4. **Test Simulator**: Start a match simulation
5. **Load Testing**: Use tools like k6 or Artillery

## Rollback Plan

1. Keep previous Docker image/version
2. Database migrations should be reversible
3. Use blue-green deployment strategy
4. Monitor error rates after deployment

## Troubleshooting

### Common Issues

**WebSocket connections failing:**
- Check CORS configuration
- Verify load balancer supports WebSocket upgrades
- Check firewall rules

**Database connection issues:**
- Verify DATABASE_URL format
- Check SSL requirements (Supabase requires SSL)
- Verify network connectivity

**Redis connection issues:**
- Verify REDIS_URL format
- Check Redis authentication
- Verify network connectivity

**High memory usage:**
- Check for memory leaks
- Reduce connection pool size
- Monitor active Socket.IO connections

