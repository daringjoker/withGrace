# Offline-First Caching System for Baby Tracking App

## Overview

This implementation provides a comprehensive offline-first data management system for the baby tracking application. The system enables immediate UI responsiveness and seamless functionality even when the database is located in a different hemisphere, by implementing local storage caching with background synchronization.

## Architecture Components

### 1. Local Cache Manager (`src/lib/queryClient.ts`)

**Features:**
- **Versioned Cache Storage**: Each cache entry includes version and timestamp metadata
- **Staleness Detection**: Automatic detection of outdated data with configurable TTL
- **Offline Support**: Tracks online/offline status and adapts behavior accordingly
- **Sync Queue Management**: Maintains pending changes for background synchronization
- **Cache Eviction**: LRU-based cleanup to prevent storage bloat

**Key Methods:**
```typescript
cacheManager.get<T>(key: string): CacheEntry<T> | null
cacheManager.set<T>(key: string, data: T, needsSync?: boolean): void
cacheManager.getSyncStatus(): SyncStatus
```

### 2. Events API Service (`src/lib/eventsAPI.ts`)

**Features:**
- **Cache-First Strategy**: Always check cache before network requests
- **Optimistic Updates**: Immediate UI updates with server sync in background
- **Automatic Rollback**: Revert changes if server sync fails
- **Background Refresh**: Auto-refresh stale data when online
- **Error Handling**: Graceful degradation with cached data on network errors

**Operations:**
- `getEvents()`: Cache-first event listing with background refresh
- `createEvent()`: Optimistic create with server sync
- `updateEvent()`: Optimistic update with rollback capability
- `deleteEvent()`: Optimistic delete with recovery options

### 3. React Hook Integration (`src/hooks/useEvents.ts`)

**Features:**
- **Real-time Sync Status**: Live connection and sync state indicators
- **Auto-refresh**: Configurable interval-based data refreshing
- **Background Sync**: Automatic sync when page becomes visible or comes online
- **Error Recovery**: Retry mechanisms and cached data fallbacks

**Hook API:**
```typescript
const {
  events,           // Current events array
  isLoading,        // Initial loading state
  isStale,          // Data staleness indicator
  isSyncing,        // Background sync in progress
  syncStatus,       // Detailed sync status info
  createEvent,      // Optimistic create function
  updateEvent,      // Optimistic update function
  deleteEvent,      // Optimistic delete function
  refetch           // Manual refresh function
} = useEvents(options);
```

## Implementation Benefits

### 1. **Immediate Responsiveness**
- All user interactions receive instant feedback
- No waiting for network requests to complete
- Optimistic updates provide seamless user experience

### 2. **Offline Capability**
- Full functionality when disconnected from internet
- Automatic sync when connection is restored
- Visual indicators show connection and sync status

### 3. **Performance Optimization**
- Eliminates repeated API calls for same data
- Reduces bandwidth usage through intelligent caching
- Background refresh keeps data current without blocking UI

### 4. **Data Consistency**
- Conflict resolution through rollback mechanisms
- Sync queue ensures no data loss during connectivity issues
- Version tracking prevents cache corruption

## UI Integration Features

### Connection Status Indicators
The timeline page now displays real-time connection status:

- **🟢 Online**: Connected and data is current
- **🟡 Stale**: Data may be outdated, refresh available
- **🔄 Syncing**: Background sync in progress
- **🟠 Offline**: Using cached data, will sync when online
- **📊 Pending**: Shows number of changes awaiting sync

### Error Handling
- Automatic retry mechanisms for failed requests
- User-friendly error messages with retry options
- Graceful fallback to cached data during network issues

### Background Sync Triggers
- Page visibility change (when user returns to tab)
- Network connectivity restoration (online event)
- Configurable timer-based intervals
- User-initiated refresh actions

## Technical Implementation Details

### Cache Key Strategy
```
events-{filters} → Events list with specific filters
event-{id} → Individual event data
sync-queue → Pending changes awaiting server sync
```

### Storage Management
- Browser localStorage with JSON serialization
- Automatic cleanup of expired entries
- Size monitoring to prevent storage overflow
- Fallback handling for storage quota exceeded

### Sync Conflict Resolution
1. **Optimistic Updates**: Changes applied immediately to cache
2. **Server Validation**: Background attempt to sync with server
3. **Success Path**: Cache marked as synced, changes committed
4. **Failure Path**: Changes rolled back or queued for retry

### Performance Optimizations
- Debounced cache operations to prevent excessive writes
- Batch processing for multiple simultaneous updates
- Lazy loading for large data sets
- Memory-efficient data structures

## Usage Examples

### Basic Event Fetching
```typescript
const { events, isLoading } = useEvents({
  filters: { type: 'feeding', dateFrom: '2024-01-01' },
  refetchInterval: 30000 // Auto-refresh every 30s
});
```

### Creating Events with Optimistic Updates
```typescript
const { createEvent } = useEvents();

await createEvent({
  type: 'feeding',
  time: '14:30',
  date: '2024-01-15',
  feedingEvent: { feedingType: 'bottle', amount: 120 }
});
// UI updates immediately, syncs in background
```

### Handling Offline Scenarios
```typescript
const { syncStatus, events } = useEvents();

if (!syncStatus.isOnline) {
  // Show offline indicator
  // All CRUD operations still work with local cache
  // Changes will sync automatically when online
}
```

## Future Enhancements

1. **Conflict Resolution**: Implement merge strategies for concurrent edits
2. **Compression**: Add data compression for better storage efficiency
3. **Selective Sync**: Allow users to choose what data to sync
4. **Backup/Restore**: Export/import functionality for data portability
5. **Analytics**: Track sync performance and optimize accordingly

This offline-first architecture ensures your baby tracking app provides excellent user experience regardless of network conditions, while maintaining data consistency and providing real-time sync capabilities when connectivity is available.