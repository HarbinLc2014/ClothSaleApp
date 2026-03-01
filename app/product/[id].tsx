import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useProducts, useStockRecords } from '@/lib/useData';
import { calculateProfit } from '@/lib/utils';

const { width } = Dimensions.get('window');

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string; // For videos
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const mediaScrollRef = useRef<ScrollView>(null);
  const { products, loading } = useProducts();
  const { records, loading: recordsLoading } = useStockRecords();

  const product = products.find(p => p.id === id);
  const productRecords = records.filter(r => r.product_id === id).slice(0, 20);

  // Build media items array (images + videos)
  const mediaItems = useMemo<MediaItem[]>(() => {
    if (!product) return [];
    const items: MediaItem[] = [];

    // Add images
    if (product.image_urls?.length) {
      product.image_urls.forEach(url => {
        items.push({ type: 'image', url });
      });
    } else if (product.image_url) {
      items.push({ type: 'image', url: product.image_url });
    }

    // Add videos with thumbnails
    if (product.video_urls?.length) {
      product.video_urls.forEach((url, index) => {
        items.push({
          type: 'video',
          url,
          thumbnail: product.video_thumbnails?.[index] || '',
        });
      });
    }

    return items;
  }, [product]);

  // Handle banner scroll
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentMediaIndex(index);
  };

  // Handle media item tap
  const handleMediaTap = (item: MediaItem) => {
    if (item.type === 'video') {
      router.push(`/video-player?url=${encodeURIComponent(item.url)}`);
    }
  };

  // Calculate profit margin
  const profitInfo = product
    ? calculateProfit(product.cost_price, product.selling_price)
    : { profit: 0, profitRate: 0, profitRateText: '0%' };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>商品详情</Text>
          <View style={styles.editButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.notFoundText}>商品不存在</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>商品详情</Text>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Media Banner */}
        {mediaItems.length > 0 ? (
          <View style={styles.mediaBannerContainer}>
            <ScrollView
              ref={mediaScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {mediaItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={item.type === 'video' ? 0.8 : 1}
                  onPress={() => handleMediaTap(item)}
                  style={styles.mediaSlide}
                >
                  <Image
                    source={{ uri: item.type === 'image' ? item.url : item.thumbnail || '' }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  {item.type === 'video' && (
                    <View style={styles.videoOverlay}>
                      <View style={styles.playButton}>
                        <Ionicons name="play" size={40} color={Colors.white} />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Page Indicators */}
            {mediaItems.length > 1 && (
              <View style={styles.pageIndicators}>
                {mediaItems.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.pageIndicator,
                      index === currentMediaIndex && styles.pageIndicatorActive,
                    ]}
                  />
                ))}
              </View>
            )}
            {/* Media Counter */}
            <View style={styles.mediaCounter}>
              <Text style={styles.mediaCounterText}>
                {currentMediaIndex + 1}/{mediaItems.length}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Ionicons name="shirt-outline" size={64} color={Colors.gray[300]} />
          </View>
        )}

        <View style={styles.content}>
          {/* Style No & Name */}
          <View style={styles.titleSection}>
            <View style={styles.badges}>
              <View style={styles.styleNoBadge}>
                <Text style={styles.styleNoText}>{product.style_no}</Text>
              </View>
              {product.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{product.category.name}</Text>
                </View>
              )}
            </View>
            <Text style={styles.productName}>{product.name}</Text>
            {product.description && (
              <Text style={styles.productDesc}>{product.description}</Text>
            )}
          </View>

          {/* Price & Stock & Profit */}
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>售价</Text>
                <Text style={styles.priceValue}>¥{product.selling_price}</Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>成本</Text>
                <Text style={styles.costValue}>¥{product.cost_price}</Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>利润率</Text>
                <Text style={[styles.profitValue, profitInfo.profitRate < 0 && styles.profitValueNegative]}>
                  {profitInfo.profitRateText}
                </Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>当前库存</Text>
                <Text style={styles.stockValue}>{product.stock} 件</Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>单件利润</Text>
                <Text style={[styles.profitAmount, profitInfo.profit < 0 && styles.profitAmountNegative]}>
                  ¥{profitInfo.profit.toFixed(0)}
                </Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>预计利润</Text>
                <Text style={[styles.profitAmount, profitInfo.profit < 0 && styles.profitAmountNegative]}>
                  ¥{(profitInfo.profit * product.stock).toFixed(0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Product Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>尺码</Text>
              <Text style={styles.detailValue}>{product.size || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>颜色</Text>
              <Text style={styles.detailValue}>{product.color || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>年份</Text>
              <Text style={styles.detailValue}>{product.year || '-'}</Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={styles.detailLabel}>季节</Text>
              <Text style={styles.detailValue}>{product.season}</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'info' && styles.tabActive]}
              onPress={() => setActiveTab('info')}
            >
              <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
                商品信息
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => setActiveTab('history')}
            >
              <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                出入库记录
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <View style={styles.tabContent}>
              <Text style={styles.tabContentText}>商品基本信息已在上方展示</Text>
            </View>
          )}

          {activeTab === 'history' && (
            <View style={styles.historyList}>
              {recordsLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : productRecords.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Ionicons name="document-text-outline" size={32} color={Colors.gray[300]} />
                  <Text style={styles.emptyHistoryText}>暂无出入库记录</Text>
                </View>
              ) : (
                productRecords.map((record) => {
                  const isStockIn = record.type === '入库';
                  return (
                    <View key={record.id} style={styles.historyCard}>
                      <View style={[styles.historyIcon, isStockIn ? styles.stockInIcon : styles.stockOutIcon]}>
                        <Ionicons
                          name={isStockIn ? 'trending-up' : 'trending-down'}
                          size={20}
                          color={isStockIn ? Colors.green : Colors.orange}
                        />
                      </View>
                      <View style={styles.historyContent}>
                        <View style={styles.historyHeader}>
                          <View style={[styles.historyBadge, isStockIn ? styles.historyBadgeIn : styles.historyBadgeOut]}>
                            <Text style={[styles.historyBadgeText, isStockIn ? styles.historyBadgeTextIn : styles.historyBadgeTextOut]}>
                              {record.type}
                            </Text>
                          </View>
                          <Text style={[styles.historyQuantity, isStockIn ? styles.quantityIn : styles.quantityOut]}>
                            {isStockIn ? '+' : '-'}{record.quantity}件
                          </Text>
                        </View>
                        {record.unit_price && (
                          <Text style={styles.historyPrice}>单价: ¥{record.unit_price}</Text>
                        )}
                        <View style={styles.historyMeta}>
                          <View style={styles.historyTime}>
                            <Ionicons name="time-outline" size={12} color={Colors.gray[400]} />
                            <Text style={styles.historyTimeText}>
                              {new Date(record.created_at).toLocaleString('zh-CN')}
                            </Text>
                          </View>
                          {record.operator_name && (
                            <Text style={styles.historyOperator}>操作人: {record.operator_name}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.stockInButton}
          onPress={() => router.push('/stock-in')}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.buttonText}>新增入库</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stockOutButton}
          onPress={() => router.push(`/stock-out?id=${id}`)}
        >
          <Ionicons name="remove" size={20} color={Colors.white} />
          <Text style={styles.buttonText}>登记出库</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: Colors.gray[500],
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
  },
  mediaBannerContainer: {
    position: 'relative',
  },
  mediaSlide: {
    width: width,
    position: 'relative',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  pageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  pageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  pageIndicatorActive: {
    backgroundColor: Colors.white,
    width: 18,
  },
  mediaCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mediaCounterText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  editButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  productImage: {
    width: width,
    height: width,
    backgroundColor: Colors.gray[100],
  },
  content: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 20,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  styleNoBadge: {
    backgroundColor: 'rgba(236, 64, 122, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  styleNoText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  categoryBadge: {
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  productName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 8,
  },
  productDesc: {
    fontSize: 14,
    color: Colors.gray[500],
    lineHeight: 20,
  },
  priceCard: {
    backgroundColor: 'rgba(236, 64, 122, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 13,
    color: Colors.gray[600],
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primary,
  },
  costValue: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  stockValue: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  profitValue: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.green,
  },
  profitValueNegative: {
    color: Colors.red,
  },
  profitAmount: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.green,
  },
  profitAmountNegative: {
    color: Colors.red,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  detailValue: {
    fontSize: 14,
    color: Colors.gray[900],
  },
  colorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  tabContent: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  tabContentText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  historyList: {
    gap: 10,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: Colors.gray[400],
    marginTop: 8,
  },
  historyCard: {
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockInIcon: {
    backgroundColor: Colors.greenLight,
  },
  stockOutIcon: {
    backgroundColor: Colors.orangeLight,
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyBadgeIn: {
    backgroundColor: Colors.greenLight,
  },
  historyBadgeOut: {
    backgroundColor: Colors.orangeLight,
  },
  historyBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  historyBadgeTextIn: {
    color: Colors.greenDark,
  },
  historyBadgeTextOut: {
    color: Colors.orangeDark,
  },
  historyQuantity: {
    fontSize: 14,
    fontWeight: '500',
  },
  quantityIn: {
    color: Colors.green,
  },
  quantityOut: {
    color: Colors.orange,
  },
  historyPrice: {
    fontSize: 13,
    color: Colors.gray[600],
    marginBottom: 6,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyTimeText: {
    fontSize: 11,
    color: Colors.gray[400],
  },
  historyOperator: {
    fontSize: 11,
    color: Colors.gray[400],
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  stockInButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  stockOutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.orange,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
