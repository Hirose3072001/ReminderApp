-- SQL Script cập nhật bản vá (Đã sửa lỗi Primary Key)
-- Run this in your Supabase Dashboard SQL Editor

-- 1. Xử lý bảng reminders
DELETE FROM reminders
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY "updatedAt" DESC) as row_num FROM reminders
    ) t WHERE t.row_num > 1
);

-- Chỉ thêm Primary Key cho reminders nếu chưa có bất kỳ PK nào
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'reminders' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE reminders ADD PRIMARY KEY (id);
    ELSE
        RAISE NOTICE 'Table reminders already has a primary key, skipping.';
    END IF;
END $$;

-- 2. Xử lý bảng notifications
DELETE FROM notifications
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY timestamp DESC) as row_num FROM notifications
    ) t WHERE t.row_num > 1
);

-- Chỉ thêm Primary Key cho notifications nếu chưa có bất kỳ PK nào
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'notifications' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE notifications ADD PRIMARY KEY (id);
    ELSE
        RAISE NOTICE 'Table notifications already has a primary key, skipping.';
    END IF;
END $$;

-- 3. Đảm bảo RLS enabled
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. Thông báo hoàn tất
SELECT 'Database constraints checked and fixed successfully.' as status;
