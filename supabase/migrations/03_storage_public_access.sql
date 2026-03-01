-- 迁移: 开放 product-images bucket 的所有权限
-- 日期: 2026-03-02

-- 允许所有用户上传文件到 product-images bucket
CREATE POLICY "Allow public upload to product-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-images');

-- 允许所有用户更新 product-images bucket 中的文件
CREATE POLICY "Allow public update in product-images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- 允许所有用户删除 product-images bucket 中的文件
CREATE POLICY "Allow public delete in product-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'product-images');

-- 允许所有用户读取 product-images bucket 中的文件
CREATE POLICY "Allow public read from product-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');
