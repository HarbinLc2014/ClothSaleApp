-- 迁移: 添加视频缩略图字段
-- 日期: 2026-03-02

-- 添加 video_thumbnails 列用于存储视频缩略图 URL（与 video_urls 对应的索引）
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_thumbnails TEXT[];
