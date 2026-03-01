import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth';


const menuSections = [
  {
    title: '店铺管理',
    items: [
      { icon: 'storefront', label: '店铺信息', path: '/store-info', badge: null },
      { icon: 'people', label: '员工管理', path: '/staff', badge: null, ownerOnly: true },
      { icon: 'pricetags', label: '类别管理', path: '/categories', badge: null },
      { icon: 'notifications', label: '库存阈值设置', path: '/threshold', badge: null },
    ],
  },
  {
    title: '个人信息',
    items: [
      { icon: 'person', label: '我的资料', path: '/my-info', badge: null },
      { icon: 'document-text', label: '我的操作记录', path: '/my-records', badge: null },
    ],
  },
  {
    title: '系统设置',
    items: [
      { icon: 'settings', label: '系统设置', path: '/settings', badge: null },
    ],
  },
];

export default function ProfileScreen() {
  const { profile, store, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('确认退出', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>我的</Text>

          {/* User Card */}
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color={Colors.white} />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{profile?.name || '用户'}</Text>
                <View style={styles.userMeta}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{profile?.role === 'owner' ? '店长' : '员工'}</Text>
                  </View>
                  {profile?.phone ? (
                    <Text style={styles.userPhone}>{profile.phone}</Text>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </View>

            <View style={styles.userStats}>
              <View style={styles.userStatItem}>
                <Text style={styles.userStatLabel}>所属店铺</Text>
                <Text style={styles.userStatValue}>{store?.name || '未加入店铺'}</Text>
              </View>
              <View style={styles.userStatItem}>
                <Text style={styles.userStatLabel}>加入时间</Text>
                <Text style={styles.userStatValue}>
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuContainer}>
          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>{section.title}</Text>
              <View style={styles.menuCard}>
                {section.items.map((item, itemIndex) => {
                  const isOwnerOnly = item.ownerOnly && profile?.role !== 'owner';
                  if (isOwnerOnly) return null;

                  return (
                    <TouchableOpacity
                      key={itemIndex}
                      style={[
                        styles.menuItem,
                        itemIndex !== section.items.length - 1 && styles.menuItemBorder,
                      ]}
                      onPress={() => router.push(item.path as any)}
                    >
                      <View style={styles.menuItemIcon}>
                        <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
                      </View>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                      {item.badge && <Text style={styles.menuItemBadge}>{item.badge}</Text>}
                      <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Logout Button */}
          <View style={styles.logoutCard}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.red} />
              <Text style={styles.logoutText}>退出登录</Text>
            </TouchableOpacity>
          </View>

          {/* Version Info */}
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>女装库存管理系统 v1.0.0</Text>
            <Text style={styles.copyrightText}>© 2026 版权所有</Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 20,
  },
  userCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 12,
    color: Colors.white,
  },
  userPhone: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  userStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 12,
  },
  userStatItem: {
    flex: 1,
  },
  userStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  userStatValue: {
    fontSize: 13,
    color: Colors.white,
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  menuSection: {
    marginBottom: 20,
  },
  menuSectionTitle: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 8,
    paddingLeft: 8,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(236, 64, 122, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.gray[900],
  },
  menuItemBadge: {
    fontSize: 13,
    color: Colors.gray[500],
    marginRight: 8,
  },
  logoutCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    color: Colors.red,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
    color: Colors.gray[400],
  },
  copyrightText: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 4,
  },
});
