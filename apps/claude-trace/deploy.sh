#!/bin/bash

# Claude Trace Deployment Script
set -e

echo "🚀 Starting claude-trace deployment..."

# Check if NPM_TOKEN is set
if [ -z "$NPM_TOKEN" ]; then
    echo "❌ Error: NPM_TOKEN environment variable not set"
    echo "Please set your private registry auth token:"
    echo "export NPM_TOKEN='your-token-here'"
    exit 1
fi

# Check if PRIVATE_REGISTRY is set
if [ -z "$PRIVATE_REGISTRY" ]; then
    echo "❌ Error: PRIVATE_REGISTRY environment variable not set"
    echo "Please set your private registry URL:"
    echo "export PRIVATE_REGISTRY='https://your-private-npm-server.com/'"
    exit 1
fi

echo "📋 Using registry: $PRIVATE_REGISTRY"

# Update .npmrc with dynamic registry
cat > .npmrc << EOF
registry=$PRIVATE_REGISTRY
@mariozechner:registry=$PRIVATE_REGISTRY
//${PRIVATE_REGISTRY#https://}:_authToken=\${NPM_TOKEN}
EOF

echo "🧹 Cleaning previous builds..."
npm run clean

echo "📦 Installing dependencies..."
npm install
cd frontend && npm install && cd ..

echo "🔨 Building project..."
npm run build

echo "🔍 Running type check..."
npm run typecheck

echo "📋 Package contents that will be published:"
npm pack --dry-run

# Prompt for version bump
echo ""
read -p "🔢 Bump version? (patch/minor/major/skip): " version_bump

if [ "$version_bump" != "skip" ] && [ "$version_bump" != "" ]; then
    npm version $version_bump
fi

# Prompt for tag
echo ""
read -p "🏷️  Add tag? (latest/beta/alpha/skip): " tag

echo "📤 Publishing to private registry..."
if [ "$tag" != "skip" ] && [ "$tag" != "" ]; then
    npm publish --tag $tag
else
    npm publish
fi

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Package details:"
npm view @mariozechner/claude-trace

echo ""
echo "💡 To install globally:"
echo "npm install -g @mariozechner/claude-trace --registry=$PRIVATE_REGISTRY"
echo ""
echo "💡 To use with npx:"
echo "npx @mariozechner/claude-trace --registry=$PRIVATE_REGISTRY"