#!/bin/bash

# Production Deployment Script for Ozzy Frontend
# Usage: ./deploy.sh [--no-cache] [--env-file=.env.production] [--debug] [--compose]

set -e  # Exit on any error

# Variables
CONTAINER_NAME="ozzy-frontend"
IMAGE_NAME="ozzy-frontend-image"
HOST_PORT=3000
CONTAINER_PORT=3000
ENV_FILE=".env.production"
NETWORK_NAME="ozzy-network"

# Parse command line arguments
NO_CACHE=""
DEBUG_MODE=""
USE_COMPOSE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-cache)
      NO_CACHE="--no-cache"
      shift
      ;;
    --env-file=*)
      ENV_FILE="${1#*=}"
      shift
      ;;
    --debug)
      DEBUG_MODE="true"
      shift
      ;;
    --compose)
      USE_COMPOSE="true"
      shift
      ;;
    *)
      echo "Unknown option $1"
      echo "Usage: $0 [--no-cache] [--env-file=.env.production] [--debug] [--compose]"
      exit 1
      ;;
  esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Ozzy Frontend Production Deployment...${NC}"
echo "Container: $CONTAINER_NAME"
echo "Image: $IMAGE_NAME"
echo "Port: $HOST_PORT:$CONTAINER_PORT"
echo "Environment file: $ENV_FILE"
echo ""

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file '$ENV_FILE' not found!${NC}"
    echo -e "${YELLOW}💡 Please create it from .env.example:${NC}"
    echo "   cp .env.example $ENV_FILE"
    echo "   nano $ENV_FILE"
    exit 1
fi

# Create network if it doesn't exist
echo -e "${BLUE}🔗 Creating Docker network if not exists...${NC}"
docker network create $NETWORK_NAME 2>/dev/null || true

# Stop and remove existing container
echo -e "${YELLOW}🛑 Stopping and removing existing container...${NC}"
if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
    docker stop $CONTAINER_NAME
    echo "✓ Container stopped"
fi

if docker ps -aq -f name=$CONTAINER_NAME | grep -q .; then
    docker rm $CONTAINER_NAME
    echo "✓ Container removed"
fi

# Remove old image if exists (optional cleanup)
if docker images -q $IMAGE_NAME | grep -q .; then
    echo -e "${YELLOW}🗑️  Removing old image...${NC}"
    docker rmi $IMAGE_NAME 2>/dev/null || true
fi

# Build Docker image or use docker-compose
if [ "$USE_COMPOSE" = "true" ]; then
    echo -e "${BLUE}🔧 Building with docker-compose...${NC}"
    
    # Determine which compose file to use
    COMPOSE_FILE="docker-compose.yml"
    if [ "$ENV_FILE" = ".env.production" ]; then
        COMPOSE_FILE="docker-compose.prod.yml"
    fi
    
    echo "Using compose file: $COMPOSE_FILE"
    
    # Build with docker-compose
    if [ -n "$NO_CACHE" ]; then
        docker-compose -f $COMPOSE_FILE build --no-cache
    else
        docker-compose -f $COMPOSE_FILE build
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Docker-compose build successful${NC}"
        
        # Deploy with docker-compose
        echo -e "${BLUE}🚀 Deploying with docker-compose...${NC}"
        docker-compose -f $COMPOSE_FILE up -d
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Docker-compose deployment successful${NC}"
        else
            echo -e "${RED}❌ Docker-compose deployment failed${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Docker-compose build failed${NC}"
        exit 1
    fi
else
    # Traditional docker build
    echo -e "${BLUE}🔧 Building Docker image (clean build)...${NC}"
    
    # Build arguments for CSS handling
    BUILD_ARGS="--build-arg NODE_ENV=production --build-arg DISABLE_CSS_MINIFICATION=true"
    
    if [ -n "$NO_CACHE" ]; then
        echo "Building with --no-cache flag"
        BUILD_ARGS="$BUILD_ARGS --no-cache"
    fi
    
    if [ "$DEBUG_MODE" = "true" ]; then
        echo "Building with debug output"
        BUILD_ARGS="$BUILD_ARGS --progress=plain"
    fi
    
    echo "Build command: docker build $BUILD_ARGS -t $IMAGE_NAME ."
    docker build $BUILD_ARGS -t $IMAGE_NAME .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Image built successfully${NC}"
    else
        echo -e "${RED}❌ Image build failed${NC}"
        echo -e "${YELLOW}💡 Try running with --debug flag for more details${NC}"
        echo -e "${YELLOW}💡 Or use --compose flag to build with docker-compose${NC}"
        exit 1
    fi
