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

export default function MyInfoScreen() {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '姓名不能为空');
      return;
    }

    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          phone: phone.trim(),
        })
        .eq('id', profile.id);

      if (error) {
        console.error('[my-info] Update error:', error);
        throw error;
      }

      await refreshProfile();
      setEditing(false);
      Alert.alert('成功', '个人信息已更新');
    } catch (error: any) {
      console.error('[my-info] Error:', error);
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
        <Text style={styles.headerTitle}>我的资料</Text>
        {!editing ? (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>编辑</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(false)}>
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={Colors.white} />
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {profile?.role === 'owner' ? '店长' : '员工'}
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>姓名</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="请输入姓名"
                placeholderTextColor={Colors.gray[400]}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.name || '-'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>手机号</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="请输入手机号"
                placeholderTextColor={Colors.gray[400]}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.phone || '-'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>用户ID</Text>
            <Text style={styles.fieldValueSmall}>{profile?.id || '-'}</Text>
          </View>

          <View style={[styles.field, { borderBottomWidth: 0 }]}>
            <Text style={styles.fieldLabel}>注册时间</Text>
            <Text style={styles.fieldValue}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('zh-CN')
                : '-'}
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: 'rgba(236, 64, 122, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
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
});
