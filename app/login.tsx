import { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { signIn, signUp, signInWithApple } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // Register form state
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
  }, []);

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const { error } = await signInWithApple();
    setAppleLoading(false);

    if (error && error.message !== '用户取消了登录') {
      Alert.alert('登录失败', error.message);
    }
  };

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('提示', '请输入手机号和密码');
      return;
    }

    setLoading(true);
    const { error } = await signIn(phone.trim(), password);
    setLoading(false);

    if (error) {
      Alert.alert('登录失败', error.message || '请检查手机号和密码');
    }
  };

  const handleRegister = async () => {
    if (!registerPhone.trim() || !registerPassword.trim() || !registerName.trim()) {
      Alert.alert('提示', '请填写手机号、密码和姓名');
      return;
    }

    if (registerPassword.length < 6) {
      Alert.alert('提示', '密码至少需要6个字符');
      return;
    }

    setRegisterLoading(true);
    const { error } = await signUp(
      registerPhone.trim(),
      registerPassword,
      registerName.trim(),
      storeName.trim() || undefined
    );
    setRegisterLoading(false);

    if (error) {
      Alert.alert('注册失败', error.message);
    } else {
      Alert.alert('注册成功', '请使用手机号和密码登录', [
        { text: '确定', onPress: () => setShowRegister(false) }
      ]);
      setRegisterPhone('');
      setRegisterPassword('');
      setRegisterName('');
      setStoreName('');
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
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <Ionicons name="storefront" size={32} color={Colors.white} />
            </View>
            <Text style={styles.title}>女装库存管理</Text>
            <Text style={styles.subtitle}>轻松管理您的服装档口</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>手机号</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="请输入手机号"
                placeholderTextColor={Colors.gray[400]}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>密码</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="请输入密码"
                placeholderTextColor={Colors.gray[400]}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>登录</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => setShowRegister(true)}
            >
              <Text style={styles.registerLinkText}>没有账号？点击注册</Text>
            </TouchableOpacity>

            {/* Divider */}
            {appleAuthAvailable && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>或</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Apple Sign In Button */}
                {appleLoading ? (
                  <View style={styles.appleButtonLoading}>
                    <ActivityIndicator color={Colors.white} />
                  </View>
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={12}
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                  />
                )}
              </>
            )}
          </View>
        </View>

        <Text style={styles.version}>女装库存管理系统 v1.0</Text>
      </ScrollView>

      {/* Register Modal */}
      <Modal visible={showRegister} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRegister(false)}>
              <Ionicons name="close" size={28} color={Colors.gray[900]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>注册账号</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>手机号 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={registerPhone}
                onChangeText={setRegisterPhone}
                placeholder="请输入手机号"
                placeholderTextColor={Colors.gray[400]}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>密码 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={registerPassword}
                onChangeText={setRegisterPassword}
                placeholder="请输入密码（至少6位）"
                placeholderTextColor={Colors.gray[400]}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>姓名 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={registerName}
                onChangeText={setRegisterName}
                placeholder="请输入您的姓名"
                placeholderTextColor={Colors.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>店铺名称</Text>
              <TextInput
                style={styles.input}
                value={storeName}
                onChangeText={setStoreName}
                placeholder="填写则创建新店铺（成为店长）"
                placeholderTextColor={Colors.gray[400]}
              />
              <Text style={styles.inputHint}>如果您要加入已有店铺，请留空</Text>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, registerLoading && styles.loginButtonDisabled]}
              onPress={handleRegister}
              disabled={registerLoading}
            >
              {registerLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>注册</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 64,
    height: 64,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  registerLinkText: {
    color: Colors.primary,
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray[200],
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.gray[400],
    fontSize: 14,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  appleButtonLoading: {
    width: '100%',
    height: 50,
    backgroundColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  version: {
    textAlign: 'center',
    color: Colors.gray[400],
    fontSize: 12,
    paddingVertical: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
});
