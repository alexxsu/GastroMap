#!/bin/bash

# Script to generate PWA icons from logo.svg
# This creates all the necessary icon sizes for web and mobile

echo "🎨 Generating PWA icons from logo.svg..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Installing..."
    # Uncomment the appropriate line for your system:
    # sudo apt-get install -y imagemagick  # Ubuntu/Debian
    # brew install imagemagick              # macOS
fi

# Check if the logo exists
if [ ! -f "public/logo.svg" ]; then
    echo "❌ Error: public/logo.svg not found!"
    exit 1
fi

# Create icons directory if it doesn't exist
mkdir -p public/icons

echo "📱 Generating icons..."

# Generate different sizes
# 16x16 - Browser favicon
convert -background none -resize 16x16 public/logo.svg public/icons/favicon-16x16.png

# 32x32 - Browser favicon
convert -background none -resize 32x32 public/logo.svg public/icons/favicon-32x32.png

# 180x180 - Apple Touch Icon (most important for iOS)
convert -background none -resize 180x180 public/logo.svg public/icons/apple-touch-icon.png

# 192x192 - Android Chrome
convert -background none -resize 192x192 public/logo.svg public/icons/icon-192x192.png

# 512x512 - Android Chrome (splash screen)
convert -background none -resize 512x512 public/logo.svg public/icons/icon-512x512.png

# Generate favicon.ico (multi-size)
convert public/icons/favicon-16x16.png public/icons/favicon-32x32.png public/favicon.ico

echo "✅ Icons generated successfully!"
echo ""
echo "Generated files:"
ls -lh public/icons/
ls -lh public/favicon.ico

echo ""
echo "🎉 All done! Your PWA icons are ready."
