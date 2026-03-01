import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { useDashboardStats, useLowStockProducts } from '@/lib/useData';
import { useCallback, useState } from 'react';

const quickActions = [
  { label: '新增入库', icon: 'add', path: '/(tabs)/stock-in', color: Colors.primary },
  { label: '出库登记', icon: 'remove', path: '/stock-out', color: Colors.orange },
  { label: '查库存', icon: 'search', path: '/(tabs)/inventory', color: Colors.blue },
  { label: '低库存', icon: 'alert-circle', path: '/low-stock', color: Colors.red },
];

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toLocaleString();
}

function formatCurrency(num: number): string {
  if (num >= 10000) {
    return '¥' + (num / 10000).toFixed(1) + '万';
  }
  return '¥' + num.toLocaleString();
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile, store } = useAuth();
  const { stats, recentRecords, loading, refetch } = useDashboardStats();
  const { products: lowStockProducts } = useLowStockProducts();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statsData = [
    { label: '总库存', value: formatNumber(stats.totalStock), unit: '件', icon: 'cube', color: Colors.blue },
    { label: '今日入库', value: formatNumber(stats.stockInToday), unit: '件', icon: 'trending-up', color: Colors.green },
    { label: '今日出库', value: formatNumber(stats.stockOutToday), unit: '件', icon: 'trending-down', color: Colors.orange },
    { label: '库存总值', value: formatCurrency(stats.totalValue), unit: '', icon: 'cash', color: Colors.primary },
  ];

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>你好，{profile?.name || '用户'}</Text>
              <Text style={styles.date}>今天是 {today}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.role === 'owner' ? '👩' : '👤'}</Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {statsData.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                    <Ionicons name={stat.icon as any} size={16} color={Colors.white} />
                  </View>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
                <View style={styles.statValue}>
                  <Text style={styles.statValueText}>{stat.value}</Text>
                  {stat.unit && <Text style={styles.statUnit}>{stat.unit}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsCard}>
            <Text style={styles.sectionTitle}>快捷操作</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickAction}
                  onPress={() => router.push(action.path as any)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                    <Ionicons name={action.icon as any} size={24} color={Colors.white} />
                  </View>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <View style={styles.alertTitleRow}>
                  <Ionicons name="alert-circle" size={20} color={Colors.red} />
                  <Text style={styles.alertTitle}>低库存提醒</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/low-stock')}>
                  <Text style={styles.alertLink}>查看全部</Text>
                </TouchableOpacity>
              </View>
              {lowStockProducts.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.alertItem}>
                  <View>
                    <Text style={styles.alertItemName}>{item.name}</Text>
                    <Text style={styles.alertItemStyleNo}>({item.style_no})</Text>
                  </View>
                  <Text style={styles.alertItemStock}>仅剩 {item.stock} 件</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Activities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>最近操作</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/records')}>
              <Text style={styles.sectionLink}>查看全部</Text>
            </TouchableOpacity>
          </View>

          {recentRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>暂无操作记录</Text>
            </View>
          ) : (
            recentRecords.map((record) => {
              const isStockIn = record.type === '入库';
              return (
                <View key={record.id} style={styles.activityCard}>
                  <View style={[styles.activityIcon, isStockIn ? styles.stockInIcon : styles.stockOutIcon]}>
                    <Ionicons
                      name={isStockIn ? 'trending-up' : 'trending-down'}
                      size={20}
                      color={isStockIn ? Colors.green : Colors.orange}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityTop}>
                      <View style={styles.activityInfo}>
                        <View style={[styles.activityBadge, isStockIn ? styles.stockInBadge : styles.stockOutBadge]}>
                          <Text style={[styles.activityBadgeText, isStockIn ? styles.stockInBadgeText : styles.stockOutBadgeText]}>
                            {record.type}
                          </Text>
                        </View>
                        <Text style={styles.activityProduct} numberOfLines={1}>
                          {record.product?.name || '未知商品'}
                        </Text>
                      </View>
                      <Text style={[styles.activityQuantity, isStockIn ? styles.stockInText : styles.stockOutText]}>
                        {isStockIn ? '+' : '-'}{record.quantity}件
                      </Text>
                    </View>
                    <Text style={styles.activityStyleNo}>款号: {record.product?.style_no || '-'}</Text>
                    <View style={styles.activityMeta}>
                      <View style={styles.activityMetaItem}>
                        <Ionicons name="time-outline" size={12} color={Colors.gray[400]} />
                        <Text style={styles.activityMetaText}>{formatTimeAgo(record.created_at)}</Text>
                      </View>
                      <Text style={styles.activityMetaText}>操作人: {record.operator_name}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  avatar: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 14,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  statValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValueText: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.white,
  },
  statUnit: {
    fontSize: 13,
    color: Colors.white,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginTop: -12,
  },
  quickActionsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 13,
    color: Colors.primary,
  },
  alertCard: {
    backgroundColor: Colors.redLight,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7f1d1d',
  },
  alertLink: {
    fontSize: 13,
    color: Colors.red,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  alertItemName: {
    fontSize: 14,
    color: Colors.gray[900],
  },
  alertItemStyleNo: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  alertItemStock: {
    fontSize: 13,
    color: Colors.red,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[400],
  },
  activityCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockInIcon: {
    backgroundColor: Colors.greenLight,
  },
  stockOutIcon: {
    backgroundColor: Colors.orangeLight,
  },
  activityContent: {
    flex: 1,
  },
  activityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  activityInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockInBadge: {
    backgroundColor: Colors.greenLight,
  },
  stockOutBadge: {
    backgroundColor: Colors.orangeLight,
  },
  activityBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stockInBadgeText: {
    color: Colors.greenDark,
  },
  stockOutBadgeText: {
    color: Colors.orangeDark,
  },
  activityProduct: {
    fontSize: 14,
    color: Colors.gray[900],
    flex: 1,
  },
  activityQuantity: {
    fontSize: 14,
    fontWeight: '500',
  },
  stockInText: {
    color: Colors.green,
  },
  stockOutText: {
    color: Colors.orange,
  },
  activityStyleNo: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 6,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityMetaText: {
    fontSize: 11,
    color: Colors.gray[400],
  },
});
