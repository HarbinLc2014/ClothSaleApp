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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useLowStockProducts } from '@/lib/useData';
import { useAuth } from '@/lib/auth';

const getSeverityColor = (stock: number) => {
  if (stock <= 2) return Colors.red;
  if (stock <= 5) return Colors.orange;
  return Colors.yellow;
};

const getSeverityBg = (stock: number) => {
  if (stock <= 2) return { bg: Colors.redLight, border: '#fecaca' };
  if (stock <= 5) return { bg: Colors.orangeLight, border: '#fed7aa' };
  return { bg: Colors.yellowLight, border: '#fef08a' };
};

export default function LowStockScreen() {
  const router = useRouter();
  const { store } = useAuth();
  const { products, loading, refetch } = useLowStockProducts();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const threshold = store?.low_stock_threshold || 10;

  const criticalCount = products.filter((p) => p.stock <= 2).length;
  const lowCount = products.filter((p) => p.stock > 2 && p.stock <= 5).length;
  const watchCount = products.filter((p) => p.stock > 5).length;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.red} />
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
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.headerTitleSection}>
              <Text style={styles.title}>低库存提醒</Text>
              <Text style={styles.subtitle}>{products.length} 件商品需要补货</Text>
            </View>
            <View style={styles.alertIcon}>
              <Ionicons name="alert-circle" size={24} color={Colors.white} />
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>严重缺货</Text>
              <Text style={styles.statValue}>{criticalCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>库存偏低</Text>
              <Text style={styles.statValue}>{lowCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>需要关注</Text>
              <Text style={styles.statValue}>{watchCount}</Text>
            </View>
          </View>
        </View>

        {/* Product List */}
        <View style={styles.content}>
          <Text style={styles.listTitle}>按缺货程度排序</Text>

          {products.map((product) => {
            const severity = getSeverityBg(product.stock);
            const severityColor = getSeverityColor(product.stock);
            const suggestedQuantity = Math.max(threshold - product.stock + 10, 10);

            return (
              <View
                key={product.id}
                style={[styles.productCard, { backgroundColor: severity.bg, borderColor: severity.border }]}
              >
                <View style={styles.productTop}>
                  {product.image_url ? (
                    <Image
                      source={{ uri: product.image_url }}
                      style={styles.productImage}
                      defaultSource={require('@/assets/images/icon.png')}
                    />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder]}>
                      <Ionicons name="shirt-outline" size={32} color={Colors.gray[300]} />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <View style={styles.productBadges}>
                      <View style={styles.styleNoBadge}>
                        <Text style={styles.styleNoText}>{product.style_no}</Text>
                      </View>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{product.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productMeta}>{product.size} | {product.color}</Text>
                  </View>
                </View>

                <View style={styles.stockCard}>
                  <View style={styles.stockRow}>
                    <Text style={styles.stockLabel}>当前库存</Text>
                    <Text style={[styles.stockValue, { color: severityColor }]}>仅剩 {product.stock} 件</Text>
                  </View>
                  <View style={styles.stockRow}>
                    <Text style={styles.stockLabel}>安全库存</Text>
                    <Text style={styles.stockValueNormal}>{threshold} 件</Text>
                  </View>
                  <View style={styles.stockRow}>
                    <Text style={styles.stockLabel}>建议补货</Text>
                    <Text style={styles.stockValuePrimary}>{suggestedQuantity} 件</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.restockButton}
                  onPress={() => router.push('/(tabs)/stock-in')}
                >
                  <Ionicons name="add" size={16} color={Colors.white} />
                  <Text style={styles.restockButtonText}>立即补货</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {products.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.green} />
              </View>
              <Text style={styles.emptyTitle}>库存充足</Text>
              <Text style={styles.emptySubtitle}>暂无需要补货的商品</Text>
            </View>
          )}
        </View>
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
    backgroundColor: Colors.red,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleSection: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.white,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  listTitle: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 12,
  },
  productCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  productTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  styleNoBadge: {
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  styleNoText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  categoryBadge: {
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray[900],
    marginBottom: 4,
  },
  productMeta: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  stockCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  stockLabel: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  stockValueNormal: {
    fontSize: 14,
    color: Colors.gray[900],
  },
  stockValuePrimary: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  restockButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  restockButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray[900],
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.gray[500],
  },
});
