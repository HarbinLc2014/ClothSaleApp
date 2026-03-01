import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

const product = {
  id: '1',
  image: 'https://images.unsplash.com/photo-1711516141938-cc5917435dcd?w=800',
  styleNo: 'CQ2024001',
  name: '春季新款连衣裙',
  category: '连衣裙',
  season: '春',
  size: 'M',
  color: '粉色',
  stock: 25,
  price: 299,
  costPrice: 180,
  lastStockIn: '2026-03-01 10:30',
  lastStockOut: '2026-03-01 14:20',
  description: '优质面料，舒适透气，适合春季穿着',
};

const stockHistory = [
  { id: 1, type: '入库', quantity: 20, price: 180, time: '2026-03-01 10:30', operator: '店员A', isStockIn: true },
  { id: 2, type: '零售售出', quantity: 2, price: 299, time: '2026-03-01 14:20', operator: '店长', isStockIn: false },
  { id: 3, type: '批发拿货', quantity: 5, price: 250, time: '2026-02-28 16:45', operator: '店员B', isStockIn: false },
  { id: 4, type: '入库', quantity: 12, price: 180, time: '2026-02-25 09:15', operator: '店长', isStockIn: true },
];

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

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
        {/* Product Image */}
        <Image
          source={{ uri: product.image }}
          style={styles.productImage}
          resizeMode="cover"
        />

        <View style={styles.content}>
          {/* Style No & Name */}
          <View style={styles.titleSection}>
            <View style={styles.badges}>
              <View style={styles.styleNoBadge}>
                <Text style={styles.styleNoText}>{product.styleNo}</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{product.category}</Text>
              </View>
            </View>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productDesc}>{product.description}</Text>
          </View>

          {/* Price & Stock */}
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>售价</Text>
                <Text style={styles.priceValue}>¥{product.price}</Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>成本</Text>
                <Text style={styles.costValue}>¥{product.costPrice}</Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>当前库存</Text>
                <Text style={styles.stockValue}>{product.stock} 件</Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>预计总值</Text>
                <Text style={styles.costValue}>¥{product.price * product.stock}</Text>
              </View>
            </View>
          </View>

          {/* Product Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>尺码</Text>
              <Text style={styles.detailValue}>{product.size}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>颜色</Text>
              <View style={styles.colorValue}>
                <View style={[styles.colorDot, { backgroundColor: '#ffc0cb' }]} />
                <Text style={styles.detailValue}>{product.color}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>季节</Text>
              <Text style={styles.detailValue}>{product.season}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>最近入库</Text>
              <Text style={styles.detailValue}>{product.lastStockIn}</Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={styles.detailLabel}>最近出库</Text>
              <Text style={styles.detailValue}>{product.lastStockOut}</Text>
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
              {stockHistory.map((record) => (
                <View key={record.id} style={styles.historyCard}>
                  <View style={[styles.historyIcon, record.isStockIn ? styles.stockInIcon : styles.stockOutIcon]}>
                    <Ionicons
                      name={record.isStockIn ? 'trending-up' : 'trending-down'}
                      size={20}
                      color={record.isStockIn ? Colors.green : Colors.orange}
                    />
                  </View>
                  <View style={styles.historyContent}>
                    <View style={styles.historyHeader}>
                      <View style={[styles.historyBadge, record.isStockIn ? styles.historyBadgeIn : styles.historyBadgeOut]}>
                        <Text style={[styles.historyBadgeText, record.isStockIn ? styles.historyBadgeTextIn : styles.historyBadgeTextOut]}>
                          {record.type}
                        </Text>
                      </View>
                      <Text style={[styles.historyQuantity, record.isStockIn ? styles.quantityIn : styles.quantityOut]}>
                        {record.isStockIn ? '+' : '-'}{record.quantity}件
                      </Text>
                    </View>
                    <Text style={styles.historyPrice}>单价: ¥{record.price}</Text>
                    <View style={styles.historyMeta}>
                      <View style={styles.historyTime}>
                        <Ionicons name="time-outline" size={12} color={Colors.gray[400]} />
                        <Text style={styles.historyTimeText}>{record.time}</Text>
                      </View>
                      <Text style={styles.historyOperator}>操作人: {record.operator}</Text>
                    </View>
                  </View>
                </View>
              ))}
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
