# Region and Currency Auto-Detection Feature

## Overview
The application now automatically detects the user's region (language and currency) and allows manual switching between languages and currencies. All prices are automatically converted to the user's preferred currency using real-time exchange rates.

**Price Display Features:**
- Prices are rounded down to whole numbers for better readability
- Converted prices show an info icon (ⓘ) on hover with tooltip
- Tooltip displays: "Приблизительная цена. Точное значение: [original price]"
- No info icon shown when viewing prices in their original currency

## Features Implemented

### 1. Auto-Detection
- **Language Detection**: Automatically detects browser language on first visit
- **Currency Detection**: Maps detected language to appropriate currency
  - English → USD
  - Russian → RUB
  - German/French/Spanish → EUR
  - Chinese → CNY
  - Japanese → JPY
  - Korean → KRW
  - Portuguese → BRL
  - Arabic → AED

### 2. Manual Selection
- Globe icon in navigation bar opens region selector
- Two tabs:
  - **Language**: Choose from 10 supported languages
  - **Currency**: Choose from 20+ supported currencies
- Settings are saved for authenticated users
- Anonymous users' preferences stored in browser session

### 3. Currency Conversion
- Real-time exchange rates fetched from exchangerate-api.com
- Rates cached in database for 1 hour to reduce API calls
- All prices on market pages automatically converted
- Formatted according to currency locale (e.g., $1,234.56, €1.234,56, ₽1 234,56)

### 4. Database Schema
Three new tables:
- `currencies`: Stores available currencies with symbols and locales
- `exchange_rates`: Caches exchange rates with timestamps
- `user_preferences`: Stores user language and currency preferences

### 5. Edge Function
- `fetch-exchange-rates`: Fetches current rates and stores in database
- Automatic caching prevents excessive API calls
- Supports batch rate fetching for all currencies

## Technical Details

### Context Provider: RegionContext
Located at: `src/contexts/RegionContext.tsx`

Provides:
- `language`: Current language code
- `currency`: Current currency code
- `currencySymbol`: Symbol for current currency
- `currencies`: List of available currencies
- `setLanguage(lang)`: Change language
- `setCurrency(currency)`: Change currency (triggers rate fetch)
- `convertPrice(amount, fromCurrency)`: Convert price to user's currency
- `formatPrice(amount, fromCurrency)`: Convert, round down, and format price with symbol
- `formatPriceWithOriginal(amount, fromCurrency)`: Returns formatted price, original price, and conversion status

### UI Component: PriceDisplay
Located at: `src/components/PriceDisplay.tsx`

Features:
- Displays converted prices rounded down to whole numbers
- Shows info icon (ⓘ) for converted prices
- Tooltip on hover shows original price
- Supports single prices and price ranges
- Automatically hides info icon when no conversion occurred

Props:
- `amount`: Base price amount
- `fromCurrency`: Original currency code
- `className?`: Optional CSS classes
- `showRange?`: Enable range display (for orders)
- `maxAmount?`: Maximum price for range display

### UI Component: RegionSelector
Located at: `src/components/RegionSelector.tsx`

Features:
- Dropdown with language and currency tabs
- Visual indicator of current selection
- Checkmarks for active selections
- Auto-closes after selection

### Updated Pages
All market and deal pages now use `PriceDisplay` component:
- `MarketPage.tsx`: Market listings and detail modal with info icons
- `OrderDetailPage.tsx`: Order details with price ranges and tooltips
- `TaskDetailPage.tsx`: Task details with single prices and tooltips
- `MyDealsPage.tsx`: Deal listings, proposals, and options with conversion indicators

### Exchange Rate API
Uses exchangerate-api.com free tier:
- 1500 requests per month
- Rates cached in database for 1 hour
- Automatic fallback to cached rates

## Usage Examples

### For Users
1. Click globe icon in navigation
2. Select language in first tab
3. Select currency in second tab
4. All prices automatically update

### For Developers

#### Using PriceDisplay Component
```typescript
import PriceDisplay from '@/components/PriceDisplay';

// Single price
<PriceDisplay amount={100} fromCurrency="USD" />

// Price range (for orders)
<PriceDisplay
  amount={50}
  maxAmount={150}
  fromCurrency="USD"
  showRange={true}
/>
```

#### Using Region Context Directly
```typescript
import { useRegion } from '@/contexts/RegionContext';

function MyComponent() {
  const { formatPrice, formatPriceWithOriginal, currency, setCurrency } = useRegion();

  // Convert and format a price (rounded down)
  const displayPrice = formatPrice(100, 'USD'); // "€92" if user's currency is EUR

  // Get price with original value for tooltip
  const priceData = formatPriceWithOriginal(100, 'USD');
  // Returns: { formatted: "€92", original: "$100", isConverted: true }

  // Change currency programmatically
  await setCurrency('EUR');
}
```

## Supported Currencies
USD, EUR, RUB, GBP, JPY, CNY, KRW, INR, BRL, AUD, CAD, CHF, SEK, NOK, PLN, TRY, MXN, AED, SGD, HKD

## Supported Languages
English, Russian, Spanish, German, French, Chinese, Japanese, Korean, Portuguese, Arabic

## Notes
- **Auto-Update**: Exchange rates automatically refresh every hour in the background
- **Smart Caching**: Rates cached in database for 1 hour to reduce API calls
- **USD as Base**: All rates fetched using USD as base currency for maximum compatibility
- **Multi-Path Conversion**: Supports direct conversion, inverse conversion, and conversion through USD
  - Example: RUB → EUR converts as: RUB → USD → EUR
- **Offline Fallback**: Last cached rates used when API unavailable
- **Price Rounding**: All converted prices are rounded down using `Math.floor()` for consistency
- **Info Icons**: Only shown when currency conversion occurs (when `fromCurrency !== userCurrency`)
- **Tooltip Behavior**: Displays "Приблизительная цена. Точное значение: [original]" on hover
- **Accessibility**: Info icon uses `cursor-help` for better UX indication
- **Data Integrity**: All prices maintain their original currency in the database
