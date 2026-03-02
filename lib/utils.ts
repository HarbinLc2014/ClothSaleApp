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

/**
 * Get current date in Beijing timezone (UTC+8)
 * @returns Date string in YYYY-MM-DD format
 */
export const getBeijingDate = (): string => {
  const now = new Date();
  // Beijing is UTC+8
  const beijingTime = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000);
  return beijingTime.toISOString().split('T')[0];
};

/**
 * Get Beijing time Date object
 */
export const getBeijingNow = (): Date => {
  const now = new Date();
  return new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000);
};

/**
 * Get start date for time period filter (in Beijing timezone)
 * @param period - 'day' | 'week' | 'month' | 'quarter'
 * @returns ISO date string for the start of the period
 */
export const getDateRangeStart = (period: 'day' | 'week' | 'month' | 'quarter'): string => {
  const beijing = getBeijingNow();

  switch (period) {
    case 'day':
      return beijing.toISOString().split('T')[0];
    case 'week':
      const dayOfWeek = beijing.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday is first day
      const weekStart = new Date(beijing);
      weekStart.setDate(beijing.getDate() - daysToSubtract);
      return weekStart.toISOString().split('T')[0];
    case 'month':
      return `${beijing.getFullYear()}-${String(beijing.getMonth() + 1).padStart(2, '0')}-01`;
    case 'quarter':
      const quarterMonth = Math.floor(beijing.getMonth() / 3) * 3;
      return `${beijing.getFullYear()}-${String(quarterMonth + 1).padStart(2, '0')}-01`;
    default:
      return beijing.toISOString().split('T')[0];
  }
};

/**
 * Get season name in Chinese
 */
export const getSeasonName = (season: string): string => {
  const seasonMap: Record<string, string> = {
    'spring': '春季',
    'summer': '夏季',
    'fall': '秋季',
    'winter': '冬季',
  };
  return seasonMap[season] || season;
};
