import { Info } from 'lucide-react';
import { useRegion } from '../contexts/RegionContext';

interface PriceDisplayProps {
  amount: number;
  fromCurrency?: string;
  currency?: string;
  className?: string;
  showRange?: boolean;
  maxAmount?: number;
  discount?: number;
}

export default function PriceDisplay({ amount, fromCurrency, currency, className = '', showRange = false, maxAmount, discount }: PriceDisplayProps) {
  const { formatPriceWithOriginal } = useRegion();
  const actualCurrency = fromCurrency || currency || 'USD';

  if (showRange && maxAmount !== undefined) {
    const minPrice = formatPriceWithOriginal(amount, actualCurrency);
    const maxPrice = formatPriceWithOriginal(maxAmount, actualCurrency);

    if (discount && discount > 0) {
      const discountedMin = amount * (1 - discount / 100);
      const discountedMax = maxAmount * (1 - discount / 100);
      const discountedMinPrice = formatPriceWithOriginal(discountedMin, actualCurrency);
      const discountedMaxPrice = formatPriceWithOriginal(discountedMax, actualCurrency);

      return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
          <span className="line-through text-red-500 text-sm">
            {minPrice.formatted}–{maxPrice.formatted}
          </span>
          <span className="font-semibold">
            {discountedMinPrice.formatted}–{discountedMaxPrice.formatted}
          </span>
          {minPrice.isConverted && (
            <div className="relative group">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                <div className="text-center">
                  <div className="text-gray-300 mb-1">Приблизительная цена</div>
                  <div className="font-medium">Точное значение: {discountedMinPrice.original}–{discountedMaxPrice.original}</div>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                  <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className="font-semibold">
          {minPrice.formatted}–{maxPrice.formatted}
        </span>
        {minPrice.isConverted && (
          <div className="relative group">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
              <div className="text-center">
                <div className="text-gray-300 mb-1">Приблизительная цена</div>
                <div className="font-medium">Точное значение: {minPrice.original}–{maxPrice.original}</div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const priceData = formatPriceWithOriginal(amount, actualCurrency);

  if (discount && discount > 0) {
    const discountedAmount = amount * (1 - discount / 100);
    const discountedPrice = formatPriceWithOriginal(discountedAmount, actualCurrency);

    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="line-through text-red-500 text-sm">{priceData.formatted}</span>
        <span className="font-semibold">{discountedPrice.formatted}</span>
        {priceData.isConverted && (
          <div className="relative group">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
              <div className="text-center">
                <div className="text-gray-300 mb-1">Приблизительная цена</div>
                <div className="font-medium">Точное значение: {discountedPrice.original}</div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-semibold">{priceData.formatted}</span>
      {priceData.isConverted && (
        <div className="relative group">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
            <div className="text-center">
              <div className="text-gray-300 mb-1">Приблизительная цена</div>
              <div className="font-medium">Точное значение: {priceData.original}</div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
