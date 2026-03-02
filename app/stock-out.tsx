import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useProducts, useProductMutations, useCategories } from '@/lib/useData';
import { useAuth } from '@/lib/auth';
import { Product, StockOutType } from '@/lib/types';

const PAGE_SIZE = 20;

const outTypes: StockOutType[] = ['零售售出', '批发拿货', '调货', '退货'];

export default function StockOutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { store } = useAuth();
  const { products, loading: productsLoading, refetch } = useProducts();
  const { categories } = useCategories();
  const { stockOut, loading: mutationLoading } = useProductMutations();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    quantity: '',
    price: '',
    type: '零售售出' as StockOutType,
    note: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const lowStockThreshold = store?.low_stock_threshold || 10;

  // Get unique sizes and colors from products
  const uniqueSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach(p => {
      if (p.size) sizes.add(p.size);
    });
    return Array.from(sizes).sort();
  }, [products]);

  const uniqueColors = useMemo(() => {
    const colors = new Set<string>();
    products.forEach(p => {
      if (p.color) colors.add(p.color);
    });
    return Array.from(colors).sort();
  }, [products]);

  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    products.forEach(p => {
      if (p.year) years.add(p.year);
    });
    return Array.from(years).sort((a, b) => b - a); // Descending order
  }, [products]);

  const SEASONS = [
    { key: '春', label: '春季' },
    { key: '夏', label: '夏季' },
    { key: '秋', label: '秋季' },
    { key: '冬', label: '冬季' },
  ];

  // Filter and search products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = !searchQuery ||
        product.style_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.color?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategoryId || product.category_id === selectedCategoryId;
      const matchesSize = !selectedSize || product.size === selectedSize;
      const matchesColor = !selectedColor || product.color === selectedColor;
      const matchesYear = !selectedYear || product.year === selectedYear;
      const matchesSeason = !selectedSeason || product.season === selectedSeason;
      return matchesSearch && matchesCategory && matchesSize && matchesColor && matchesYear && matchesSeason;
    });
  }, [products, searchQuery, selectedCategoryId, selectedSize, selectedColor, selectedYear, selectedSeason]);

  // Paginated products for display
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, displayCount);
  }, [filteredProducts, displayCount]);

  const loadMore = useCallback(() => {
    if (displayCount < filteredProducts.length) {
      setDisplayCount(prev => Math.min(prev + PAGE_SIZE, filteredProducts.length));
    }
  }, [displayCount, filteredProducts.length]);

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchQuery, selectedCategoryId, selectedSize, selectedColor, selectedYear, selectedSeason]);

  useEffect(() => {
    if (id && products.length > 0) {
      const product = products.find((p) => p.id === id);
      if (product) {
        setSelectedProduct(product);
        setFormData({ ...formData, price: product.selling_price.toString() });
      }
    }
  }, [id, products]);

  const handleSubmit = async () => {
    console.log('[stock-out] handleSubmit called');
    setError('');

    if (!selectedProduct) {
      console.log('[stock-out] No product selected');
      setError('请选择商品');
      return;
    }

    const quantity = parseInt(formData.quantity);
    console.log('[stock-out] Quantity:', quantity, 'formData:', formData);

    if (!quantity || quantity <= 0) {
      setError('请输入有效的出库数量');
      return;
    }

    if (quantity > selectedProduct.stock) {
      setError(`库存不足！当前库存仅有 ${selectedProduct.stock} 件`);
      return;
    }

    console.log('[stock-out] Calling stockOut with:', {
      product_id: selectedProduct.id,
      quantity,
      unit_price: parseFloat(formData.price) || selectedProduct.selling_price,
      type: formData.type,
    });

    const { error: stockOutError } = await stockOut({
      product_id: selectedProduct.id,
      quantity,
      unit_price: parseFloat(formData.price) || selectedProduct.selling_price,
      type: formData.type,
      note: formData.note.trim() || undefined,
    });

    console.log('[stock-out] stockOut result:', stockOutError ? stockOutError.message : 'success');

    if (stockOutError) {
      setError(stockOutError.message);
      return;
    }

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      refetch();
      router.push('/(tabs)/inventory');
    }, 1500);
  };

  const updateFormData = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
    if (key === 'quantity') setError('');
  };

  if (productsLoading) {
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray[900]} />
          </TouchableOpacity>
          <Text style={styles.title}>出库登记</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Selection */}
          {!selectedProduct ? (
            <View style={styles.formGroup}>
              <Text style={styles.label}>选择商品 <Text style={styles.required}>*</Text></Text>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={Colors.gray[400]} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="搜索款号、名称、颜色"
                  placeholderTextColor={Colors.gray[400]}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={Colors.gray[400]} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Filter */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContainer}
              >
                <TouchableOpacity
                  style={[styles.categoryButton, !selectedCategoryId && styles.categoryButtonActive]}
                  onPress={() => setSelectedCategoryId(null)}
                >
                  <Text style={[styles.categoryButtonText, !selectedCategoryId && styles.categoryButtonTextActive]}>
                    全部
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryButton, selectedCategoryId === cat.id && styles.categoryButtonActive]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <Text style={[styles.categoryButtonText, selectedCategoryId === cat.id && styles.categoryButtonTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Size and Color Filters */}
              <View style={styles.filterRow}>
                {/* Size Filter */}
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>尺码</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.filterChips}>
                      <TouchableOpacity
                        style={[styles.filterChip, !selectedSize && styles.filterChipActive]}
                        onPress={() => setSelectedSize(null)}
                      >
                        <Text style={[styles.filterChipText, !selectedSize && styles.filterChipTextActive]}>全部</Text>
                      </TouchableOpacity>
                      {uniqueSizes.map((size) => (
                        <TouchableOpacity
                          key={size}
                          style={[styles.filterChip, selectedSize === size && styles.filterChipActive]}
                          onPress={() => setSelectedSize(size)}
                        >
                          <Text style={[styles.filterChipText, selectedSize === size && styles.filterChipTextActive]}>{size}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Color Filter */}
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>颜色</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.filterChips}>
                      <TouchableOpacity
                        style={[styles.filterChip, !selectedColor && styles.filterChipActive]}
                        onPress={() => setSelectedColor(null)}
                      >
                        <Text style={[styles.filterChipText, !selectedColor && styles.filterChipTextActive]}>全部</Text>
                      </TouchableOpacity>
                      {uniqueColors.map((color) => (
                        <TouchableOpacity
                          key={color}
                          style={[styles.filterChip, selectedColor === color && styles.filterChipActive]}
                          onPress={() => setSelectedColor(color)}
                        >
                          <Text style={[styles.filterChipText, selectedColor === color && styles.filterChipTextActive]}>{color}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Year Filter */}
                {uniqueYears.length > 0 && (
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>年份</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.filterChips}>
                        <TouchableOpacity
                          style={[styles.filterChip, !selectedYear && styles.filterChipActive]}
                          onPress={() => setSelectedYear(null)}
                        >
                          <Text style={[styles.filterChipText, !selectedYear && styles.filterChipTextActive]}>全部</Text>
                        </TouchableOpacity>
                        {uniqueYears.map((year) => (
                          <TouchableOpacity
                            key={year}
                            style={[styles.filterChip, selectedYear === year && styles.filterChipActive]}
                            onPress={() => setSelectedYear(year)}
                          >
                            <Text style={[styles.filterChipText, selectedYear === year && styles.filterChipTextActive]}>{year}年</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Season Filter */}
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>季度</Text>
                  <View style={styles.filterChips}>
                    <TouchableOpacity
                      style={[styles.filterChip, !selectedSeason && styles.filterChipActive]}
                      onPress={() => setSelectedSeason(null)}
                    >
                      <Text style={[styles.filterChipText, !selectedSeason && styles.filterChipTextActive]}>全部</Text>
                    </TouchableOpacity>
                    {SEASONS.map((s) => (
                      <TouchableOpacity
                        key={s.key}
                        style={[styles.filterChip, selectedSeason === s.key && styles.filterChipActive]}
                        onPress={() => setSelectedSeason(s.key)}
                      >
                        <Text style={[styles.filterChipText, selectedSeason === s.key && styles.filterChipTextActive]}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Results count */}
              <Text style={styles.resultsCount}>
                共 {filteredProducts.length} 件商品 {displayCount < filteredProducts.length && `(显示 ${displayCount} 件)`}
              </Text>

              {products.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>暂无商品，请先添加库存</Text>
                </View>
              ) : filteredProducts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>未找到匹配的商品</Text>
                </View>
              ) : (
                <View style={styles.productList}>
                  {displayedProducts.map((product) => {
                    const displayImage = product.image_urls?.[0] || product.image_url || product.video_thumbnails?.[0];
                    return (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.productItem}
                      onPress={() => {
                        setSelectedProduct(product);
                        setFormData({ ...formData, price: product.selling_price.toString() });
                      }}
                    >
                      {displayImage ? (
                        <Image
                          source={{ uri: displayImage }}
                          style={styles.productImage}
                          defaultSource={require('@/assets/images/icon.png')}
                        />
                      ) : (
                        <View style={[styles.productImage, styles.productImagePlaceholder]}>
                          <Ionicons name="shirt-outline" size={24} color={Colors.gray[300]} />
                        </View>
                      )}
                      <View style={styles.productInfo}>
                        <View style={styles.productBadges}>
                          <View style={styles.styleNoBadge}>
                            <Text style={styles.styleNoText}>{product.style_no}</Text>
                          </View>
                          {product.stock < lowStockThreshold && (
                            <View style={styles.lowStockBadge}>
                              <Ionicons name="alert-circle" size={12} color={Colors.red} />
                              <Text style={styles.lowStockText}>库存不足</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.productName}>{product.name}</Text>
                        <View style={styles.productMeta}>
                          <Text style={styles.productMetaText}>{product.size} | {product.color}</Text>
                          <Text style={styles.productStock}>库存: {product.stock}件</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )})}
                  {displayCount < filteredProducts.length && (
                    <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                      <Text style={styles.loadMoreText}>加载更多 ({filteredProducts.length - displayCount} 件)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.formGroup}>
              <Text style={styles.label}>已选商品</Text>
              {(() => {
                const selectedDisplayImage = selectedProduct.image_urls?.[0] || selectedProduct.image_url || selectedProduct.video_thumbnails?.[0];
                return (
              <View style={styles.selectedProductCard}>
                <View style={styles.selectedProductRow}>
                  {selectedDisplayImage ? (
                    <Image
                      source={{ uri: selectedDisplayImage }}
                      style={styles.selectedProductImage}
                      defaultSource={require('@/assets/images/icon.png')}
                    />
                  ) : (
                    <View style={[styles.selectedProductImage, styles.productImagePlaceholder]}>
                      <Ionicons name="shirt-outline" size={24} color={Colors.gray[300]} />
                    </View>
                  )}
                  <View style={styles.selectedProductInfo}>
                    <View style={styles.selectedStyleNoBadge}>
                      <Text style={styles.selectedStyleNoText}>{selectedProduct.style_no}</Text>
                    </View>
                    <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                    <Text style={styles.selectedProductMeta}>
                      {selectedProduct.size} | {selectedProduct.color}
                    </Text>
                  </View>
                </View>
                <View style={styles.stockInfoRow}>
                  <Text style={styles.stockInfoLabel}>当前库存</Text>
                  <Text style={styles.stockInfoValue}>{selectedProduct.stock} 件</Text>
                </View>
                <TouchableOpacity
                  style={styles.reselectButton}
                  onPress={() => setSelectedProduct(null)}
                >
                  <Text style={styles.reselectButtonText}>重新选择</Text>
                </TouchableOpacity>
              </View>
                );
              })()}
            </View>
          )}

          {/* Out Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>出货类型 <Text style={styles.required}>*</Text></Text>
            <View style={styles.typeGrid}>
              {outTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, formData.type === type && styles.typeButtonActive]}
                  onPress={() => updateFormData('type', type)}
                >
                  <Text style={[styles.typeButtonText, formData.type === type && styles.typeButtonTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quantity */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>出库数量 <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWithSuffix}>
              <TextInput
                style={styles.inputInner}
                value={formData.quantity}
                onChangeText={(v) => updateFormData('quantity', v)}
                placeholder="0"
                placeholderTextColor={Colors.gray[400]}
                keyboardType="number-pad"
              />
              <Text style={styles.inputSuffix}>件</Text>
            </View>
            {selectedProduct && (
              <Text style={styles.inputHint}>可出库数量: {selectedProduct.stock} 件</Text>
            )}
          </View>

          {/* Price */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>售价 <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWithPrefix}>
              <Text style={styles.inputPrefix}>¥</Text>
              <TextInput
                style={styles.inputInner}
                value={formData.price}
                onChangeText={(v) => updateFormData('price', v)}
                placeholder="0.00"
                placeholderTextColor={Colors.gray[400]}
                keyboardType="decimal-pad"
              />
            </View>
            {selectedProduct && (
              <Text style={styles.inputHint}>建议售价: ¥{selectedProduct.selling_price}</Text>
            )}
          </View>

          {/* Note */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>备注</Text>
            <TextInput
              style={styles.textArea}
              value={formData.note}
              onChangeText={(v) => updateFormData('note', v)}
              placeholder="选填，可记录客户信息、配送方式等"
              placeholderTextColor={Colors.gray[400]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={20} color={Colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.submitButton, mutationLoading && styles.submitButtonDisabled]}
            onPress={() => {
              console.log('[stock-out] Button pressed!');
              handleSubmit();
            }}
            disabled={mutationLoading}
            activeOpacity={0.7}
          >
            {mutationLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>确认出库</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Success Modal */}
        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={32} color={Colors.green} />
              </View>
              <Text style={styles.modalTitle}>出库成功！</Text>
              <Text style={styles.modalMessage}>
                已成功登记 {formData.quantity || 0} 件商品出库
              </Text>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  placeholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: Colors.gray[700],
    marginBottom: 8,
  },
  required: {
    color: Colors.red,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.gray[900],
  },
  categoryScroll: {
    marginBottom: 8,
    marginHorizontal: -4,
  },
  categoryContainer: {
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
  },
  categoryButtonActive: {
    backgroundColor: Colors.orange,
  },
  categoryButtonText: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  categoryButtonTextActive: {
    color: Colors.white,
  },
  filterRow: {
    marginBottom: 8,
  },
  filterGroup: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 6,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.gray[100],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  resultsCount: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 8,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[400],
  },
  productList: {
    gap: 8,
  },
  loadMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    marginTop: 4,
  },
  loadMoreText: {
    fontSize: 13,
    color: Colors.orange,
  },
  productItem: {
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.gray[200],
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
    fontSize: 14,
    color: Colors.gray[900],
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productMetaText: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  productStock: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  selectedProductCard: {
    backgroundColor: 'rgba(236, 64, 122, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(236, 64, 122, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  selectedProductRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  selectedProductImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.gray[200],
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedStyleNoBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  selectedStyleNoText: {
    fontSize: 12,
    color: Colors.white,
  },
  selectedProductName: {
    fontSize: 14,
    color: Colors.gray[900],
    marginBottom: 4,
  },
  selectedProductMeta: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  stockInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stockInfoLabel: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  stockInfoValue: {
    fontSize: 13,
    color: Colors.gray[900],
  },
  reselectButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  reselectButtonText: {
    fontSize: 13,
    color: Colors.primary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    width: '48%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: Colors.orange,
  },
  typeButtonText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  typeButtonTextActive: {
    color: Colors.white,
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.gray[900],
  },
  inputPrefix: {
    fontSize: 15,
    color: Colors.gray[500],
    marginRight: 4,
  },
  inputSuffix: {
    fontSize: 15,
    color: Colors.gray[500],
    marginLeft: 4,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 6,
  },
  textArea: {
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.gray[900],
    minHeight: 80,
  },
  errorCard: {
    backgroundColor: Colors.redLight,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#b91c1c',
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    padding: 16,
    paddingBottom: 32,
    zIndex: 100,
    paddingBottom: 32,
  },
  submitButton: {
    backgroundColor: Colors.orange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
  },
});
