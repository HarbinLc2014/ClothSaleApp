// Database Types for Supabase

export type ProductSeason = '春' | '夏' | '秋' | '冬' | '四季';
export type ProductSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'F';

export interface Category {
  id: string;
  store_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}
export type StockRecordType = '入库' | '零售售出' | '批发拿货' | '调货' | '退货' | '盘亏' | '盘盈';
export type UserRole = 'owner' | 'staff';

export interface Profile {
  id: string;
  name: string;
  phone: string | null;
  role: UserRole;
  store_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  name: string;
  owner_id: string | null;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  style_no: string;
  name: string;
  category_id: string | null;
  category?: Category;
  season: ProductSeason;
  size: string | null;
  color: string | null;
  cost_price: number;
  selling_price: number;
  stock: number;
  low_stock_threshold: number;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockRecord {
  id: string;
  store_id: string;
  product_id: string;
  type: StockRecordType;
  quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  stock_before: number;
  stock_after: number;
  operator_id: string | null;
  operator_name: string | null;
  note: string | null;
  created_at: string;
  // Joined fields
  product?: Product;
}

export interface DailyStats {
  store_id: string;
  stock_in_qty: number;
  stock_out_qty: number;
  sales_amount: number;
}

// Input types for creating/updating
export interface CreateProductInput {
  style_no: string;
  name: string;
  category_id?: string;
  season?: ProductSeason;
  size?: string;
  color?: string;
  cost_price: number;
  selling_price: number;
  stock?: number;
  low_stock_threshold?: number;
  image_url?: string;
  description?: string;
}

export interface StockInInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  note?: string;
}

export interface StockOutInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  type: Exclude<StockRecordType, '入库'>;
  note?: string;
}

// Auth types
export interface LoginInput {
  phone: string;
  password: string;
}

export interface SignUpInput {
  phone: string;
  password: string;
  name: string;
  store_name?: string;
}
