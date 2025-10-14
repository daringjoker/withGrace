import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SyncStatus {
  lastSync: number;
  pendingChanges: number;
  isOnline: boolean;
  syncInProgress: boolean;
}

interface CacheState {
  syncStatus: SyncStatus;
  offlineActions: Array<{
    id: string;
    type: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
  }>;
}

const initialState: CacheState = {
  syncStatus: {
    lastSync: 0,
    pendingChanges: 0,
    isOnline: true, // Always start as online to prevent hydration issues
    syncInProgress: false,
  },
  offlineActions: [],
};

export const cacheSlice = createSlice({
  name: 'cache',
  initialState,
  reducers: {
    updateSyncStatus: (state, action: PayloadAction<Partial<SyncStatus>>) => {
      state.syncStatus = { ...state.syncStatus, ...action.payload };
    },
    
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.syncStatus.isOnline = action.payload;
      
      // When coming back online, trigger sync if there are pending changes
      if (action.payload && state.offlineActions.length > 0) {
        state.syncStatus.syncInProgress = true;
      }
    },
    
    addOfflineAction: (state, action: PayloadAction<{
      type: 'create' | 'update' | 'delete';
      data: any;
    }>) => {
      const offlineAction = {
        id: `offline-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        ...action.payload,
      };
      
      state.offlineActions.push(offlineAction);
      state.syncStatus.pendingChanges = state.offlineActions.length;
    },
    
    removeOfflineAction: (state, action: PayloadAction<string>) => {
      state.offlineActions = state.offlineActions.filter(
        item => item.id !== action.payload
      );
      state.syncStatus.pendingChanges = state.offlineActions.length;
    },
    
    clearOfflineActions: (state) => {
      state.offlineActions = [];
      state.syncStatus.pendingChanges = 0;
      state.syncStatus.syncInProgress = false;
      state.syncStatus.lastSync = Date.now();
    },
    
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncStatus.syncInProgress = action.payload;
    },
  },
});

export const {
  updateSyncStatus,
  setOnlineStatus,
  addOfflineAction,
  removeOfflineAction,
  clearOfflineActions,
  setSyncInProgress,
} = cacheSlice.actions;

export default cacheSlice.reducer;