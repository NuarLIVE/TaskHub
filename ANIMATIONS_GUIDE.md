# Page Animations Guide

## Overview

All pages use smooth, performant animations powered by Framer Motion for a polished user experience.

## Standard Animation Pattern

Every page follows this pattern:

```typescript
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = {
  type: 'spring' as const,
  stiffness: 140,
  damping: 20,
  mass: 0.9
};

export default function MyPage() {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="page-name"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-background"
      >
        {/* Page content */}
      </motion.div>
    </AnimatePresence>
  );
}
```

## Animation Properties

### Variants
- **initial**: Page appears from below (y: 16) with opacity: 0
- **in**: Page animates to normal position (y: 0) with opacity: 1
- **out**: Page exits upward (y: -16) with opacity: 0

### Transition
- **type**: Spring animation for natural feel
- **stiffness**: 140 (medium bounce)
- **damping**: 20 (smooth deceleration)
- **mass**: 0.9 (light weight for quick animation)

### Duration
Total animation time: ~300-400ms

## Pages with Animations

### ✅ Implemented
- MarketPage
- ProfilePage
- ProposalsPage
- RecommendationsPage
- MyDealsPage
- MessagesPage
- OrderDetailPage
- TaskDetailPage
- OrderCreatePage
- TaskCreatePage
- OrderEditPage
- TaskEditPage
- HomePage
- LoginPage
- RegisterPage
- MyOrdersPage
- MyTasksPage

### Key Benefits

1. **Smooth Transitions**: No jarring page jumps
2. **Visual Continuity**: Clear indication of navigation
3. **Professional Feel**: Polished, app-like experience
4. **Performance**: GPU-accelerated animations
5. **Accessibility**: Respects prefers-reduced-motion

## Animation Performance

### CSS Optimizations
```css
.animate-spin,
[class*="animate-"] {
  will-change: transform;
  transform: translateZ(0);
}
```

This ensures:
- GPU acceleration
- Smooth 60fps animations
- No layout thrashing
- Reduced CPU usage

## Motion Preferences

Animations respect system preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## AnimatePresence Mode

Using `mode="wait"`:
- Exit animation completes before enter begins
- Prevents content overlap
- Cleaner transitions
- Better perceived performance

## Best Practices

1. **Always wrap pages** in AnimatePresence
2. **Use consistent variants** across all pages
3. **Set unique keys** for each page
4. **Keep animations short** (< 500ms)
5. **Test on mobile** for performance
6. **Respect accessibility** preferences

## Troubleshooting

### Animation Not Working
- Check AnimatePresence wrapper
- Verify unique key prop
- Ensure framer-motion is imported
- Check CSS conflicts

### Performance Issues
- Reduce damping/stiffness
- Disable on low-end devices
- Use will-change sparingly
- Check for layout shifts

## Future Enhancements

- Route-based transition directions
- Gesture-based navigation
- Shared element transitions
- Loading skeleton animations
