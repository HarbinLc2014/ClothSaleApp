-- 迁移: 添加商品多图片/多视频字段
-- 日期: 2026-03-02

-- 添加图片URLs数组列到商品表
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- 添加视频URLs数组列到商品表
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_urls TEXT[];

-- 迁移现有单图片数据到数组 (如果有的话)
UPDATE products
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND image_urls IS NULL;

-- 迁移现有单视频数据到数组 (如果有的话)
UPDATE products
SET video_urls = ARRAY[video_url]
WHERE video_url IS NOT NULL AND video_urls IS NULL;
