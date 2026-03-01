import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const handleClearCache = () => {
    Alert.alert('清除缓存', '确定要清除本地缓存吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: () => {
          // In a real app, you would clear AsyncStorage or other caches here
          Alert.alert('成功', '缓存已清除');
        },
      },
    ]);
  };

  const handleAbout = () => {
    Alert.alert(
      '关于应用',
      `女装库存管理系统\n版本: ${appVersion}\n\n专为服装档口设计的库存管理工具，帮助您轻松管理商品库存、出入库记录。`,
      [{ text: '确定' }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert('隐私政策', '我们重视您的隐私，您的数据仅用于本应用的库存管理功能，不会与第三方共享。', [
      { text: '确定' },
    ]);
  };

  const handleFeedback = () => {
    Alert.alert('意见反馈', '如有问题或建议，请联系我们', [
      { text: '取消', style: 'cancel' },
      {
        text: '发送邮件',
        onPress: () => {
          Linking.openURL('mailto:feedback@example.com?subject=女装库存管理反馈');
        },
      },
    ]);
  };

  const settingsItems = [
    {
      title: '通用',
      items: [
        { icon: 'trash-outline', label: '清除缓存', onPress: handleClearCache },
      ],
    },
    {
      title: '关于',
      items: [
        { icon: 'information-circle-outline', label: '关于应用', onPress: handleAbout, value: `v${appVersion}` },
        { icon: 'shield-checkmark-outline', label: '隐私政策', onPress: handlePrivacy },
        { icon: 'chatbubble-outline', label: '意见反馈', onPress: handleFeedback },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>系统设置</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content}>
        {settingsItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex !== section.items.length - 1 && styles.settingItemBorder,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.settingIcon}>
                    <Ionicons name={item.icon as any} size={20} color={Colors.gray[600]} />
                  </View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.value && <Text style={styles.settingValue}>{item.value}</Text>}
                  <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>女装库存管理系统</Text>
          <Text style={styles.footerVersion}>Version {appVersion}</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 8,
    paddingLeft: 8,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  settingIcon: {
    width: 32,
    marginRight: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.gray[900],
  },
  settingValue: {
    fontSize: 14,
    color: Colors.gray[500],
    marginRight: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: Colors.gray[400],
  },
  footerVersion: {
    fontSize: 12,
    color: Colors.gray[300],
    marginTop: 4,
  },
});
