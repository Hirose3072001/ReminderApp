// Stub cho Web
// Trên web, ta kết nối trực tiếp với Supabase thông qua web version của store 
// (e.g. useReminderStore.web.ts). Không cần đồng bộ SQLite <-> Supabase.

export const syncService = {
    addListener: () => {},
    notifyListeners: () => {},
    markDirty: () => {},
    startAutoSync: () => {},
    stopAutoSync: () => {},
    pushLocalChanges: async () => {},
    pullRemoteChanges: async () => {},
    performFullSync: async () => {},
    startRealtimeSync: () => {},
    stopRealtimeSync: () => {},
    cleanupOrphanLocalNotifications: () => {},
    clearSyncMetadata: async () => {},
};
