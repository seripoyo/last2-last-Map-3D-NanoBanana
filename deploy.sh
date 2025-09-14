#!/bin/bash

# YouWare Deployment Script
# This script builds the project and prepares it for YouWare deployment

echo "================================================"
echo "🚀 YouWare Deployment Script"
echo "================================================"
echo ""

# Step 1: Clean old build
echo "🧹 Step 1: Cleaning old build..."
rm -rf dist/
echo "   ✓ Old build files removed"
echo ""

# Step 2: Install dependencies
echo "📦 Step 2: Checking dependencies..."
if ! npm list terser >/dev/null 2>&1; then
  echo "   Installing terser..."
  npm install terser --save-dev
fi
echo "   ✓ Dependencies ready"
echo ""

# Step 3: Build project
echo "🔨 Step 3: Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "   ✓ Build successful!"
  echo ""

  # Step 4: Display build info
  echo "📊 Step 4: Build Information"
  echo "================================================"
  echo "Build timestamp: $(date)"
  echo ""
  echo "Generated files:"
  echo "----------------"
  ls -lah dist/
  echo ""
  echo "Asset files:"
  echo "------------"
  ls -lah dist/assets/
  echo ""

  # Step 5: Check for CSS changes
  echo "🎨 Step 5: Verifying CSS changes..."
  if grep -q "margin-bottom: 4rem" dist/assets/index-*.css 2>/dev/null; then
    echo "   ✓ Custom CSS rules found in build"
  else
    echo "   ⚠ Warning: Custom CSS rules may not be included"
  fi
  echo ""

  # Step 6: Instructions
  echo "================================================"
  echo "✅ BUILD COMPLETE - Ready for deployment!"
  echo "================================================"
  echo ""
  echo "📝 Next Steps:"
  echo "1. Upload the 'dist' folder contents to YouWare"
  echo "2. Clear browser cache (Ctrl+Shift+R)"
  echo "3. Add ?debug=true to URL to verify deployment"
  echo ""
  echo "📁 Files to upload:"
  echo "   - dist/index.html"
  echo "   - dist/yw_manifest.json"
  echo "   - dist/assets/ (entire folder)"
  echo ""
  echo "🔍 To verify deployment:"
  echo "   https://youware.app/project/your-app?debug=true"
  echo ""
else
  echo ""
  echo "================================================"
  echo "❌ BUILD FAILED!"
  echo "================================================"
  echo "Please check the error messages above and fix any issues."
  echo ""
  echo "Common issues:"
  echo "- Missing dependencies: run 'npm install'"
  echo "- TypeScript errors: check your code for type errors"
  echo "- Import errors: verify all imports are correct"
  echo ""
  exit 1
fi