fi

# Run new container (only if not using docker-compose)
if [ "$USE_COMPOSE" != "true" ]; then
    echo -e "${BLUE}🚀 Running new container...${NC}"
    docker run -d \
      --name $CONTAINER_NAME \
      -p $HOST_PORT:$CONTAINER_PORT \
      --env-file $ENV_FILE \
      --network $NETWORK_NAME \
      --restart unless-stopped \
      --cpus="1" \
      --health-cmd="node healthcheck.js" \
      --health-interval=30s \
      --health-timeout=10s \
      --health-retries=3 \
      --health-start-period=40s \
      -v "$(pwd)/$ENV_FILE:/app/.env.local:ro" \
      $IMAGE_NAME

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Container started successfully${NC}"
    else
        echo -e "${RED}❌ Container failed to start${NC}"
        exit 1
    fi
fi

# Wait a moment for container to initialize
echo -e "${YELLOW}⏳ Waiting for container to initialize...${NC}"
sleep 5

# Check container status
echo -e "${BLUE}📊 Container Status:${NC}"
if [ "$USE_COMPOSE" = "true" ]; then
    docker-compose ps
else
    docker ps | grep $CONTAINER_NAME
fi

# Check health status
echo -e "${BLUE}🏥 Health Check:${NC}"
for i in {1..6}; do
    if [ "$USE_COMPOSE" = "true" ]; then
        # For docker-compose, get the actual container name
        ACTUAL_CONTAINER_NAME=$(docker-compose ps -q frontend)
        if [ -n "$ACTUAL_CONTAINER_NAME" ]; then
            HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $ACTUAL_CONTAINER_NAME 2>/dev/null || echo "unknown")
        else
            HEALTH_STATUS="unknown"
        fi
    else
        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")
    fi
    
    echo "Attempt $i/6: Health status = $HEALTH_STATUS"
    
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✅ Container is healthy!${NC}"
        break
    elif [ "$HEALTH_STATUS" = "unhealthy" ]; then
        echo -e "${RED}❌ Container is unhealthy!${NC}"
        echo "Checking logs..."
        if [ "$USE_COMPOSE" = "true" ]; then
            docker-compose logs --tail=20 frontend
        else
            docker logs --tail=20 $CONTAINER_NAME
        fi
        break
    fi
    
    if [ $i -lt 6 ]; then
        sleep 10
    fi
done

# Test the application
echo -e "${BLUE}🧪 Testing application...${NC}"
sleep 2
if curl -f -s http://localhost:$HOST_PORT/api/health > /dev/null; then
    echo -e "${GREEN}✅ Application is responding!${NC}"
    echo "Health endpoint: http://localhost:$HOST_PORT/api/health"
else
    echo -e "${YELLOW}⚠️  Application might still be starting up...${NC}"
fi

# Show logs
echo -e "${BLUE}📝 Recent logs:${NC}"
if [ "$USE_COMPOSE" = "true" ]; then
    docker-compose logs --tail=10 frontend
else
    docker logs --tail=10 $CONTAINER_NAME
fi

# Final status
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo "  • Container: $CONTAINER_NAME"
echo "  • Image: $IMAGE_NAME"
echo "  • URL: http://localhost:$HOST_PORT"
echo "  • Health: http://localhost:$HOST_PORT/api/health"
echo ""
echo -e "${YELLOW}📚 Useful commands:${NC}"
echo "  • View logs: docker logs -f $CONTAINER_NAME"
echo "  • Stop container: docker stop $CONTAINER_NAME"
echo "  • Restart container: docker restart $CONTAINER_NAME"
echo "  • Remove container: docker rm -f $CONTAINER_NAME"
echo ""
echo -e "${GREEN}🎉 Happy coding!${NC}"