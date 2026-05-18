#!/bin/bash

echo "========================================="
echo "  GuruConnect Deployment Script"
echo "========================================="
echo ""

# Detect if running in Docker
if [ -f /.dockerenv ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
    DOCKER=true
    echo "[Docker Environment Detected]"
else
    DOCKER=false
fi

# Detect OS
if [ "$(uname)" == "Darwin" ]; then
    OS="macos"
elif [ -f /etc/debian_version ]; then
    OS="debian"
else
    OS="linux"
fi

echo "OS: $OS"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Error handler
error_exit() {
    echo -e "${RED}ERROR: $1${NC}"
    exit 1
}

# Check Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed. Please install Node.js 18+ first."
    fi
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error_exit "Node.js version 18+ is required. Current version: $(node -v)"
    fi
    echo -e "${GREEN}✓${NC} Node.js $(node -v)"
}

# Check MongoDB connection
check_mongodb() {
    if [ -n "$MONGO_URI" ]; then
        echo -e "${GREEN}✓${NC} MongoDB URI configured"
    else
        echo -e "${YELLOW}⚠${NC} MongoDB URI not set (using default)"
    fi
}

# Start Backend
start_backend() {
    echo ""
    echo "Starting Backend Server..."
    cd "$(dirname "$0")/BACKEND" || exit 1

    if [ ! -f "package.json" ]; then
        error_exit "Backend package.json not found"
    fi

    npm install --silent 2>/dev/null

    if [ "$NODE_ENV" = "production" ]; then
        echo -e "${GREEN}→${NC} Production mode"
        npm start
    else
        echo -e "${GREEN}→${NC} Development mode"
        npm run dev
    fi
}

# Main
main() {
    check_node
    check_mongodb

    echo ""
    echo "Starting services..."

    if [ "$DOCKER" = true ]; then
        echo "Running in Docker mode"
        start_backend
    else
        start_backend
    fi
}

main "$@"