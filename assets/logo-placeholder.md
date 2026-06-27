# Logo Assets

## Required Logo Files

To complete the app setup, you'll need to add these logo files:

### App Icon
- `icon.png` - 1024x1024px PNG
  - Should contain the temple/pagoda icon in lime green on transparent or black background
  - Used for app store listings and home screen icon

### Adaptive Icon (Android)
- `adaptive-icon.png` - 1024x1024px PNG
  - Foreground: Temple icon in lime green
  - Background: Black (#000000)
  - Used for Android adaptive icons

### Splash Screen
- `splash.png` - 1242x2436px PNG (or similar ratio)
  - Full logo (icon + "DietTemple" text) centered
  - Black background (#000000)
  - Used for native splash screen

### Favicon (Web)
- `favicon.png` - 48x48px PNG
  - Temple icon only
  - Used for web app favicon

## Current Implementation

The app currently uses a programmatic Logo component that renders:
- Temple/pagoda icon in lime green (#00FF00)
- "Diet" text in lime green
- "Temple" text in white

This works for the splash screen animation, but for production you should add the actual image files listed above.

## Logo Design Specifications

Based on the provided design:
- **Icon**: Multi-tiered temple/pagoda in bright lime green (#00FF00)
- **Text**: "DietTemple" with "Diet" in lime green and "Temple" in white
- **Background**: Black (#000000)
- **Style**: Modern, clean, minimalist



