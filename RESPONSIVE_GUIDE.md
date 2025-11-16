# Responsive Design Guide

## Breakpoints

The application supports responsive design across multiple device categories:

### Mobile Devices
- **xs (360px)**: Extra small phones
- **xs-375 (375px)**: iPhone SE, iPhone 12 mini
- **xs-390 (390px)**: iPhone 12/13/14 standard
- **xs-414 (414px)**: iPhone Plus models
- **xs-428 (428px)**: iPhone Pro Max models

### Tablets
- **sm (640px)**: Small tablets (portrait)
- **md (768px)**: iPad portrait
- **md-820 (820px)**: iPad Air portrait
- **lg (1024px)**: iPad landscape
- **lg-1280 (1280px)**: Large tablets landscape

### Desktops
- **xl (1366px)**: Standard laptops
- **xl-1440 (1440px)**: MacBook Pro 14"
- **xl-1536 (1536px)**: MacBook Pro 15-16"
- **2xl (1920px)**: Full HD displays
- **3xl (2560px)**: 2K/QHD displays

## Usage Examples

### Responsive Padding
```tsx
className="px-3 xs-375:px-4 sm:px-6 lg:px-8"
```

### Responsive Text
```tsx
className="text-sm xs-375:text-base md:text-lg"
```

### Responsive Grid
```tsx
className="grid grid-cols-1 xs-390:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
```

### Conditional Display
```tsx
<span className="hidden xs-390:inline">Full Text</span>
<span className="inline xs-390:hidden">Short</span>
```

## Utility Classes

The application includes several utility classes for responsive design:

### Containers
- `.page-container`: Standard page container with responsive padding
- `.page-container-narrow`: Narrow container for focused content
- `.page-container-wide`: Wide container for dashboard layouts

### Grids
- `.responsive-grid-2`: 1 column on mobile, 2 on larger screens
- `.responsive-grid-3`: 1 → 2 → 3 columns
- `.responsive-grid-4`: 1 → 2 → 3 → 4 columns

### Typography
- `.text-responsive-xs`: Extra small responsive text
- `.text-responsive-sm`: Small responsive text
- `.text-responsive-base`: Base responsive text
- `.text-responsive-lg`: Large responsive text
- `.text-responsive-xl`: Extra large responsive text
- `.text-responsive-2xl`: 2X large responsive text

## Performance Optimizations

### Typography Scaling
Base font sizes scale automatically:
- 360px: 14px
- 375px+: 15px
- 768px+: 16px
- 1366px+: 16px
- 1920px+: 17px
- 2560px+: 18px

### Image Optimization
- Native lazy loading for images
- Intersection Observer fallback
- GPU acceleration for animations
- Content visibility optimization

### Code Splitting
The build process automatically splits code into vendor chunks:
- `react-vendor`: React core libraries
- `motion-vendor`: Framer Motion animations
- `supabase-vendor`: Supabase client
- `icons-vendor`: Lucide React icons

## Testing Responsive Design

Test the application at these key breakpoints:
1. 360px (smallest mobile)
2. 375px (iPhone SE)
3. 414px (iPhone Plus)
4. 768px (iPad portrait)
5. 1024px (iPad landscape)
6. 1366px (laptop)
7. 1920px (Full HD desktop)
8. 2560px (2K/QHD display)

## Mobile-First Approach

All styles are mobile-first by default. Add larger breakpoints as needed:

```tsx
// ✅ Correct: Mobile first
className="text-sm md:text-base lg:text-lg"

// ❌ Incorrect: Desktop first
className="text-lg md:text-base sm:text-sm"
```

## Accessibility

- Touch targets are minimum 44x44px on mobile
- Text remains readable at all sizes
- Navigation adapts to screen size
- Forms are optimized for mobile input
