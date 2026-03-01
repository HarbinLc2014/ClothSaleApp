// Utility functions

/**
 * Calculate profit and profit margin
 * @param costPrice - Cost price (进价)
 * @param sellingPrice - Selling price (售价)
 * @returns { profit, profitRate, profitRateText }
 */
export const calculateProfit = (costPrice: number, sellingPrice: number) => {
  if (costPrice <= 0) {
    return { profit: 0, profitRate: 0, profitRateText: '0%' };
  }

  const profit = sellingPrice - costPrice;
  const profitRate = (profit / costPrice) * 100;
  const profitRateText = profitRate >= 0
    ? `+${profitRate.toFixed(1)}%`
    : `${profitRate.toFixed(1)}%`;

  return {
    profit,
    profitRate,
    profitRateText,
  };
};

/**
 * Format price with currency symbol
 * @param price - Price number
 * @returns Formatted price string
 */
export const formatPrice = (price: number) => {
  return `¥${price.toFixed(2)}`;
};
