import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useProducts, useCategories } from '@/lib/useData';
import { useAuth } from '@/lib/auth';
import { Category } from '@/lib/types';
import { calculateProfit } from '@/lib/utils';

// Color mapping with keywords for fuzzy matching
const colorDefinitions: { keywords: string[]; color: string }[] = [
  { keywords: ['白', '白色', '米白', '乳白'], color: '#fff' },
  { keywords: ['粉', '粉色', '粉红', '桃粉'], color: '#ffc0cb' },
  { keywords: ['深蓝', '藏蓝', '宝蓝', '藏青', '藏青色'], color: '#00008b' },
  { keywords: ['黑', '黑色'], color: '#000' },
  { keywords: ['碎花', '花色', '印花'], color: '#e0e0e0' },
  { keywords: ['红', '红色', '大红', '酒红', '枣红'], color: '#dc2626' },
  { keywords: ['蓝', '蓝色', '天蓝', '浅蓝'], color: '#3b82f6' },
  { keywords: ['绿', '绿色', '军绿', '草绿', '墨绿'], color: '#22c55e' },
  { keywords: ['黄', '黄色', '姜黄', '鹅黄'], color: '#eab308' },
  { keywords: ['灰', '灰色', '深灰', '浅灰'], color: '#6b7280' },
  { keywords: ['米', '米色', '杏色', '驼色'], color: '#f5f5dc' },
  { keywords: ['紫', '紫色', '葡萄紫'], color: '#a855f7' },
  { keywords: ['橙', '橙色', '橘色', '橘红'], color: '#f97316' },
  { keywords: ['卡其', '棕', '棕色', '咖啡', '咖色'], color: '#c3b091' },
  { keywords: ['杏', '杏粉'], color: '#fadadd' },
  { keywords: ['藕', '藕粉', '藕荷'], color: '#e8ccd7' },
];

// Get color by matching keywords
const getColorByName = (colorName: string | null): string => {
  if (!colorName) return '#e0e0e0';
  const lowerName = colorName.toLowerCase();
  for (const def of colorDefinitions) {
    if (def.keywords.some(k => lowerName.includes(k) || k.includes(lowerName))) {
      return def.color;
    }
  }
  return '#e0e0e0'; // default gray
};

export default function InventoryScreen() {
  const router = useRouter();
  const { store } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null); // null = all
  const { categories } = useCategories();
  const { products, loading, refetch } = useProducts(selectedCategoryId);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.style_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const lowStockThreshold = store?.low_stock_threshold || 10;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>库存查询</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.gray[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="搜索款号、商品名称"
            placeholderTextColor={Colors.gray[400]}
          />
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategoryId === null && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategoryId(null)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategoryId === null && styles.categoryButtonTextActive,
              ]}
            >
              全部
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategoryId === category.id && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategoryId(category.id)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategoryId === category.id && styles.categoryButtonTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Product List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.productList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          <View style={styles.listHeader}>
            <Text style={styles.listCount}>共 {filteredProducts.length} 件商品</Text>
            <TouchableOpacity style={styles.filterButton}>
              <Ionicons name="options-outline" size={16} color={Colors.primary} />
              <Text style={styles.filterButtonText}>筛选</Text>
            </TouchableOpacity>
          </View>

          {filteredProducts.map((product) => {
            const isLowStock = product.stock < lowStockThreshold;
            const { profitRateText, profitRate } = calculateProfit(product.cost_price, product.selling_price);
            // Use first image, fallback to video thumbnail
            const hasImage = product.image_urls?.[0] || product.image_url;
            const hasVideo = product.video_urls?.[0];
            const videoThumbnail = product.video_thumbnails?.[0];
            const displayImage = hasImage || videoThumbnail;
            const isVideo = !hasImage && hasVideo;
            return (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => router.push(`/product/${product.id}`)}
              >
                {displayImage ? (
                  <View style={styles.productImageContainer}>
                    <Image
                      source={{ uri: displayImage }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    {isVideo && (
                      <View style={styles.videoIndicator}>
                        <Ionicons name="videocam" size={14} color={Colors.white} />
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={[styles.productImage, styles.productImagePlaceholder]}>
                    <Ionicons name="shirt-outline" size={32} color={Colors.gray[300]} />
                  </View>
                )}
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <View style={styles.productBadges}>
                      <View style={styles.styleNoBadge}>
                        <Text style={styles.styleNoText}>{product.style_no}</Text>
                      </View>
                      {isLowStock && (
                        <View style={styles.lowStockBadge}>
                          <Ionicons name="alert-circle" size={12} color={Colors.red} />
                          <Text style={styles.lowStockText}>库存不足</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <View style={styles.productMeta}>
                    <Text style={styles.productSize}>{product.size}</Text>
                    <Text style={styles.metaSeparator}>|</Text>
                    <View style={styles.colorInfo}>
                      <View style={[styles.colorDot, { backgroundColor: getColorByName(product.color) }]} />
                      <Text style={styles.productColor}>{product.color}</Text>
                    </View>
                  </View>
                  <View style={styles.productBottom}>
                    <View style={styles.priceInfo}>
                      <Text style={styles.price}>¥{product.selling_price}</Text>
                      <View style={[styles.profitBadge, profitRate < 0 && styles.profitBadgeNegative]}>
                        <Text style={[styles.profitText, profitRate < 0 && styles.profitTextNegative]}>
                          {profitRateText}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.stock, isLowStock && styles.stockLow]}>
                      库存: {product.stock}件
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredProducts.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search" size={32} color={Colors.gray[400]} />
              </View>
              <Text style={styles.emptyTitle}>暂无商品</Text>
              <Text style={styles.emptySubtitle}>请尝试其他搜索条件</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.gray[900],
  },
  categoryScroll: {
    marginHorizontal: -20,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
    paddingBottom: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  categoryButtonTextActive: {
    color: Colors.white,
  },
  productList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listCount: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterButtonText: {
    fontSize: 13,
    color: Colors.primary,
  },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    flexDirection: 'row',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: Colors.gray[100],
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 2,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productHeader: {
    marginBottom: 4,
  },
  productBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  styleNoBadge: {
    backgroundColor: 'rgba(236, 64, 122, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  styleNoText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.redLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  lowStockText: {
    fontSize: 11,
    color: Colors.red,
  },
  productName: {
    fontSize: 15,
    color: Colors.gray[900],
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productSize: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  metaSeparator: {
    fontSize: 12,
    color: Colors.gray[300],
    marginHorizontal: 6,
  },
  colorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  productColor: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  productBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  profitBadge: {
    backgroundColor: Colors.greenLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  profitBadgeNegative: {
    backgroundColor: Colors.redLight,
  },
  profitText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.green,
  },
  profitTextNegative: {
    color: Colors.red,
  },
  stock: {
    fontSize: 13,
    color: Colors.gray[900],
  },
  stockLow: {
    color: Colors.red,
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
  emptyTitle: {
    fontSize: 15,
    color: Colors.gray[500],
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.gray[400],
  },
});
