#!/bin/bash

# Test Build Script - Verify build works before Docker deployment
# Usage: ./test-build.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Next.js Build Process...${NC}"
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production not found, creating from .env.example...${NC}"
    cp .env.example .env.production
    echo "✓ Created .env.production"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm ci
    echo "✓ Dependencies installed"
fi

# Run type checking first
echo -e "${BLUE}🔍 Running TypeScript type check...${NC}"
if npx tsc --noEmit; then
    echo -e "${GREEN}✓ TypeScript check passed${NC}"
else
    echo -e "${RED}❌ TypeScript check failed${NC}"
    exit 1
fi

# Test the build
echo -e "${BLUE}🔧 Testing Next.js build...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo ""
    echo -e "${BLUE}📊 Build output:${NC}"
    ls -la .next/
    echo ""
    echo -e "${GREEN}🎉 Ready for Docker deployment!${NC}"
    echo "You can now run: ./deploy.sh"
else
    echo -e "${RED}❌ Build failed${NC}"
    echo ""
    echo -e "${YELLOW}💡 Common fixes:${NC}"
    echo "  • Check import paths and aliases"
    echo "  • Verify all dependencies are installed"
    echo "  • Check for TypeScript errors"
    echo "  • Review environment variables"
    exit 1
fi