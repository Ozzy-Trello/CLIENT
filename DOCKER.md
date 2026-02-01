# Docker Deployment Guide

This guide explains how to build and deploy the frontend application using Docker.

## Prerequisites

- Docker and Docker Compose installed
- `.env` file with required environment variables

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Required environment variables:
- `NEXT_PUBLIC_ENCRYPTION_KEY`: Encryption key for sensitive data
- `NEXT_PUBLIC_BE_BASE_URL`: Backend API base URL

## Development

### Build and run with Docker Compose:

```bash
# Build and start the container
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f frontend

# Stop the container
docker-compose down
```

## Production

### Using production docker-compose:

```bash
# Create production environment file
cp .env.example .env.production

# Edit .env.production with production values
nano .env.production

# Build and deploy
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Manual Docker commands:

```bash
# Build the image
docker build -t ozzy-frontend .

# Run the container
docker run -d \
  --name ozzy-frontend \
  -p 3000:3000 \
  --env-file .env \
  ozzy-frontend

# View logs
docker logs -f ozzy-frontend

# Stop and remove
docker stop ozzy-frontend
docker rm ozzy-frontend
```

## Image Optimization

The Dockerfile uses multi-stage builds to create a slim production image:

- **Stage 1 (deps)**: Install only production dependencies
- **Stage 2 (builder)**: Build the Next.js application
- **Stage 3 (runner)**: Create minimal runtime image with Alpine Linux

### Image size optimization features:

- Alpine Linux base image (~5MB)
- Multi-stage build to exclude build dependencies
- Non-root user for security
- Standalone Next.js output
- Optimized layer caching
- Health checks included

## Health Checks

The container includes health checks that verify the application is running:

- Endpoint: `GET /api/health`
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

## Security Features

- Non-root user (nextjs:nodejs)
- Proper signal handling with dumb-init
- Security headers configured in Next.js
- Read-only environment file mounting
- Resource limits in production

## Troubleshooting

### Check container status:
```bash
docker ps
docker-compose ps
```

### View detailed logs:
```bash
docker logs ozzy-frontend
docker-compose logs frontend
```

### Access container shell:
```bash
docker exec -it ozzy-frontend sh
```

### Check health status:
```bash
curl http://localhost:3000/api/health
```

## Environment File Management

The Docker setup supports dynamic environment configuration:

1. **Development**: Mount `.env` file as read-only volume
2. **Production**: Mount `.env.production` file
3. **Runtime**: Environment variables can be updated without rebuilding the image

### Example .env file:
```env
NEXT_PUBLIC_ENCRYPTION_KEY=your-secret-encryption-key
NEXT_PUBLIC_BE_BASE_URL=http://your-backend-api.com
```