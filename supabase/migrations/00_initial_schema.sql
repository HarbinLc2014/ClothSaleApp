-- 女装库存管理系统 数据库架构
-- 在 Supabase SQL Editor 中运行此脚本
-- 注意: 此脚本完全开放权限，仅用于开发测试

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 删除已存在的表 (如果存在)
DROP TABLE IF EXISTS stock_records CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 删除已存在的类型 (如果存在)
DROP TYPE IF EXISTS product_category CASCADE;
DROP TYPE IF EXISTS product_season CASCADE;
DROP TYPE IF EXISTS stock_record_type CASCADE;

-- 用户表 (扩展 Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
  store_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 店铺表
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID,
  low_stock_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 更新 profiles 表添加外键
ALTER TABLE profiles
ADD CONSTRAINT fk_store
FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

-- 更新 stores 表添加外键
ALTER TABLE stores
ADD CONSTRAINT fk_owner
FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 商品分类表 (可自定义)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, name)
);

-- 季节枚举
CREATE TYPE product_season AS ENUM ('春', '夏', '秋', '冬', '四季');

-- 商品表
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  style_no TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  year INTEGER,
  season product_season DEFAULT '四季',
  size TEXT,
  color TEXT,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 出入库类型枚举
CREATE TYPE stock_record_type AS ENUM ('入库', '零售售出', '批发拿货', '调货', '退货', '盘亏', '盘盈');

-- 出入库记录表
CREATE TABLE stock_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type stock_record_type NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  operator_id UUID REFERENCES profiles(id),
  operator_name TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_style_no ON products(style_no);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_stock_records_store ON stock_records(store_id);
CREATE INDEX idx_stock_records_product ON stock_records(product_id);
CREATE INDEX idx_stock_records_created ON stock_records(created_at DESC);
CREATE INDEX idx_stock_records_type ON stock_records(type);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- RLS 策略 - 完全开放权限
-- ========================================

-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_records ENABLE ROW LEVEL SECURITY;

-- Profiles - 完全开放
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_all" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_all" ON profiles FOR UPDATE USING (true);
CREATE POLICY "profiles_delete_all" ON profiles FOR DELETE USING (true);

-- Stores - 完全开放
CREATE POLICY "stores_select_all" ON stores FOR SELECT USING (true);
CREATE POLICY "stores_insert_all" ON stores FOR INSERT WITH CHECK (true);
CREATE POLICY "stores_update_all" ON stores FOR UPDATE USING (true);
CREATE POLICY "stores_delete_all" ON stores FOR DELETE USING (true);

-- Categories - 完全开放
CREATE POLICY "categories_select_all" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_all" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "categories_update_all" ON categories FOR UPDATE USING (true);
CREATE POLICY "categories_delete_all" ON categories FOR DELETE USING (true);

-- Products - 完全开放
CREATE POLICY "products_select_all" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_all" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "products_update_all" ON products FOR UPDATE USING (true);
CREATE POLICY "products_delete_all" ON products FOR DELETE USING (true);

-- Stock Records - 完全开放
CREATE POLICY "stock_records_select_all" ON stock_records FOR SELECT USING (true);
CREATE POLICY "stock_records_insert_all" ON stock_records FOR INSERT WITH CHECK (true);
CREATE POLICY "stock_records_update_all" ON stock_records FOR UPDATE USING (true);
CREATE POLICY "stock_records_delete_all" ON stock_records FOR DELETE USING (true);

-- ========================================
-- 辅助函数
-- ========================================

