// Local storage cache manager for offline-first data handling
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  lastSync: number;
  version: number;
}

interface SyncStatus {
  lastSync: number;
  pendingChanges: number;
  isOnline: boolean;
  syncInProgress: boolean;
}

class LocalCacheManager {
  private readonly CACHE_PREFIX = 'withGrace-cache-';
  private readonly SYNC_STATUS_KEY = 'withGrace-sync-status';
  private syncStatus: SyncStatus = {
    lastSync: 0,
    pendingChanges: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    syncInProgress: false,
  };
  
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Load sync status from storage
    this.loadSyncStatus();
    
    // Set correct online status if on client
    if (typeof navigator !== 'undefined') {
      this.syncStatus.isOnline = navigator.onLine;
    }
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncStatus.isOnline = true;
        this.triggerBackgroundSync();
      });
      
      window.addEventListener('offline', () => {
        this.syncStatus.isOnline = false;
        this.saveSyncStatus();
      });
    }
  }

  // Get cached data with staleness check
  get<T>(key: string, maxAge: number = 1000 * 60 * 5): CacheEntry<T> | null {
    try {
      const cached = localStorage.getItem(this.CACHE_PREFIX + key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      
      // Return data even if stale - we'll sync in background
      if (now - entry.timestamp <= maxAge * 4) { // 4x grace period
        return entry;
      }
      
      return null;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }

  // Set cached data with automatic versioning
  set<T>(key: string, data: T, syncPending: boolean = false): void {
    try {
      const now = Date.now();
      const existing = this.get<T>(key);
      
      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        lastSync: syncPending ? (existing?.lastSync || 0) : now,
        version: (existing?.version || 0) + 1,
      };

      localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(entry));
      
      if (syncPending) {
        this.syncStatus.pendingChanges++;
        this.saveSyncStatus();
      }
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  // Remove cached data
  remove(key: string): void {
    try {
      localStorage.removeItem(this.CACHE_PREFIX + key);
    } catch (error) {
      console.warn('Cache remove error:', error);
    }
  }

  // Clear all cached data
  clear(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      );
      keys.forEach(key => localStorage.removeItem(key));
      this.syncStatus.pendingChanges = 0;
      this.saveSyncStatus();
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  // Mark data as synced
  markSynced(key: string): void {
    const cached = this.get(key);
    if (cached) {
      cached.lastSync = Date.now();
      localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(cached));
    }
  }

  // Get sync status
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Save sync status to storage
  private saveSyncStatus(): void {
    try {
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(this.syncStatus));
    } catch (error) {
      console.warn('Sync status save error:', error);
    }
  }

  // Load sync status from storage
  private loadSyncStatus(): void {
    try {
      const stored = localStorage.getItem(this.SYNC_STATUS_KEY);
      if (stored) {
        this.syncStatus = { ...this.syncStatus, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Sync status load error:', error);
    }
  }

  // Trigger background sync for all pending data
  private triggerBackgroundSync(): void {
    if (!this.syncStatus.isOnline || this.syncStatus.syncInProgress) {
      return;
    }

    // Trigger sync for events
    this.scheduleSync('events', SYNC_INTERVALS.EVENTS);
  }

  // Schedule background sync for a specific data type
  scheduleSync(dataType: string, interval: number): void {
    // Clear existing interval
    const existing = this.syncIntervals.get(dataType);
    if (existing) {
      clearInterval(existing);
    }

    // Set new interval
    const intervalId = setInterval(() => {
      if (this.syncStatus.isOnline) {
        this.performBackgroundSync(dataType);
      }
    }, interval);

    this.syncIntervals.set(dataType, intervalId);
  }

  // Perform background sync for specific data type
  private async performBackgroundSync(dataType: string): Promise<void> {
    // This will be implemented when we add the API integration
    console.log(`Background sync triggered for: ${dataType}`);
  }
}

// Export singleton instance
export const cacheManager = new LocalCacheManager();

// Background sync configuration
export const SYNC_INTERVALS = {
  EVENTS: 1000 * 60 * 2, // Sync events every 2 minutes
  STATS: 1000 * 60 * 5,  // Sync stats every 5 minutes
  REALTIME: 1000 * 30,   // Realtime updates every 30 seconds
};

// Query keys for consistent caching
export const QUERY_KEYS = {
  EVENTS: {
    ALL: ['events'] as const,
    LIST: (filters?: any) => ['events', 'list', filters] as const,
    DETAIL: (id: string) => ['events', 'detail', id] as const,
    STATS: (dateRange?: any) => ['events', 'stats', dateRange] as const,
  },
  SYNC: {
    STATUS: ['sync', 'status'] as const,
    LAST_UPDATED: ['sync', 'lastUpdated'] as const,
  },
} as const;