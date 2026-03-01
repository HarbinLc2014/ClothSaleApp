import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { useProductMutations, useProducts, useCategories } from '@/lib/useData';
import { useAuth } from '@/lib/auth';
import { uploadProductImage } from '@/lib/supabase';
import { ProductSeason, ProductSize } from '@/lib/types';

const sizes: ProductSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'F'];
const seasons: ProductSeason[] = ['春', '夏', '秋', '冬'];
const currentYear = new Date().getFullYear();
const years: number[] = [currentYear - 1, currentYear, currentYear + 1];

interface Variant {
  id: string;
  size: ProductSize;
  color: string;
  quantity: string;
  sellingPrice: string;  // Each variant can have different selling price
  imageUri: string | null;  // Each color can have different image
  expanded: boolean;
}

const generateId = () => Math.random().toString(36).substring(7);

export default function StockInScreen() {
  const router = useRouter();
  const { store } = useAuth();
  const { createProduct, stockIn, loading } = useProductMutations();
  const { products, refetch: refetchProducts } = useProducts();
  const { categories } = useCategories();

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Basic product info (shared across variants)
  const [formData, setFormData] = useState({
    styleNo: '',
    name: '',
    categoryId: '',
    costPrice: '',
    defaultSellingPrice: '',  // Default selling price, can be overridden per variant
    year: currentYear,
    season: '春' as ProductSeason,
    note: '',
  });

  // Multiple variants (size/color/quantity/price/image combinations)
  const [variants, setVariants] = useState<Variant[]>([
    { id: generateId(), size: 'M', color: '', quantity: '', sellingPrice: '', imageUri: null, expanded: true },
  ]);

  // For existing product mode
  const [existingQuantity, setExistingQuantity] = useState('');
  const [existingCostPrice, setExistingCostPrice] = useState('');

  const [showSuccess, setShowSuccess] = useState(false);
  const [successQuantity, setSuccessQuantity] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  const addVariant = () => {
    setVariants([
      ...variants,
      { id: generateId(), size: 'M', color: '', quantity: '', sellingPrice: '', imageUri: null, expanded: true },
    ]);
  };

  const removeVariant = (id: string) => {
    if (variants.length === 1) {
      Alert.alert('提示', '至少需要保留一个规格');
      return;
    }
    setVariants(variants.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof Variant, value: any) => {
    setVariants(variants.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const toggleVariantExpanded = (id: string) => {
    setVariants(variants.map(v =>
      v.id === id ? { ...v, expanded: !v.expanded } : v
    ));
  };

  const pickImage = async (variantId: string) => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相册访问权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateVariant(variantId, 'imageUri', result.assets[0].uri);
      }
    } catch (error) {
      console.error('[stock-in] Image picker error:', error);
      Alert.alert('选择图片失败', '请重试');
    }
  };

  const handleSubmit = async () => {
    if (mode === 'new') {
      // Validate basic info
      if (!formData.styleNo.trim() || !formData.name.trim()) {
        Alert.alert('提示', '请填写款号和商品名称');
        return;
      }
      if (!formData.costPrice) {
        Alert.alert('提示', '请填写进价');
        return;
      }

      // Validate variants
      const validVariants = variants.filter(v => v.quantity && parseInt(v.quantity) > 0);
      if (validVariants.length === 0) {
        Alert.alert('提示', '请至少添加一个有效的规格（数量大于0）');
        return;
      }

      // Check for missing colors
      const missingColor = validVariants.find(v => !v.color.trim());
      if (missingColor) {
        Alert.alert('提示', '请填写所有规格的颜色');
        return;
      }

      // Check selling prices
      const missingPrice = validVariants.find(v => !v.sellingPrice && !formData.defaultSellingPrice);
      if (missingPrice) {
        Alert.alert('提示', '请填写售价（可在基本信息填写默认售价，或在每个规格单独设置）');
        return;
      }

      if (!store?.id) {
        Alert.alert('错误', '未找到店铺信息');
        return;
      }

      setSubmitting(true);
      let totalQuantity = 0;
      let hasError = false;

      // Create products for each variant
      for (const variant of validVariants) {
        // Upload image if exists
        let imageUrl: string | undefined;
        if (variant.imageUri) {
          setUploadingImage(variant.id);
          const { url, error: uploadError } = await uploadProductImage(
            variant.imageUri,
            store.id,
            `${formData.styleNo}_${variant.color}_${variant.size}`
          );
          setUploadingImage(null);

          if (uploadError) {
            console.error('[stock-in] Image upload error:', uploadError);
            Alert.alert('图片上传失败', `${variant.size} ${variant.color}: ${uploadError.message}`);
            hasError = true;
            break;
          }
          imageUrl = url || undefined;
        }

        const sellingPrice = variant.sellingPrice
          ? parseFloat(variant.sellingPrice)
          : parseFloat(formData.defaultSellingPrice);

        const { data: product, error: createError } = await createProduct({
          style_no: formData.styleNo.trim(),
          name: formData.name.trim(),
          category_id: formData.categoryId || undefined,
          size: variant.size,
          color: variant.color.trim(),
          year: formData.year,
          season: formData.season,
          cost_price: parseFloat(formData.costPrice),
          selling_price: sellingPrice,
          stock: parseInt(variant.quantity),
          image_url: imageUrl,
        });

        if (createError) {
          console.error('[stock-in] Create product error:', createError);
          Alert.alert('入库失败', `${variant.size} ${variant.color}: ${createError.message}`);
          hasError = true;
          break;
        }

        totalQuantity += parseInt(variant.quantity);
      }

      setSubmitting(false);

      if (!hasError) {
        setSuccessQuantity(totalQuantity);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          resetForm();
          refetchProducts();
        }, 1500);
      }
    } else {
      // Adding to existing product
      if (!selectedProductId) {
        Alert.alert('提示', '请选择商品');
        return;
      }
      if (!existingQuantity || parseInt(existingQuantity) <= 0) {
        Alert.alert('提示', '请填写有效的数量');
        return;
      }
      if (!existingCostPrice) {
        Alert.alert('提示', '请填写进价');
        return;
      }

      setSubmitting(true);
      const { error } = await stockIn({
        product_id: selectedProductId,
        quantity: parseInt(existingQuantity),
        unit_price: parseFloat(existingCostPrice),
        note: formData.note.trim() || undefined,
      });
      setSubmitting(false);

      if (error) {
        console.error('[stock-in] Stock in error:', error);
        Alert.alert('入库失败', error.message);
        return;
      }

      setSuccessQuantity(parseInt(existingQuantity));
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
        refetchProducts();
      }, 1500);
    }
  };

  const resetForm = () => {
    setFormData({
      styleNo: '',
      name: '',
      categoryId: '',
      costPrice: '',
      defaultSellingPrice: '',
      year: currentYear,
      season: '春',
      note: '',
    });
    setVariants([
      { id: generateId(), size: 'M', color: '', quantity: '', sellingPrice: '', imageUri: null, expanded: true },
    ]);
    setSelectedProductId(null);
    setExistingQuantity('');
    setExistingCostPrice('');
  };

  const updateFormData = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const totalVariantQuantity = variants.reduce((sum, v) => sum + (parseInt(v.quantity) || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.gray[900]} />
          </TouchableOpacity>
          <Text style={styles.title}>新增入库</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'new' && styles.modeButtonActive]}
            onPress={() => { setMode('new'); setSelectedProductId(null); }}
          >
            <Text style={[styles.modeButtonText, mode === 'new' && styles.modeButtonTextActive]}>
              新商品入库
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'existing' && styles.modeButtonActive]}
            onPress={() => setMode('existing')}
          >
            <Text style={[styles.modeButtonText, mode === 'existing' && styles.modeButtonTextActive]}>
              已有商品补货
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'existing' ? (
            <>
              {/* Product Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>选择商品 <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowProductPicker(true)}
                >
                  <Text style={selectedProduct ? styles.selectInputText : styles.selectInputPlaceholder}>
                    {selectedProduct ? `${selectedProduct.style_no} - ${selectedProduct.name}` : '点击选择商品'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.gray[400]} />
                </TouchableOpacity>
                {selectedProduct && (
                  <View style={styles.selectedProductInfo}>
                    <Text style={styles.selectedProductDetail}>
                      当前库存: {selectedProduct.stock}件 | 尺码: {selectedProduct.size} | 颜色: {selectedProduct.color}
                    </Text>
                  </View>
                )}
              </View>

              {/* Quantity */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>入库数量 <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWithSuffix}>
                  <TextInput
                    style={styles.inputInner}
                    value={existingQuantity}
                    onChangeText={setExistingQuantity}
                    placeholder="0"
                    placeholderTextColor={Colors.gray[400]}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.inputSuffix}>件</Text>
                </View>
              </View>

              {/* Cost Price */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>进价 <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWithPrefix}>
                  <Text style={styles.inputPrefix}>¥</Text>
                  <TextInput
                    style={styles.inputInner}
                    value={existingCostPrice}
                    onChangeText={setExistingCostPrice}
                    placeholder={selectedProduct ? String(selectedProduct.cost_price) : '0.00'}
                    placeholderTextColor={Colors.gray[400]}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Basic Info Section */}
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.gray[600]} />
                <Text style={styles.sectionTitle}>基本信息</Text>
              </View>

              {/* Style No */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>款号 <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={formData.styleNo}
                  onChangeText={(v) => updateFormData('styleNo', v)}
                  placeholder="例: CQ2024001"
                  placeholderTextColor={Colors.gray[400]}
                />
              </View>

              {/* Product Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>商品名称 <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(v) => updateFormData('name', v)}
                  placeholder="例: 春季新款连衣裙"
                  placeholderTextColor={Colors.gray[400]}
                />
              </View>

              {/* Category */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>分类</Text>
                <View style={styles.buttonGroup}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.optionButton,
                        formData.categoryId === category.id && styles.optionButtonActive,
                      ]}
                      onPress={() => updateFormData('categoryId', category.id)}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          formData.categoryId === category.id && styles.optionButtonTextActive,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Year & Season */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>年份季节</Text>
                <View style={styles.yearSeasonRow}>
                  <View style={styles.yearGroup}>
                    {years.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.yearButton,
                          formData.year === year && styles.yearButtonActive,
                        ]}
                        onPress={() => setFormData({ ...formData, year })}
                      >
                        <Text
                          style={[
                            styles.yearButtonText,
                            formData.year === year && styles.yearButtonTextActive,
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.seasonGroup}>
                    {seasons.map((season) => (
                      <TouchableOpacity
                        key={season}
                        style={[
                          styles.seasonButton,
                          formData.season === season && styles.seasonButtonActive,
                        ]}
                        onPress={() => updateFormData('season', season)}
                      >
                        <Text
                          style={[
                            styles.seasonButtonText,
                            formData.season === season && styles.seasonButtonTextActive,
                          ]}
                        >
                          {season}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Cost Price & Default Selling Price */}
              <View style={styles.formRow}>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.label}>进价 <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWithPrefix}>
                    <Text style={styles.inputPrefix}>¥</Text>
                    <TextInput
                      style={styles.inputInner}
                      value={formData.costPrice}
                      onChangeText={(v) => updateFormData('costPrice', v)}
                      placeholder="0.00"
                      placeholderTextColor={Colors.gray[400]}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.label}>默认售价</Text>
                  <View style={styles.inputWithPrefix}>
                    <Text style={styles.inputPrefix}>¥</Text>
                    <TextInput
                      style={styles.inputInner}
                      value={formData.defaultSellingPrice}
                      onChangeText={(v) => updateFormData('defaultSellingPrice', v)}
                      placeholder="0.00"
                      placeholderTextColor={Colors.gray[400]}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>
              <Text style={styles.priceHint}>售价可在每个规格中单独设置，未设置时使用默认售价</Text>

              {/* Variants Section */}
              <View style={styles.sectionHeader}>
                <Ionicons name="layers-outline" size={18} color={Colors.gray[600]} />
                <Text style={styles.sectionTitle}>规格明细</Text>
                <Text style={styles.sectionSubtitle}>共 {variants.length} 个规格，{totalVariantQuantity} 件</Text>
              </View>

              {/* Variant Cards */}
              {variants.map((variant, index) => (
                <View key={variant.id} style={styles.variantCard}>
                  {/* Variant Header */}
                  <TouchableOpacity
                    style={styles.variantHeader}
                    onPress={() => toggleVariantExpanded(variant.id)}
                  >
                    <View style={styles.variantHeaderLeft}>
                      <View style={styles.variantNumber}>
                        <Text style={styles.variantNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.variantSummary}>
                        {variant.size} / {variant.color || '未填颜色'} / {variant.quantity || '0'}件
                        {variant.sellingPrice ? ` / ¥${variant.sellingPrice}` : ''}
                      </Text>
                    </View>
                    <View style={styles.variantHeaderRight}>
                      {variant.imageUri && (
                        <View style={styles.variantImageIndicator}>
                          <Ionicons name="image" size={14} color={Colors.green} />
                        </View>
                      )}
                      {variants.length > 1 && (
                        <TouchableOpacity
                          style={styles.removeVariantButton}
                          onPress={() => removeVariant(variant.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color={Colors.red} />
                        </TouchableOpacity>
                      )}
                      <Ionicons
                        name={variant.expanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={Colors.gray[400]}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Variant Content (Expanded) */}
                  {variant.expanded && (
                    <View style={styles.variantContent}>
                      {/* Image Upload */}
                      <View style={styles.variantField}>
                        <Text style={styles.variantLabel}>商品图片（该颜色）</Text>
                        <TouchableOpacity
                          style={styles.imageUploadArea}
                          onPress={() => pickImage(variant.id)}
                        >
                          {variant.imageUri ? (
                            <View style={styles.imagePreviewContainer}>
                              <Image source={{ uri: variant.imageUri }} style={styles.imagePreview} />
                              <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={() => updateVariant(variant.id, 'imageUri', null)}
                              >
                                <Ionicons name="close-circle" size={24} color={Colors.red} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View style={styles.imageUploadPlaceholder}>
                              <Ionicons name="camera-outline" size={32} color={Colors.gray[400]} />
                              <Text style={styles.imageUploadText}>点击上传图片</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Size */}
                      <View style={styles.variantField}>
                        <Text style={styles.variantLabel}>尺码</Text>
                        <View style={styles.sizeGroup}>
                          {sizes.map((size) => (
                            <TouchableOpacity
                              key={size}
                              style={[
                                styles.sizeButton,
                                variant.size === size && styles.sizeButtonActive,
                              ]}
                              onPress={() => updateVariant(variant.id, 'size', size)}
                            >
                              <Text
                                style={[
                                  styles.sizeButtonText,
                                  variant.size === size && styles.sizeButtonTextActive,
                                ]}
                              >
                                {size}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Color */}
                      <View style={styles.variantField}>
                        <Text style={styles.variantLabel}>颜色 <Text style={styles.required}>*</Text></Text>
                        <TextInput
                          style={styles.input}
                          value={variant.color}
                          onChangeText={(v) => updateVariant(variant.id, 'color', v)}
                          placeholder="例: 粉色"
                          placeholderTextColor={Colors.gray[400]}
                        />
                      </View>

                      {/* Quantity & Selling Price Row */}
                      <View style={styles.variantFieldRow}>
                        <View style={styles.variantFieldHalf}>
                          <Text style={styles.variantLabel}>数量 <Text style={styles.required}>*</Text></Text>
                          <View style={styles.inputWithSuffix}>
                            <TextInput
                              style={styles.inputInner}
                              value={variant.quantity}
                              onChangeText={(v) => updateVariant(variant.id, 'quantity', v)}
                              placeholder="0"
                              placeholderTextColor={Colors.gray[400]}
                              keyboardType="number-pad"
                            />
                            <Text style={styles.inputSuffix}>件</Text>
                          </View>
                        </View>
                        <View style={styles.variantFieldHalf}>
                          <Text style={styles.variantLabel}>售价</Text>
                          <View style={styles.inputWithPrefix}>
                            <Text style={styles.inputPrefix}>¥</Text>
                            <TextInput
                              style={styles.inputInner}
                              value={variant.sellingPrice}
                              onChangeText={(v) => updateVariant(variant.id, 'sellingPrice', v)}
                              placeholder={formData.defaultSellingPrice || '0.00'}
                              placeholderTextColor={Colors.gray[400]}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ))}

              {/* Add Variant Button */}
              <TouchableOpacity style={styles.addVariantButton} onPress={addVariant}>
                <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                <Text style={styles.addVariantText}>添加更多规格</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Note */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>备注</Text>
            <TextInput
              style={styles.textArea}
              value={formData.note}
              onChangeText={(v) => updateFormData('note', v)}
              placeholder="选填，可记录供应商、批次等信息"
              placeholderTextColor={Colors.gray[400]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          {mode === 'new' && totalVariantQuantity > 0 && (
            <Text style={styles.submitSummary}>
              即将入库 {variants.filter(v => parseInt(v.quantity) > 0).length} 个规格，共 {totalVariantQuantity} 件
            </Text>
          )}
          <TouchableOpacity
            style={[styles.submitButton, (loading || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || submitting}
          >
            {(loading || submitting) ? (
              <View style={styles.submittingContent}>
                <ActivityIndicator color={Colors.white} />
                {uploadingImage && <Text style={styles.submittingText}>正在上传图片...</Text>}
              </View>
            ) : (
              <Text style={styles.submitButtonText}>确认入库</Text>
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
              <Text style={styles.modalTitle}>入库成功！</Text>
              <Text style={styles.modalMessage}>
                已成功添加 {successQuantity} 件商品
              </Text>
            </View>
          </View>
        </Modal>

        {/* Product Picker Modal */}
        <Modal visible={showProductPicker} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                <Text style={styles.pickerCancel}>取消</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>选择商品</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView style={styles.pickerList}>
              {products.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.pickerItem,
                    selectedProductId === product.id && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setSelectedProductId(product.id);
                    setShowProductPicker(false);
                  }}
                >
                  <View>
                    <Text style={styles.pickerItemStyleNo}>{product.style_no}</Text>
                    <Text style={styles.pickerItemName}>{product.name}</Text>
                    <Text style={styles.pickerItemMeta}>
                      {product.size} | {product.color} | 库存: {product.stock}件
                    </Text>
                  </View>
                  {selectedProductId === product.id && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              {products.length === 0 && (
                <View style={styles.emptyPicker}>
                  <Text style={styles.emptyPickerText}>暂无商品，请先添加新商品</Text>
                </View>
              )}
            </ScrollView>
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
  modeToggle: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  modeButtonTextActive: {
    color: Colors.gray[900],
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.gray[500],
    marginLeft: 'auto',
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
  input: {
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.gray[900],
  },
  selectInput: {
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectInputText: {
    fontSize: 15,
    color: Colors.gray[900],
  },
  selectInputPlaceholder: {
    fontSize: 15,
    color: Colors.gray[400],
  },
  selectedProductInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  selectedProductDetail: {
    fontSize: 13,
    color: Colors.primary,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
  },
  optionButtonActive: {
    backgroundColor: Colors.primary,
  },
  optionButtonText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  optionButtonTextActive: {
    color: Colors.white,
  },
  sizeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeButton: {
    width: 44,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeButtonActive: {
    backgroundColor: Colors.primary,
  },
  sizeButtonText: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  sizeButtonTextActive: {
    color: Colors.white,
  },
  yearSeasonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  yearGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  yearButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
  },
  yearButtonActive: {
    backgroundColor: Colors.primary,
  },
  yearButtonText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  yearButtonTextActive: {
    color: Colors.white,
  },
  seasonGroup: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
  },
  seasonButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
  },
  seasonButtonActive: {
    backgroundColor: Colors.primary,
  },
  seasonButtonText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  seasonButtonTextActive: {
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
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  formGroupHalf: {
    flex: 1,
  },
  priceHint: {
    fontSize: 12,
    color: Colors.gray[400],
    marginBottom: 20,
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
  // Variant Card Styles
  variantCard: {
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  variantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: Colors.white,
  },
  variantHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  variantNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  variantNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  variantSummary: {
    fontSize: 14,
    color: Colors.gray[700],
    flex: 1,
  },
  variantHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  variantImageIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeVariantButton: {
    padding: 4,
  },
  variantContent: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  variantField: {
    marginBottom: 16,
  },
  variantFieldRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  variantFieldHalf: {
    flex: 1,
  },
  variantLabel: {
    fontSize: 13,
    color: Colors.gray[600],
    marginBottom: 8,
  },
  imageUploadArea: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.gray[50],
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray[300],
  },
  imageUploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadText: {
    fontSize: 13,
    color: Colors.gray[400],
    marginTop: 6,
  },
  imagePreviewContainer: {
    flex: 1,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  addVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderRadius: 12,
    marginBottom: 20,
    gap: 6,
  },
  addVariantText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
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
  },
  submitSummary: {
    fontSize: 13,
    color: Colors.gray[600],
    textAlign: 'center',
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: Colors.primary,
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
  submittingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submittingText: {
    color: Colors.white,
    fontSize: 14,
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
  pickerContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  pickerCancel: {
    fontSize: 16,
    color: Colors.primary,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  pickerList: {
    flex: 1,
    padding: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    marginBottom: 8,
  },
  pickerItemActive: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  pickerItemStyleNo: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 4,
  },
  pickerItemName: {
    fontSize: 15,
    color: Colors.gray[900],
    marginBottom: 4,
  },
  pickerItemMeta: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  emptyPicker: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyPickerText: {
    fontSize: 14,
    color: Colors.gray[400],
  },
});