-- 入库函数 (自动更新库存)
CREATE OR REPLACE FUNCTION stock_in(
  p_store_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_unit_price DECIMAL,
  p_operator_id UUID,
  p_operator_name TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_stock_before INTEGER;
  v_stock_after INTEGER;
  v_record_id UUID;
BEGIN
  -- 获取当前库存
  SELECT stock INTO v_stock_before FROM products WHERE id = p_product_id;
  v_stock_after := v_stock_before + p_quantity;

  -- 更新商品库存
  UPDATE products SET stock = v_stock_after WHERE id = p_product_id;

  -- 插入记录
  INSERT INTO stock_records (
    store_id, product_id, type, quantity, unit_price, total_amount,
    stock_before, stock_after, operator_id, operator_name, note
  ) VALUES (
    p_store_id, p_product_id, '入库', p_quantity, p_unit_price, p_quantity * p_unit_price,
    v_stock_before, v_stock_after, p_operator_id, p_operator_name, p_note
  ) RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 出库函数 (自动更新库存，检查库存)
CREATE OR REPLACE FUNCTION stock_out(
  p_store_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_unit_price DECIMAL,
  p_type stock_record_type,
  p_operator_id UUID,
  p_operator_name TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_stock_before INTEGER;
  v_stock_after INTEGER;
  v_record_id UUID;
BEGIN
  -- 获取当前库存
  SELECT stock INTO v_stock_before FROM products WHERE id = p_product_id;

  -- 检查库存是否足够
  IF v_stock_before < p_quantity THEN
    RAISE EXCEPTION '库存不足，当前库存: %, 需要: %', v_stock_before, p_quantity;
  END IF;

  v_stock_after := v_stock_before - p_quantity;

  -- 更新商品库存
  UPDATE products SET stock = v_stock_after WHERE id = p_product_id;

  -- 插入记录
  INSERT INTO stock_records (
    store_id, product_id, type, quantity, unit_price, total_amount,
    stock_before, stock_after, operator_id, operator_name, note
  ) VALUES (
    p_store_id, p_product_id, p_type, p_quantity, p_unit_price, p_quantity * p_unit_price,
    v_stock_before, v_stock_after, p_operator_id, p_operator_name, p_note
  ) RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 统计视图：今日统计
CREATE OR REPLACE VIEW daily_stats AS
SELECT
  store_id,
  COALESCE(SUM(CASE WHEN type = '入库' THEN quantity ELSE 0 END), 0) as stock_in_qty,
  COALESCE(SUM(CASE WHEN type != '入库' THEN quantity ELSE 0 END), 0) as stock_out_qty,
  COALESCE(SUM(CASE WHEN type != '入库' THEN total_amount ELSE 0 END), 0) as sales_amount
FROM stock_records
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY store_id;

-- 创建默认分类的函数
CREATE OR REPLACE FUNCTION create_default_categories(p_store_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO categories (store_id, name, sort_order) VALUES
  (p_store_id, '连衣裙', 1),
  (p_store_id, '上衣', 2),
  (p_store_id, '裤子', 3),
  (p_store_id, '裙子', 4),
  (p_store_id, '外套', 5),
  (p_store_id, '其他', 99)
  ON CONFLICT (store_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 插入测试数据的函数
CREATE OR REPLACE FUNCTION insert_demo_data(p_store_id UUID)
RETURNS void AS $$
DECLARE
  v_cat_dress UUID;
  v_cat_top UUID;
  v_cat_pants UUID;
  v_cat_skirt UUID;
BEGIN
  -- 先创建默认分类
  PERFORM create_default_categories(p_store_id);

  -- 获取分类ID
  SELECT id INTO v_cat_dress FROM categories WHERE store_id = p_store_id AND name = '连衣裙';
  SELECT id INTO v_cat_top FROM categories WHERE store_id = p_store_id AND name = '上衣';
  SELECT id INTO v_cat_pants FROM categories WHERE store_id = p_store_id AND name = '裤子';
  SELECT id INTO v_cat_skirt FROM categories WHERE store_id = p_store_id AND name = '裙子';

  -- 插入示例商品
  INSERT INTO products (store_id, style_no, name, category_id, season, size, color, cost_price, selling_price, stock, image_url) VALUES
  (p_store_id, 'CQ2024001', '春季新款连衣裙', v_cat_dress, '春', 'M', '粉色', 180, 299, 25, 'https://images.unsplash.com/photo-1711516141938-cc5917435dcd?w=400'),
  (p_store_id, 'SY2024015', 'V领雪纺衫', v_cat_top, '夏', 'L', '白色', 95, 159, 3, 'https://images.unsplash.com/photo-1761121317492-57feee4fc674?w=400'),
  (p_store_id, 'NZ2024008', '高腰牛仔裤', v_cat_pants, '四季', 'S', '深蓝', 120, 198, 15, 'https://images.unsplash.com/photo-1762343290960-74b50d205fb8?w=400'),
  (p_store_id, 'QZ2024005', 'A字半身裙', v_cat_skirt, '春', 'M', '黑色', 105, 179, 2, 'https://images.unsplash.com/photo-1653419403196-ab64c4c740c3?w=400'),
  (p_store_id, 'CQ2024010', '优雅碎花长裙', v_cat_dress, '春', 'L', '碎花', 195, 329, 18, 'https://images.unsplash.com/photo-1711516141938-cc5917435dcd?w=400');
END;
$$ LANGUAGE plpgsql;
