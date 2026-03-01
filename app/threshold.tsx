import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function ThresholdScreen() {
  const { store, refreshProfile } = useAuth();
  const [threshold, setThreshold] = useState(String(store?.low_stock_threshold || 5));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const value = parseInt(threshold, 10);
    if (isNaN(value) || value < 0) {
      Alert.alert('提示', '请输入有效的数字');
      return;
    }

    if (!store) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ low_stock_threshold: value })
        .eq('id', store.id);

      if (error) {
        console.error('[threshold] Update error:', error);
        throw error;
      }

      await refreshProfile();
      Alert.alert('成功', '库存阈值已更新');
    } catch (error: any) {
      console.error('[threshold] Error:', error);
      Alert.alert('保存失败', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>库存阈值设置</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={32} color={Colors.orange} />
          </View>
          <Text style={styles.cardTitle}>低库存预警阈值</Text>
          <Text style={styles.cardDescription}>
            当商品库存数量低于此阈值时，将会在首页显示预警提醒
          </Text>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>库存数量少于</Text>
            <TextInput
              style={styles.input}
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={Colors.gray[400]}
            />
            <Text style={styles.inputLabel}>件时预警</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>保存设置</Text>
          )}
        </TouchableOpacity>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>预览效果</Text>
          <View style={styles.previewItem}>
            <View style={styles.previewIcon}>
              <Ionicons name="alert-circle" size={20} color={Colors.orange} />
            </View>
            <View style={styles.previewContent}>
              <Text style={styles.previewName}>示例商品</Text>
              <Text style={styles.previewStock}>
                库存: <Text style={styles.previewStockValue}>3</Text> 件
              </Text>
            </View>
            <View style={styles.warningBadge}>
              <Text style={styles.warningText}>库存不足</Text>
            </View>
          </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    color: Colors.gray[700],
  },
  input: {
    width: 60,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  previewTitle: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 12,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 146, 60, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.2)',
  },
  previewIcon: {
    marginRight: 12,
  },
  previewContent: {
    flex: 1,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  previewStock: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  previewStockValue: {
    color: Colors.orange,
    fontWeight: '600',
  },
  warningBadge: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  warningText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '500',
  },
});
