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

export default function StoreInfoScreen() {
  const { store, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(store?.name || '');
  const [loading, setLoading] = useState(false);

  const isOwner = profile?.role === 'owner';

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '店铺名称不能为空');
      return;
    }

    if (!store) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ name: name.trim() })
        .eq('id', store.id);

      if (error) {
        console.error('[store-info] Update error:', error);
        throw error;
      }

      await refreshProfile();
      setEditing(false);
      Alert.alert('成功', '店铺信息已更新');
    } catch (error: any) {
      console.error('[store-info] Error:', error);
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
        <Text style={styles.headerTitle}>店铺信息</Text>
        {isOwner && !editing && (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>编辑</Text>
          </TouchableOpacity>
        )}
        {editing && (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(false)}>
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>店铺名称</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="请输入店铺名称"
                placeholderTextColor={Colors.gray[400]}
              />
            ) : (
              <Text style={styles.fieldValue}>{store?.name || '-'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>店铺ID</Text>
            <Text style={styles.fieldValueSmall}>{store?.id || '-'}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>创建时间</Text>
            <Text style={styles.fieldValue}>
              {store?.created_at ? new Date(store.created_at).toLocaleDateString('zh-CN') : '-'}
            </Text>
          </View>
        </View>

        {editing && (
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>保存</Text>
            )}
          </TouchableOpacity>
        )}

        {!isOwner && (
          <View style={styles.notice}>
            <Ionicons name="information-circle" size={20} color={Colors.gray[500]} />
            <Text style={styles.noticeText}>只有店长可以编辑店铺信息</Text>
          </View>
        )}
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
  editButton: {
    padding: 4,
  },
  editButtonText: {
    fontSize: 15,
    color: Colors.primary,
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.gray[500],
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  field: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  fieldLabel: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 16,
    color: Colors.gray[900],
  },
  fieldValueSmall: {
    fontSize: 12,
    color: Colors.gray[400],
    fontFamily: 'monospace',
  },
  input: {
    fontSize: 16,
    color: Colors.gray[900],
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  noticeText: {
    fontSize: 13,
    color: Colors.gray[500],
  },
});
