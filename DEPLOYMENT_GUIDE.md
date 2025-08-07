# Docker Deployment Guide - CSS Build Error Fix

## Problem Summary
The application was experiencing a "HookWebpackError: Unclosed block" CSS syntax error during the Docker build process, specifically at `/app/static/css/600a4ee24ba03ffb.css:2:60997`. This error occurred due to CSS minimization differences between local and Docker environments.

## Solution Overview
The fix involves:
1. **Dockerfile optimization** - Better Node.js version, memory management, and CSS handling
2. **Next.js configuration** - Disabling CSS minimization in Docker environment
3. **Docker Compose improvements** - Better resource allocation and build arguments
4. **Enhanced deployment script** - Support for both Docker and Docker Compose with debugging

## Files Modified

### 1. Dockerfile
- **Updated to Node 20 LTS Alpine** for better stability
- **Added memory optimization** with `NODE_OPTIONS=--max-old-space-size=2048`
- **Disabled CSS minimization** with `DISABLE_CSS_MINIFICATION=true`
- **Improved multi-stage build** with better caching and cleanup
- **Enhanced health checks** with proper timeout and retry settings

### 2. next.config.mjs
- **Environment-based CSS optimization** - Disables CSS minimization when `DISABLE_CSS_MINIFICATION=true`
- **Improved webpack configuration** - Better CSS handling with style-loader and css-loader
- **Maintained existing optimizations** while fixing the CSS issue

### 3. docker-compose.yml & docker-compose.prod.yml
- **Added build arguments** for `NODE_ENV` and `DISABLE_CSS_MINIFICATION`
- **Resource limits and reservations** - Memory (1G limit, 512M reservation) and CPU (1.0 limit, 0.5 reservation)
- **Environment variables** for memory optimization
- **Logging configuration** for better debugging

### 4. deploy.sh
- **Enhanced with new flags**:
  - `--debug`: Enable verbose Docker build output
  - `--compose`: Use docker-compose instead of direct Docker commands
- **Better error handling** and status reporting
- **Support for both deployment methods** (Docker vs Docker Compose)
- **Improved health checking** for both deployment types

## Usage Instructions

### Option 1: Traditional Docker Deployment
```bash
# Basic deployment
./deploy.sh

# With debug output
./deploy.sh --debug

# Production environment
./deploy.sh production --debug
```

### Option 2: Docker Compose Deployment
```bash
# Development with docker-compose
./deploy.sh --compose

# Production with docker-compose
./deploy.sh production --compose --debug
```

### Manual Docker Compose Commands
```bash
# Development
docker-compose up --build -d

# Production
docker-compose -f docker-compose.prod.yml up --build -d
```

## Key Environment Variables

### Build-time Variables
- `NODE_ENV`: Set to 'production' for production builds
- `DISABLE_CSS_MINIFICATION`: Set to 'true' to disable CSS minimization
- `NODE_OPTIONS`: Set to '--max-old-space-size=2048' for memory optimization

### Runtime Variables
- `PORT`: Application port (default: 3000)
- `HOSTNAME`: Bind hostname (default: 0.0.0.0)
- `NEXT_TELEMETRY_DISABLED`: Disable Next.js telemetry

## Health Monitoring

### Health Check Endpoint
- **URL**: `http://localhost:3000/api/health`
- **Method**: GET
- **Response**: JSON with status, timestamp, uptime, environment, and version

### Docker Health Check
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Start Period**: 40 seconds
- **Retries**: 3 attempts

## Troubleshooting

### CSS Build Errors
If you still encounter CSS build errors:
1. Ensure `DISABLE_CSS_MINIFICATION=true` is set in build arguments
2. Check that `next.config.mjs` properly reads the environment variable
3. Clear Docker build cache: `docker builder prune`

### Memory Issues
If the build runs out of memory:
1. Increase `NODE_OPTIONS=--max-old-space-size=4096`
2. Increase Docker resource limits in docker-compose files
3. Consider using a machine with more RAM

### Container Health Issues
If health checks fail:
1. Check container logs: `docker logs <container_name>`
2. Verify the health endpoint is accessible
3. Ensure the application is binding to `0.0.0.0:3000`

### Debug Mode
Use the `--debug` flag to get verbose output:
```bash
./deploy.sh --debug --compose
```

## Resource Requirements

### Minimum Requirements
- **Memory**: 1GB RAM
- **CPU**: 1 core
- **Disk**: 2GB free space

### Recommended Requirements
- **Memory**: 2GB RAM
- **CPU**: 2 cores
- **Disk**: 5GB free space

## Security Notes
- Container runs as non-root user (`nextjs:nodejs`)
- Environment files are mounted read-only
- Health checks use internal networking
- No sensitive data in build layers

## Performance Optimizations
- Multi-stage Docker build for smaller final image
- Node modules caching between stages
- CSS optimization disabled only in Docker environment
- Proper resource limits to prevent resource exhaustion
- Compression and caching middleware enabled

## Next Steps
1. Test the deployment with your specific environment
2. Monitor resource usage and adjust limits if needed
3. Set up proper logging and monitoring in production
4. Consider implementing CI/CD pipeline with these configurations

## Support
If you encounter issues:
1. Check the deployment logs with `--debug` flag
2. Verify all environment variables are set correctly
3. Ensure Docker and Docker Compose are up to date
4. Review the health check endpoint response