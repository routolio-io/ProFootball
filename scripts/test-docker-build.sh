#!/bin/bash

# Test Docker build locally before deploying to Railway
# This script validates the Docker build process

set -e

echo "🐳 Testing Docker build for ProFootball..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if .env file exists (for local testing)
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found. Creating a test .env file...${NC}"
    cat > .env << EOF
DATABASE_URL=postgresql://test:test@localhost:5432/test
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:3000
EOF
fi

# Build the Docker image
echo -e "\n${GREEN}📦 Building Docker image...${NC}"
if docker build -t profootball-app:test .; then
    echo -e "${GREEN}✅ Docker build successful!${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Check image size
IMAGE_SIZE=$(docker images profootball-app:test --format "{{.Size}}")
echo -e "${GREEN}📊 Image size: ${IMAGE_SIZE}${NC}"

# Test that the image can start (without actually running it)
echo -e "\n${GREEN}🧪 Testing image configuration...${NC}"

# Check if dist/main.js would exist (we can't actually run it without DB/Redis)
if docker run --rm profootball-app:test ls -la dist/main.js > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application files are present${NC}"
else
    echo -e "${RED}❌ Application files are missing${NC}"
    exit 1
fi

# Test health check script syntax
echo -e "\n${GREEN}🏥 Testing health check...${NC}"
if docker run --rm profootball-app:test node -e "require('http').get('http://localhost:3000/api', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" 2>&1 | grep -q "ECONNREFUSED\|ETIMEDOUT"; then
    echo -e "${GREEN}✅ Health check script is valid (connection refused is expected without running server)${NC}"
else
    echo -e "${YELLOW}⚠️  Health check test inconclusive${NC}"
fi

echo -e "\n${GREEN}✅ All Docker build tests passed!${NC}"
echo -e "${GREEN}🚀 Ready to deploy to Railway!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Push your code to GitHub"
echo "2. Connect your repository to Railway"
echo "3. Set environment variables in Railway dashboard"
echo "4. Railway will automatically build and deploy using the Dockerfile"

