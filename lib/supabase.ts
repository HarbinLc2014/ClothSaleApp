import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';

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

// Media upload helper for Supabase Storage (images and videos)
export const uploadProductMedia = async (
  uri: string,
  storeId: string,
  mediaType: 'image' | 'video' = 'image'
): Promise<{ url: string | null; error: Error | null }> => {
  try {
    console.log('[uploadProductMedia] Starting upload for:', uri);

    // Normalize URI - ensure it has file:// prefix for local files
    let fileUri = uri;
    if (!uri.startsWith('file://') && !uri.startsWith('http')) {
      fileUri = `file://${uri}`;
    }

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      console.error('[uploadProductMedia] File does not exist:', fileUri);
      return { url: null, error: new Error('File does not exist') };
    }

    console.log('[uploadProductMedia] File info:', fileInfo);

    // Generate a unique file name (no Chinese characters - use only alphanumeric)
    const fileExt = uri.split('.').pop()?.toLowerCase() || (mediaType === 'video' ? 'mp4' : 'jpg');
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const filePath = `${storeId}/${uniqueName}.${fileExt}`;

    // Determine content type
    let contentType: string;
    if (mediaType === 'video') {
      contentType = `video/${fileExt === 'mov' ? 'quicktime' : fileExt}`;
    } else {
      contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
    }

    // Read file as base64 using expo-file-system
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64Data) {
      console.error('[uploadProductMedia] Failed to read file as base64');
      return { url: null, error: new Error('Failed to read file') };
    }

    console.log('[uploadProductMedia] Base64 data length:', base64Data.length);

    // Convert base64 to ArrayBuffer for Supabase upload
    const arrayBuffer = decode(base64Data);

    console.log('[uploadProductMedia] Uploading to path:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('[uploadProductMedia] Upload error:', error);
      return { url: null, error };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    console.log('[uploadProductMedia] Success! URL:', publicUrlData.publicUrl);

    return { url: publicUrlData.publicUrl, error: null };
  } catch (err) {
    console.error('[uploadProductMedia] Error:', err);
    return { url: null, error: err as Error };
  }
};

// Backward compatible alias
export const uploadProductImage = uploadProductMedia;
