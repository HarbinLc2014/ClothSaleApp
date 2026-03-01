import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import {
  Product,
  StockRecord,
  CreateProductInput,
  StockInInput,
  StockOutInput,
  Category,
} from './types';

// Categories Hook
export function useCategories() {
  const { store } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!store?.id) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', store.id)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[useCategories] Fetch error:', error);
        throw error;
      }
      setCategories(data || []);
    } catch (err) {
      console.error('[useCategories] Error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
}

// Products Hook
export function useProducts(categoryId?: string | null) {
  const { store } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!store?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useProducts] Fetch error:', error);
        throw error;
      }
      setProducts(data || []);
    } catch (err) {
      console.error('[useProducts] Error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [store?.id, categoryId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}

// Single Product Hook
export function useProduct(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('[useProduct] Fetch error:', error);
        throw error;
      }
      setProduct(data);
    } catch (err) {
      console.error('[useProduct] Error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return { product, loading, error, refetch: fetchProduct };
}

// Low Stock Products Hook
export function useLowStockProducts() {
  const { store } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLowStock = useCallback(async () => {
    if (!store?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .lt('stock', store.low_stock_threshold || 10)
        .order('stock', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [store?.id, store?.low_stock_threshold]);

  useEffect(() => {
    fetchLowStock();
  }, [fetchLowStock]);

  return { products, loading, error, refetch: fetchLowStock };
}

// Stock Records Hook
export function useStockRecords(filter?: 'all' | 'in' | 'out', productId?: string) {
  const { store } = useAuth();
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecords = useCallback(async () => {
    console.log('[useStockRecords] Fetching records, store:', store?.id, 'filter:', filter);
    if (!store?.id) {
      console.log('[useStockRecords] No store ID, skipping fetch');
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('stock_records')
        .select('*, product:products(*)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      if (filter === 'in') {
        query = query.eq('type', '入库');
      } else if (filter === 'out') {
        query = query.neq('type', '入库');
      }

      const { data, error } = await query;

      console.log('[useStockRecords] Query result:', { count: data?.length, error });
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [store?.id, filter, productId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, loading, error, refetch: fetchRecords };
}

// Dashboard Stats Hook
export function useDashboardStats() {
  const { store } = useAuth();
  const [stats, setStats] = useState({
    totalStock: 0,
    stockInToday: 0,
    stockOutToday: 0,
    totalValue: 0,
  });
  const [recentRecords, setRecentRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!store?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch products for total stats
      const { data: products } = await supabase
        .from('products')
        .select('stock, selling_price')
        .eq('store_id', store.id)
        .eq('is_active', true);

      const totalStock = products?.reduce((sum, p) => sum + p.stock, 0) || 0;
      const totalValue = products?.reduce((sum, p) => sum + (p.stock * p.selling_price), 0) || 0;

      // Fetch today's stats
      const today = new Date().toISOString().split('T')[0];
      const { data: todayRecords } = await supabase
        .from('stock_records')
        .select('type, quantity')
        .eq('store_id', store.id)
        .gte('created_at', today);

      const stockInToday = todayRecords
        ?.filter(r => r.type === '入库')
        .reduce((sum, r) => sum + r.quantity, 0) || 0;

      const stockOutToday = todayRecords
        ?.filter(r => r.type !== '入库')
        .reduce((sum, r) => sum + r.quantity, 0) || 0;

      setStats({ totalStock, stockInToday, stockOutToday, totalValue });

      // Fetch recent records
      const { data: recent } = await supabase
        .from('stock_records')
        .select('*, product:products(name, style_no)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentRecords(recent || []);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, recentRecords, loading, refetch: fetchStats };
}

// Product Mutations
export function useProductMutations() {
  const { store, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const createProduct = async (input: CreateProductInput): Promise<{ data: Product | null; error: Error | null }> => {
    if (!store?.id) return { data: null, error: new Error('未找到店铺') };
    if (!profile) return { data: null, error: new Error('未找到用户信息') };

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...input,
          store_id: store.id,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[createProduct] Product created:', data?.id, 'stock:', input.stock);

      // Create stock record for initial stock
      if (data && input.stock && input.stock > 0) {
        console.log('[createProduct] Creating stock record for product:', data.id);
        const { error: recordError } = await supabase
          .from('stock_records')
          .insert({
            store_id: store.id,
            product_id: data.id,
            type: '入库',
            quantity: input.stock,
            unit_price: input.cost_price || 0,
            total_amount: input.stock * (input.cost_price || 0),
            stock_before: 0,
            stock_after: input.stock,
            operator_id: profile.id,
            operator_name: profile.name,
            note: '新品入库',
          });

        if (recordError) {
          console.error('[createProduct] Failed to create stock record:', recordError);
        } else {
          console.log('[createProduct] Stock record created successfully');
        }
      }

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (productId: string, updates: Partial<CreateProductInput>): Promise<{ error: Error | null }> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  const stockIn = async (input: StockInInput): Promise<{ error: Error | null }> => {
    if (!store?.id || !profile) return { error: new Error('未找到店铺或用户') };

    try {
      setLoading(true);

      // Get current product stock
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', input.product_id)
        .single();

      if (fetchError) throw fetchError;

      const stockBefore = product.stock;
      const stockAfter = stockBefore + input.quantity;

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: stockAfter })
        .eq('id', input.product_id);

      if (updateError) throw updateError;

      // Create stock record
      const { error: recordError } = await supabase
        .from('stock_records')
        .insert({
          store_id: store.id,
          product_id: input.product_id,
          type: '入库',
          quantity: input.quantity,
          unit_price: input.unit_price,
          total_amount: input.quantity * input.unit_price,
          stock_before: stockBefore,
          stock_after: stockAfter,
          operator_id: profile.id,
          operator_name: profile.name,
          note: input.note,
        });

      if (recordError) throw recordError;

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  const stockOut = async (input: StockOutInput): Promise<{ error: Error | null }> => {
    if (!store?.id || !profile) return { error: new Error('未找到店铺或用户') };

    try {
      setLoading(true);

      // Get current product stock
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', input.product_id)
        .single();

      if (fetchError) throw fetchError;

      const stockBefore = product.stock;
      if (stockBefore < input.quantity) {
        throw new Error(`库存不足！当前库存: ${stockBefore} 件`);
      }

      const stockAfter = stockBefore - input.quantity;

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: stockAfter })
        .eq('id', input.product_id);

      if (updateError) throw updateError;

      // Create stock record
      const { error: recordError } = await supabase
        .from('stock_records')
        .insert({
          store_id: store.id,
          product_id: input.product_id,
          type: input.type,
          quantity: input.quantity,
          unit_price: input.unit_price,
          total_amount: input.quantity * input.unit_price,
          stock_before: stockBefore,
          stock_after: stockAfter,
          operator_id: profile.id,
          operator_name: profile.name,
          note: input.note,
        });

      if (recordError) throw recordError;

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createProduct, updateProduct, stockIn, stockOut, loading };
}
