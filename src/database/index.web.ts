// Stub cho Web - trên Web ta sẽ dùng API Supabase trực tiếp
// Đây là file shim thay thế expo-sqlite vì thư viện đó không tương tác được trên browser

export const getDB = () => {
    return {
        execSync: () => {},
        getAllSync: () => [],
        runSync: () => ({ lastInsertRowId: 0, changes: 0 }),
        getFirstSync: () => null,
    };
};

export const initDB = () => {
    console.log('✅ Web DB stub initialized (Web uses Supabase directly).');
};
