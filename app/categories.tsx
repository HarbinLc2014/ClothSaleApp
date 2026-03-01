import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Category } from '@/lib/types';

export default function CategoriesScreen() {
  const { store } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [store]);

  const fetchCategories = async () => {
    if (!store) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', store.id)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[categories] Fetch error:', error);
        throw error;
      }

      setCategories(data || []);
    } catch (error: any) {
      console.error('[categories] Error:', error);
      Alert.alert('加载失败', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('提示', '请输入类别名称');
      return;
    }

    if (!store) return;

    setSaving(true);
    try {
      const maxOrder = categories.length > 0
        ? Math.max(...categories.map(c => c.sort_order))
        : 0;

      const { error } = await supabase
        .from('categories')
        .insert({
          store_id: store.id,
          name: newCategoryName.trim(),
          sort_order: maxOrder + 1,
        });

      if (error) {
        console.error('[categories] Insert error:', error);
        throw error;
      }

      setNewCategoryName('');
      setShowAddModal(false);
      fetchCategories();
    } catch (error: any) {
      console.error('[categories] Error:', error);
      if (error.code === '23505') {
        Alert.alert('添加失败', '该类别已存在');
      } else {
        Alert.alert('添加失败', error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) {
      Alert.alert('提示', '请输入类别名称');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: newCategoryName.trim() })
        .eq('id', editingCategory.id);

      if (error) {
        console.error('[categories] Update error:', error);
        throw error;
      }

      setNewCategoryName('');
      setEditingCategory(null);
      setShowAddModal(false);
      fetchCategories();
    } catch (error: any) {
      console.error('[categories] Error:', error);
      if (error.code === '23505') {
        Alert.alert('更新失败', '该类别已存在');
      } else {
        Alert.alert('更新失败', error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      '确认删除',
      `确定要删除类别"${category.name}"吗？\n删除后该类别下的商品将变为无分类。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', category.id);

              if (error) {
                console.error('[categories] Delete error:', error);
                throw error;
              }

              fetchCategories();
            } catch (error: any) {
              console.error('[categories] Error:', error);
              Alert.alert('删除失败', error.message);
            }
          },
        },
      ]
    );
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingCategory(null);
    setNewCategoryName('');
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryItem}>
      <View style={styles.categoryIcon}>
        <Ionicons name="pricetag" size={20} color={Colors.primary} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => openEditModal(item)}
      >
        <Ionicons name="pencil" size={18} color={Colors.gray[500]} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteCategory(item)}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.red} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>类别管理</Text>
        <TouchableOpacity
          style={styles.addHeaderButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={48} color={Colors.gray[300]} />
              <Text style={styles.emptyText}>暂无类别</Text>
              <Text style={styles.emptyHint}>点击右上角添加类别</Text>
            </View>
          }
          ListHeaderComponent={
            categories.length > 0 ? (
              <View style={styles.statsCard}>
                <Text style={styles.statsText}>共 {categories.length} 个类别</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? '编辑类别' : '添加类别'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={Colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="请输入类别名称"
              placeholderTextColor={Colors.gray[400]}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.modalButton, saving && styles.modalButtonDisabled]}
              onPress={editingCategory ? handleUpdateCategory : handleAddCategory}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.modalButtonText}>
                  {editingCategory ? '保存' : '添加'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addHeaderButton: {
    padding: 4,
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
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(236, 64, 122, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    color: Colors.gray[900],
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
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
  emptyHint: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.gray[300],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  modalInput: {
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.gray[900],
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
