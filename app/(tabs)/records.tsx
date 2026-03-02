import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
import { useStockRecords, useCategories } from '@/lib/useData';
import { getDateRangeStart, getSeasonName, getBeijingNow } from '@/lib/utils';

type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'all' | 'custom';
type RecordType = 'all' | 'in' | 'out';

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  day: '今日',
  week: '本周',
  month: '本月',
  quarter: '本季度',
  all: '全部',
  custom: '自定义',
};

const YEARS = Array.from({ length: 7 }, (_, i) => 2024 + i); // 2024-2030
const SEASONS = ['spring', 'summer', 'fall', 'winter'];

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  // Convert to Beijing time for display
  const beijingTime = new Date(date.getTime() + (8 * 60 + date.getTimezoneOffset()) * 60000);
  return beijingTime.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RecordsScreen() {
  const [activeTab, setActiveTab] = useState<RecordType>('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Custom date range states
  const [customStartDate, setCustomStartDate] = useState<Date>(() => {
    const date = getBeijingNow();
    date.setDate(date.getDate() - 7); // Default to 7 days ago
    return date;
  });
  const [customEndDate, setCustomEndDate] = useState<Date>(() => getBeijingNow());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const { categories } = useCategories();
  const { records, loading, refetch } = useStockRecords(activeTab);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Format date for display
  const formatDateDisplay = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Handle date picker changes
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setCustomStartDate(selectedDate);
      if (selectedDate > customEndDate) {
        setCustomEndDate(selectedDate);
      }
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      setCustomEndDate(selectedDate);
      if (selectedDate < customStartDate) {
        setCustomStartDate(selectedDate);
      }
    }
  };

  // Filter records based on all criteria
  const filteredRecords = useMemo(() => {
    let result = records;

    // Filter by time period
    if (timePeriod === 'custom') {
      const startDateStr = formatDateDisplay(customStartDate);
      const endDate = new Date(customEndDate);
      endDate.setDate(endDate.getDate() + 1); // Include the end date
      const endDateStr = formatDateDisplay(endDate);
      result = result.filter(r => r.created_at >= startDateStr && r.created_at < endDateStr);
    } else if (timePeriod !== 'all') {
      const startDate = getDateRangeStart(timePeriod);
      result = result.filter(r => r.created_at >= startDate);
    }

    // Filter by category
    if (selectedCategoryId) {
      result = result.filter(r => r.product?.category_id === selectedCategoryId);
    }

    // Filter by year
    if (selectedYear) {
      result = result.filter(r => r.product?.year === selectedYear);
    }

    // Filter by season
    if (selectedSeason) {
      result = result.filter(r => r.product?.season === selectedSeason);
    }

    return result;
  }, [records, timePeriod, selectedCategoryId, selectedYear, selectedSeason, customStartDate, customEndDate]);

  const totalStockIn = filteredRecords.filter((r) => r.type === '入库').reduce((sum, r) => sum + r.quantity, 0);
  const totalStockOut = filteredRecords.filter((r) => r.type !== '入库').reduce((sum, r) => sum + r.quantity, 0);
  const totalSales = filteredRecords.filter((r) => r.type !== '入库').reduce((sum, r) => sum + r.total_amount, 0);

  const activeFiltersCount = [
    timePeriod !== 'all',
    selectedCategoryId !== null,
    selectedYear !== null,
    selectedSeason !== null,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setTimePeriod('all');
    setSelectedCategoryId(null);
    setSelectedYear(null);
    setSelectedSeason(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>出入库流水</Text>
          <TouchableOpacity
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options-outline" size={18} color={showFilters ? Colors.white : Colors.primary} />
            <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
              筛选{activeFiltersCount > 0 && ` (${activeFiltersCount})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time Period Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timePeriodScroll}>
          <View style={styles.timePeriodRow}>
            {(Object.keys(TIME_PERIOD_LABELS) as TimePeriod[]).map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.timePeriodButton, timePeriod === period && styles.timePeriodButtonActive]}
                onPress={() => setTimePeriod(period)}
              >
                <Text style={[styles.timePeriodText, timePeriod === period && styles.timePeriodTextActive]}>
                  {TIME_PERIOD_LABELS[period]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Custom Date Range Picker */}
        {timePeriod === 'custom' && (
          <View style={styles.customDateContainer}>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.dateButtonText}>{formatDateDisplay(customStartDate)}</Text>
            </TouchableOpacity>
            <Text style={styles.dateSeparator}>至</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.dateButtonText}>{formatDateDisplay(customEndDate)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Expandable Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>商品类别</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[styles.filterChip, !selectedCategoryId && styles.filterChipActive]}
                    onPress={() => setSelectedCategoryId(null)}
                  >
                    <Text style={[styles.filterChipText, !selectedCategoryId && styles.filterChipTextActive]}>
                      全部
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.filterChip, selectedCategoryId === cat.id && styles.filterChipActive]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                    >
                      <Text style={[styles.filterChipText, selectedCategoryId === cat.id && styles.filterChipTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Year Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>进货年份</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[styles.filterChip, !selectedYear && styles.filterChipActive]}
                    onPress={() => setSelectedYear(null)}
                  >
                    <Text style={[styles.filterChipText, !selectedYear && styles.filterChipTextActive]}>
                      全部
                    </Text>
                  </TouchableOpacity>
                  {YEARS.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.filterChip, selectedYear === year && styles.filterChipActive]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={[styles.filterChipText, selectedYear === year && styles.filterChipTextActive]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Season Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>进货季度</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterChip, !selectedSeason && styles.filterChipActive]}
                  onPress={() => setSelectedSeason(null)}
                >
                  <Text style={[styles.filterChipText, !selectedSeason && styles.filterChipTextActive]}>
                    全部
                  </Text>
                </TouchableOpacity>
                {SEASONS.map((season) => (
                  <TouchableOpacity
                    key={season}
                    style={[styles.filterChip, selectedSeason === season && styles.filterChipActive]}
                    onPress={() => setSelectedSeason(season)}
                  >
                    <Text style={[styles.filterChipText, selectedSeason === season && styles.filterChipTextActive]}>
                      {getSeasonName(season)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {activeFiltersCount > 0 && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Ionicons name="close-circle" size={16} color={Colors.gray[500]} />
                <Text style={styles.clearFiltersText}>清除筛选</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.greenLight }]}>
            <Text style={styles.statLabel}>入库</Text>
            <Text style={styles.statValueGreen}>{totalStockIn}</Text>
            <Text style={styles.statUnit}>件</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.orangeLight }]}>
            <Text style={[styles.statLabel, { color: Colors.orange }]}>出库</Text>
            <Text style={styles.statValueOrange}>{totalStockOut}</Text>
            <Text style={[styles.statUnit, { color: Colors.orange }]}>件</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.primaryLight }]}>
            <Text style={styles.statLabelPink}>销售额</Text>
            <Text style={styles.statValuePink}>¥{totalSales.toLocaleString()}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActivePrimary]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>全部</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'in' && styles.tabActiveGreen]}
            onPress={() => setActiveTab('in')}
          >
            <Text style={[styles.tabText, activeTab === 'in' && styles.tabTextActive]}>入库</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'out' && styles.tabActiveOrange]}
            onPress={() => setActiveTab('out')}
          >
            <Text style={[styles.tabText, activeTab === 'out' && styles.tabTextActive]}>出库</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Records List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.recordsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          <Text style={styles.listCount}>
            共 {filteredRecords.length} 条记录
            {activeFiltersCount > 0 && ` (已筛选)`}
          </Text>

          {filteredRecords.map((record) => {
            const isStockIn = record.type === '入库';
            const displayImage = record.product?.image_urls?.[0] || record.product?.image_url || record.product?.video_thumbnails?.[0];
            return (
              <View key={record.id} style={styles.recordCard}>
                <View style={[styles.recordIcon, isStockIn ? styles.stockInIcon : styles.stockOutIcon]}>
                  <Ionicons
                    name={isStockIn ? 'trending-up' : 'trending-down'}
                    size={24}
                    color={isStockIn ? Colors.green : Colors.orange}
                  />
                </View>

                {displayImage ? (
                  <Image
                    source={{ uri: displayImage }}
                    style={styles.recordImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.recordImage, styles.recordImagePlaceholder]}>
                    <Ionicons name="shirt-outline" size={24} color={Colors.gray[300]} />
                  </View>
                )}

                <View style={styles.recordInfo}>
                  <View style={styles.recordHeader}>
                    <View style={styles.recordBadges}>
                      <View style={[styles.typeBadge, isStockIn ? styles.typeBadgeIn : styles.typeBadgeOut]}>
                        <Text style={[styles.typeBadgeText, isStockIn ? styles.typeBadgeTextIn : styles.typeBadgeTextOut]}>
                          {record.type}
                        </Text>
                      </View>
                      <View style={styles.styleNoBadge}>
                        <Text style={styles.styleNoText}>{record.product?.style_no || '-'}</Text>
                      </View>
                    </View>
                    <View style={styles.recordRight}>
                      <Text style={[styles.recordQuantity, isStockIn ? styles.quantityIn : styles.quantityOut]}>
                        {isStockIn ? '+' : '-'}{record.quantity}件
                      </Text>
                      <Text style={styles.recordPrice}>¥{record.unit_price}</Text>
                    </View>
                  </View>
                  <Text style={styles.recordName} numberOfLines={1}>
                    {record.product?.name || '未知商品'}
                  </Text>
                  <Text style={styles.recordMeta}>
                    {record.product?.size || '-'} | {record.product?.color || '-'}
                    {record.product?.year && ` | ${record.product.year}年`}
                    {record.product?.season && ` ${getSeasonName(record.product.season)}`}
                  </Text>
                  <View style={styles.recordFooter}>
                    <View style={styles.recordTime}>
                      <Ionicons name="time-outline" size={12} color={Colors.gray[400]} />
                      <Text style={styles.recordTimeText}>{formatDateTime(record.created_at)}</Text>
                    </View>
                    <Text style={styles.recordOperator}>操作人: {record.operator_name}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {filteredRecords.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="trending-up" size={32} color={Colors.gray[400]} />
              </View>
              <Text style={styles.emptyText}>暂无记录</Text>
              {activeFiltersCount > 0 && (
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={styles.emptyLink}>清除筛选条件</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* Date Picker Modals */}
      {Platform.OS === 'ios' ? (
        <>
          <Modal
            visible={showStartPicker}
            transparent
            animationType="slide"
          >
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>选择开始日期</Text>
                  <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                    <Text style={styles.datePickerDone}>完成</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={customStartDate}
                  mode="date"
                  display="spinner"
                  onChange={onStartDateChange}
                  maximumDate={new Date()}
                  locale="zh-CN"
                />
              </View>
            </View>
          </Modal>
          <Modal
            visible={showEndPicker}
            transparent
            animationType="slide"
          >
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>选择结束日期</Text>
                  <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                    <Text style={styles.datePickerDone}>完成</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={customEndDate}
                  mode="date"
                  display="spinner"
                  onChange={onEndDateChange}
                  maximumDate={new Date()}
                  locale="zh-CN"
                />
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          {showStartPicker && (
            <DateTimePicker
              value={customStartDate}
              mode="date"
              display="default"
              onChange={onStartDateChange}
              maximumDate={new Date()}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={customEndDate}
              mode="date"
              display="default"
              onChange={onEndDateChange}
              maximumDate={new Date()}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
  },
  filterToggleActive: {
    backgroundColor: Colors.primary,
  },
  filterToggleText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  filterToggleTextActive: {
    color: Colors.white,
  },
  timePeriodScroll: {
    marginBottom: 12,
    marginHorizontal: -20,
  },
  timePeriodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  timePeriodButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
  },
  timePeriodButtonActive: {
    backgroundColor: Colors.primary,
  },
  timePeriodText: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  timePeriodTextActive: {
    color: Colors.white,
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  filterChipTextActive: {
    color: Colors.white,
    fontWeight: '500',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  clearFiltersText: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.green,
    marginBottom: 4,
  },
  statLabelPink: {
    fontSize: 11,
    color: Colors.primary,
    marginBottom: 4,
  },
  statValueGreen: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.greenDark,
  },
  statValueOrange: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.orangeDark,
  },
  statValuePink: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  statUnit: {
    fontSize: 11,
    color: Colors.green,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
  },
  tabActivePrimary: {
    backgroundColor: Colors.primary,
  },
  tabActiveGreen: {
    backgroundColor: Colors.green,
  },
  tabActiveOrange: {
    backgroundColor: Colors.orange,
  },
  tabText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  tabTextActive: {
    color: Colors.white,
    fontWeight: '500',
  },
  recordsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  listCount: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 12,
  },
  recordCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockInIcon: {
    backgroundColor: Colors.greenLight,
  },
  stockOutIcon: {
    backgroundColor: Colors.orangeLight,
  },
  recordImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
  },
  recordImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordInfo: {
    flex: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  recordBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeIn: {
    backgroundColor: Colors.greenLight,
  },
  typeBadgeOut: {
    backgroundColor: Colors.orangeLight,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  typeBadgeTextIn: {
    color: Colors.greenDark,
  },
  typeBadgeTextOut: {
    color: Colors.orangeDark,
  },
  styleNoBadge: {
    backgroundColor: 'rgba(236, 64, 122, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  styleNoText: {
    fontSize: 11,
    color: Colors.primary,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  recordQuantity: {
    fontSize: 14,
    fontWeight: '500',
  },
  quantityIn: {
    color: Colors.green,
  },
  quantityOut: {
    color: Colors.orange,
  },
  recordPrice: {
    fontSize: 13,
    color: Colors.gray[900],
    marginTop: 2,
  },
  recordName: {
    fontSize: 13,
    color: Colors.gray[900],
    marginBottom: 2,
  },
  recordMeta: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 6,
  },
  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordTimeText: {
    fontSize: 11,
    color: Colors.gray[400],
  },
  recordOperator: {
    fontSize: 11,
    color: Colors.gray[400],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.gray[500],
  },
  emptyLink: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 8,
  },
  customDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  dateButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  dateSeparator: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  datePickerDone: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
});
