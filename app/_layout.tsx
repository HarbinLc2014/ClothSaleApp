import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Colors } from '@/constants/Colors';

function RootLayoutNav() {
  const { session, loading, needsProfileCompletion } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';
    const inCompleteProfile = segments[0] === 'complete-profile';

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (session && needsProfileCompletion && !inCompleteProfile) {
      // Redirect to complete profile if profile is incomplete
      router.replace('/complete-profile');
    } else if (session && !needsProfileCompletion && (inAuthGroup || inCompleteProfile)) {
      // Redirect to home if authenticated and profile is complete
      router.replace('/(tabs)');
    }
  }, [session, loading, needsProfileCompletion, segments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="complete-profile" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="stock-out" options={{ presentation: 'card' }} />
        <Stack.Screen name="low-stock" options={{ presentation: 'card' }} />
        <Stack.Screen name="store-info" options={{ presentation: 'card' }} />
        <Stack.Screen name="staff" options={{ presentation: 'card' }} />
        <Stack.Screen name="threshold" options={{ presentation: 'card' }} />
        <Stack.Screen name="my-info" options={{ presentation: 'card' }} />
        <Stack.Screen name="my-records" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="categories" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
