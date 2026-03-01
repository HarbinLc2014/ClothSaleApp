import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = 'https://ahfgjdiltzatewzipicl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZmdqZGlsdHphdGV3emlwaWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzM2MDcsImV4cCI6MjA4NzkwOTYwN30.ZJbuscD0JRpL7b-q54KtklllK9F7mXSkMN5yd8nbIXg';

// Custom storage adapter for React Native
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Image upload helper for Supabase Storage
export const uploadProductImage = async (
  uri: string,
  storeId: string,
  fileName?: string
): Promise<{ url: string | null; error: Error | null }> => {
  try {
    // Fetch the image as a blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Generate a unique file name
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueName = fileName || `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const filePath = `${storeId}/${uniqueName}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, blob, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: false,
      });

    if (error) {
      console.error('[uploadProductImage] Upload error:', error);
      return { url: null, error };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    return { url: publicUrlData.publicUrl, error: null };
  } catch (err) {
    console.error('[uploadProductImage] Error:', err);
    return { url: null, error: err as Error };
  }
};
