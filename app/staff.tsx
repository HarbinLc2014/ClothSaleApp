import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

export default function StaffScreen() {
  const { store, profile: currentUser } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, [store]);

  const fetchStaff = async () => {
    if (!store) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[staff] Fetch error:', error);
        throw error;
      }

      setStaff(data || []);
    } catch (error: any) {
      console.error('[staff] Error:', error);
      Alert.alert('加载失败', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = (member: Profile) => {
    if (member.role === 'owner') {
      Alert.alert('提示', '无法移除店长');
      return;
    }

    Alert.alert(
      '确认移除',
      `确定要将 ${member.name} 移出店铺吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '移除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ store_id: null, role: 'staff' })
                .eq('id', member.id);

              if (error) {
                console.error('[staff] Remove error:', error);
                throw error;
              }

              fetchStaff();
              Alert.alert('成功', '已移除该员工');
            } catch (error: any) {
              console.error('[staff] Error:', error);
              Alert.alert('操作失败', error.message);
            }
          },
        },
      ]
    );
  };

  const renderStaffItem = ({ item }: { item: Profile }) => (
    <View style={styles.staffItem}>
      <View style={styles.staffAvatar}>
        <Ionicons name="person" size={24} color={Colors.white} />
      </View>
      <View style={styles.staffInfo}>
        <Text style={styles.staffName}>{item.name}</Text>
        <View style={styles.staffMeta}>
          <View style={[styles.roleBadge, item.role === 'owner' && styles.ownerBadge]}>
            <Text style={[styles.roleText, item.role === 'owner' && styles.ownerText]}>
              {item.role === 'owner' ? '店长' : '员工'}
            </Text>
          </View>
          {item.phone && <Text style={styles.staffPhone}>{item.phone}</Text>}
        </View>
      </View>
      {currentUser?.role === 'owner' && item.role !== 'owner' && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveStaff(item)}
        >
          <Ionicons name="close-circle" size={24} color={Colors.red} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>员工管理</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={staff}
          renderItem={renderStaffItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={Colors.gray[300]} />
              <Text style={styles.emptyText}>暂无员工</Text>
            </View>
          }
          ListHeaderComponent={
            <View style={styles.statsCard}>
              <Text style={styles.statsText}>共 {staff.length} 人</Text>
            </View>
          }
        />
      )}

      <View style={styles.tipCard}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <Text style={styles.tipText}>
          新员工注册时输入您的店铺名称即可加入
        </Text>
      </View>
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
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffInfo: {
    flex: 1,
    marginLeft: 12,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[900],
    marginBottom: 4,
  },
  staffMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerBadge: {
    backgroundColor: 'rgba(236, 64, 122, 0.1)',
  },
  roleText: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  ownerText: {
    color: Colors.primary,
  },
  staffPhone: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  removeButton: {
    padding: 4,
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
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 64, 122, 0.1)',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.gray[700],
  },
});
