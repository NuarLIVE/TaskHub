import { Info } from 'lucide-react';
import { useRegion } from '../contexts/RegionContext';

interface PriceDisplayProps {
  amount: number;
  fromCurrency: string;
  className?: string;
  showRange?: boolean;
  maxAmount?: number;
}

export default function PriceDisplay({ amount, fromCurrency, className = '', showRange = false, maxAmount }: PriceDisplayProps) {
  const { formatPriceWithOriginal, t } = useRegion();

  if (showRange && maxAmount !== undefined) {
    const minPrice = formatPriceWithOriginal(amount, fromCurrency);
    const maxPrice = formatPriceWithOriginal(maxAmount, fromCurrency);

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
                <div className="text-gray-300 mb-1">{t.price.approximately}</div>
                <div className="font-medium">{t.price.exactValue}: {minPrice.original}–{maxPrice.original}</div>
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

  const priceData = formatPriceWithOriginal(amount, fromCurrency);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-semibold">{priceData.formatted}</span>
      {priceData.isConverted && (
        <div className="relative group">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
            <div className="text-center">
              <div className="text-gray-300 mb-1">{t.price.approximately}</div>
              <div className="font-medium">{t.price.exactValue}: {priceData.original}</div>
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
