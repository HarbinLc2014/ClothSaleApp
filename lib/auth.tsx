import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';
import { Profile, Store } from './types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  store: Store | null;
  loading: boolean;
  needsProfileCompletion: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (phone: string, password: string, name: string, storeName?: string) => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setStore(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Profile might not exist yet (e.g., after Apple sign in)
      if (profileError && profileError.code === 'PGRST116') {
        setProfile(null);
        setStore(null);
        setLoading(false);
        return;
      }

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch store if user has one
      if (profileData?.store_id) {
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', profileData.store_id)
          .single();

        if (!storeError) {
          setStore(storeData);
        }
      } else {
        setStore(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (phone: string, password: string) => {
    try {
      // Supabase uses email for auth, we'll use phone@example.com format
      const email = `${phone}@example.com`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (phone: string, password: string, name: string, storeName?: string) => {
    try {
      const email = `${phone}@example.com`;

      // Sign up user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) return { error: signUpError };
      if (!authData.user) return { error: new Error('注册失败') };

      // Create store first if storeName provided (owner registration)
      let storeId: string | null = null;
      if (storeName) {
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .insert({ name: storeName, owner_id: authData.user.id })
          .select()
          .single();

        if (storeError) return { error: storeError };
        storeId = storeData.id;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name,
          phone,
          role: storeName ? 'owner' : 'staff',
          store_id: storeId,
        });

      if (profileError) return { error: profileError };

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { error: new Error('Apple 登录失败：未获取到身份令牌') };
      }

      // Sign in with Supabase using the Apple identity token
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) return { error };

      // Don't create profile here - let complete-profile screen handle it
      return { error: null };
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return { error: new Error('用户取消了登录') };
      }
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // Clear state immediately to trigger redirect to login
    setSession(null);
    setUser(null);
    setProfile(null);
    setStore(null);
    await supabase.auth.signOut();
  };

  // Check if profile needs completion (Apple sign in doesn't create profile)
  const needsProfileCompletion = !!(user && !profile);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        store,
        loading,
        needsProfileCompletion,
        signIn,
        signUp,
        signInWithApple,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
