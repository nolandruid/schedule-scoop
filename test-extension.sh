#!/bin/bash

# Test script for Carleton Schedule Exporter
echo "🧪 Testing Carleton Schedule Exporter Extension"
echo "=============================================="

# Check if manifest.json exists and is valid
echo "✅ Checking manifest.json..."
if [ -f "manifest.json" ]; then
    echo "   ✓ manifest.json exists"
    # Check if it's valid JSON
    if python3 -m json.tool manifest.json > /dev/null 2>&1; then
        echo "   ✓ manifest.json is valid JSON"
    else
        echo "   ❌ manifest.json has invalid JSON"
        exit 1
    fi
else
    echo "   ❌ manifest.json not found"
    exit 1
fi

# Check if popup files exist
echo "✅ Checking popup files..."
if [ -f "popup-clean.html" ]; then
    echo "   ✓ popup-clean.html exists"
else
    echo "   ❌ popup-clean.html not found"
fi

if [ -f "src/clean-popup.js" ]; then
    echo "   ✓ clean-popup.js exists"
else
    echo "   ❌ clean-popup.js not found"
fi

if [ -f "styles/clean-style.css" ]; then
    echo "   ✓ clean-style.css exists"
else
    echo "   ❌ clean-style.css not found"
fi

# Check if background script exists
echo "✅ Checking background script..."
if [ -f "src/background.js" ]; then
    echo "   ✓ background.js exists"
else
    echo "   ❌ background.js not found"
fi

# Check if content script exists
echo "✅ Checking content script..."
if [ -f "armory/carleton-timetables.js" ]; then
    echo "   ✓ carleton-timetables.js exists"
else
    echo "   ❌ carleton-timetables.js not found"
fi

# Check if icons exist
echo "✅ Checking icons..."
if [ -f "images/sky-icon.png" ]; then
    echo "   ✓ sky-icon.png exists"
else
    echo "   ❌ sky-icon.png not found"
fi

if [ -f "images/sky-icon128.png" ]; then
    echo "   ✓ sky-icon128.png exists"
else
    echo "   ❌ sky-icon128.png not found"
fi

echo ""
echo "🎉 Extension file check complete!"
echo ""
echo "📋 Next steps to test:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (top right toggle)"
echo "3. Click 'Load unpacked' and select this folder"
echo "4. Click the extension icon in your toolbar"
echo "5. Try the 'Export Current Term' button"
echo ""
echo "🔗 For full testing, you'll need to:"
echo "   - Log into Carleton Central"
echo "   - Navigate to your schedule page"
echo "   - Use the extension to export"
echo ""
