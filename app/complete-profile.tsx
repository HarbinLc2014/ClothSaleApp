import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function CompleteProfileScreen() {
  const { user, refreshProfile } = useAuth();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入您的姓名');
      return;
    }

    if (!storeName.trim()) {
      Alert.alert('提示', '请输入店铺名称');
      return;
    }

    if (!user) {
      Alert.alert('错误', '用户未登录');
      return;
    }

    setLoading(true);
    try {
      let storeId: string | null = null;
      let role: 'owner' | 'staff' = 'staff';

      // Check if store already exists
      const { data: existingStore, error: storeQueryError } = await supabase
        .from('stores')
        .select('*')
        .eq('name', storeName.trim())
        .single();

      if (storeQueryError && storeQueryError.code !== 'PGRST116') {
        console.error('[complete-profile] Store query error:', storeQueryError);
        throw storeQueryError;
      }

      if (existingStore) {
        // Join existing store as staff
        storeId = existingStore.id;
        role = 'staff';

        // Create profile for existing store
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: name.trim(),
            phone: phone.trim(),
            role,
            store_id: storeId,
          });

        if (profileError) {
          console.error('[complete-profile] Profile insert error:', profileError);
          throw profileError;
        }
      } else {
        // Create profile first (without store_id)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: name.trim(),
            phone: phone.trim(),
            role: 'owner',
            store_id: null,
          });

        if (profileError) {
          console.error('[complete-profile] Profile insert error:', profileError);
          throw profileError;
        }

        // Then create new store as owner
        const { data: newStore, error: storeError } = await supabase
          .from('stores')
          .insert({ name: storeName.trim(), owner_id: user.id })
          .select()
          .single();

        if (storeError) {
          console.error('[complete-profile] Store insert error:', storeError);
          throw storeError;
        }

        storeId = newStore.id;

        // Create default categories for new store
        const defaultCategories = [
          { store_id: storeId, name: '连衣裙', sort_order: 1 },
          { store_id: storeId, name: '上衣', sort_order: 2 },
          { store_id: storeId, name: '裤子', sort_order: 3 },
          { store_id: storeId, name: '裙子', sort_order: 4 },
          { store_id: storeId, name: '外套', sort_order: 5 },
          { store_id: storeId, name: '其他', sort_order: 99 },
        ];

        const { error: categoryError } = await supabase
          .from('categories')
          .insert(defaultCategories);

        if (categoryError) {
          console.error('[complete-profile] Category insert error:', categoryError);
          // Don't throw - categories can be created later
        }

        // Update profile with store_id
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ store_id: storeId })
          .eq('id', user.id);

        if (updateError) {
          console.error('[complete-profile] Profile update error:', updateError);
          throw updateError;
        }
      }

      console.log('[complete-profile] Success! Store ID:', storeId, 'Role:', role);

      // Refresh profile in context
      await refreshProfile();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[complete-profile] Error:', error);
      Alert.alert('保存失败', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-circle" size={64} color={Colors.primary} />
            </View>
            <Text style={styles.title}>完善您的信息</Text>
            <Text style={styles.subtitle}>请填写以下信息以完成注册</Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>姓名 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="请输入您的姓名"
                placeholderTextColor={Colors.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>手机号</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="请输入手机号（选填）"
                placeholderTextColor={Colors.gray[400]}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>店铺名称 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={storeName}
                onChangeText={setStoreName}
                placeholder="请输入店铺名称"
                placeholderTextColor={Colors.gray[400]}
              />
              <Text style={styles.inputHint}>新店名将创建店铺（成为店长），已有店名将加入该店铺（成为员工）</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>完成注册</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff5f7',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputGroup: {
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
    fontSize: 16,
    color: Colors.gray[900],
  },
  inputHint: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
