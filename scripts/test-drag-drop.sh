#!/bin/bash

# Quick test script for Playlist Drag & Drop feature
# Usage: ./scripts/test-drag-drop.sh

set -e

echo "=========================================="
echo "Playlist Drag & Drop - Quick Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Pre-flight checks
echo "📋 Pre-flight Checks..."
echo ""

# Check if we're in project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Running yarn install...${NC}"
    yarn install
fi

echo -e "${GREEN}✅ Environment ready${NC}"
echo ""

# Run type check
echo "🔍 Running TypeScript type check..."
if yarn typecheck 2>&1 | grep -q "error TS"; then
    echo -e "${RED}❌ TypeScript errors found${NC}"
    yarn typecheck
    exit 1
else
    echo -e "${GREEN}✅ Type check passed${NC}"
fi
echo ""

# Run linter
echo "🔍 Running ESLint..."
if yarn lint 2>&1 | grep -q "error"; then
    echo -e "${YELLOW}⚠️  Linting issues found (continuing anyway)${NC}"
    yarn lint
else
    echo -e "${GREEN}✅ Linting passed${NC}"
fi
echo ""

# Display test instructions
echo "=========================================="
echo "🚀 Starting Electron App in Dev Mode"
echo "=========================================="
echo ""
echo "After the app launches, follow these quick tests:"
echo ""
echo -e "${GREEN}1. Basic Drag Test (30 seconds):${NC}"
echo "   • Open any playlist with 5+ tracks"
echo "   • Drag track #3 to position #1"
echo "   • Verify it moves instantly"
echo ""
echo -e "${GREEN}2. Sort Toggle Test (15 seconds):${NC}"
echo "   • Click 'Title' column → drag should disable"
echo "   • Click '#' column → drag should re-enable"
echo ""
echo -e "${GREEN}3. Persistence Test (30 seconds):${NC}"
echo "   • Drag a track to new position"
echo "   • Close app completely (Ctrl+Q)"
echo "   • Reopen app → verify order persisted"
echo ""
echo -e "${YELLOW}📖 Full testing guide: docs/aidev-notes/TESTING-drag-drop.md${NC}"
echo ""
echo "Press Ctrl+C to stop the app when done testing"
echo ""
echo "=========================================="
echo ""

# Wait a moment for user to read
sleep 3

# Start dev mode
echo "Starting yarn dev..."
echo ""
yarn dev
