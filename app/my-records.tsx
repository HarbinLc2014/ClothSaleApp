import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface RecordWithProduct {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  created_at: string;
  product: {
    name: string;
    style_no: string;
  } | null;
}

export default function MyRecordsScreen() {
  const { user } = useAuth();
  const [records, setRecords] = useState<RecordWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, [user]);

  const fetchRecords = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('stock_records')
        .select(`
          id,
          type,
          quantity,
          note,
          created_at,
          product:products (name, style_no)
        `)
        .eq('operator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[my-records] Fetch error:', JSON.stringify(error));
        throw error;
      }

      console.log('[my-records] Fetched records:', data?.length);

      setRecords((data as RecordWithProduct[]) || []);
    } catch (error: any) {
      console.error('[my-records] Error:', error);
      Alert.alert('加载失败', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const renderRecordItem = ({ item }: { item: RecordWithProduct }) => {
    const isStockIn = item.type === '入库';
    return (
      <View style={styles.recordItem}>
        <View style={[styles.recordIcon, isStockIn ? styles.stockInIcon : styles.stockOutIcon]}>
          <Ionicons
            name={isStockIn ? 'arrow-down' : 'arrow-up'}
            size={16}
            color={isStockIn ? Colors.green : Colors.red}
          />
        </View>
        <View style={styles.recordContent}>
          <Text style={styles.recordProduct}>{item.product?.name || '未知商品'}</Text>
          <Text style={styles.recordSku}>{item.product?.style_no || ''}</Text>
          {item.note && <Text style={styles.recordNote}>{item.note}</Text>}
        </View>
        <View style={styles.recordRight}>
          <Text style={[styles.recordQuantity, isStockIn ? styles.stockInText : styles.stockOutText]}>
            {isStockIn ? '+' : '-'}{item.quantity}
          </Text>
          <Text style={styles.recordTime}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的操作记录</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderRecordItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={Colors.gray[300]} />
              <Text style={styles.emptyText}>暂无操作记录</Text>
            </View>
          }
          ListHeaderComponent={
            records.length > 0 ? (
              <View style={styles.statsCard}>
                <Text style={styles.statsText}>最近 {records.length} 条记录</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.gray[900],
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 15,
    color: Colors.gray[700],
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockInIcon: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  stockOutIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  recordContent: {
    flex: 1,
    marginLeft: 12,
  },
  recordProduct: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  recordSku: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
  recordNote: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 4,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  recordQuantity: {
    fontSize: 16,
    fontWeight: '600',
  },
  stockInText: {
    color: Colors.green,
  },
  stockOutText: {
    color: Colors.red,
  },
  recordTime: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.gray[400],
  },
});
