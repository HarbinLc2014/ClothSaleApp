import { useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useStockRecords } from '@/lib/useData';

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RecordsScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out'>('all');
  const { records, loading, refetch } = useStockRecords(activeTab);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const totalStockIn = records.filter((r) => r.type === '入库').reduce((sum, r) => sum + r.quantity, 0);
  const totalStockOut = records.filter((r) => r.type !== '入库').reduce((sum, r) => sum + r.quantity, 0);
  const totalSales = records.filter((r) => r.type !== '入库').reduce((sum, r) => sum + r.total_amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>出入库流水</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.greenLight }]}>
            <Text style={styles.statLabel}>总入库</Text>
            <Text style={styles.statValueGreen}>{totalStockIn}</Text>
            <Text style={styles.statUnit}>件</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.orangeLight }]}>
            <Text style={[styles.statLabel, { color: Colors.orange }]}>总出库</Text>
            <Text style={styles.statValueOrange}>{totalStockOut}</Text>
            <Text style={[styles.statUnit, { color: Colors.orange }]}>件</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.primaryLight }]}>
            <Text style={styles.statLabelPink}>总销售额</Text>
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
          <Text style={styles.listCount}>共 {records.length} 条记录</Text>

          {records.map((record) => {
            const isStockIn = record.type === '入库';
            return (
              <View key={record.id} style={styles.recordCard}>
                <View style={[styles.recordIcon, isStockIn ? styles.stockInIcon : styles.stockOutIcon]}>
                  <Ionicons
                    name={isStockIn ? 'trending-up' : 'trending-down'}
                    size={24}
                    color={isStockIn ? Colors.green : Colors.orange}
                  />
                </View>

                {(record.product?.image_urls?.[0] || record.product?.image_url) ? (
                  <Image
                    source={{ uri: record.product?.image_urls?.[0] || record.product?.image_url }}
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

          {records.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="trending-up" size={32} color={Colors.gray[400]} />
              </View>
              <Text style={styles.emptyText}>暂无记录</Text>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
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
    marginBottom: 12,
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
});
