-- 迁移: 添加商品年份字段
-- 日期: 2026-03-02

-- 添加年份列到商品表
ALTER TABLE products ADD COLUMN IF NOT EXISTS year INTEGER;

-- 移除款号唯一约束（允许同款不同尺码颜色）
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_store_id_style_no_key;
