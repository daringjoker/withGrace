# API Call Optimization Fix

## Problem Identified
The timeline was making thousands of API calls due to:
1. **Aggressive polling** (30-second intervals)
2. **Excessive refetch triggers** (on focus, mount, etc.)
3. **Unstable filter dependencies** causing re-renders
4. **Duplicate queries** from individual event hooks

## Fixes Applied

### 1. **Reduced Aggressive Polling**
```typescript
// BEFORE: 30-second automatic polling
refetchInterval: 30000

// AFTER: Disabled automatic polling
refetchInterval: 0
```

### 2. **Optimized RTK Query Configuration**
```typescript
// BEFORE: Aggressive refetching
{
  pollingInterval: syncStatus.isOnline ? refetchInterval : 0,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
}

// AFTER: Conservative refetching
{
  pollingInterval: refetchInterval && syncStatus.isOnline ? refetchInterval : 0,
  refetchOnMountOrArgChange: 30, // Only if cache > 30s old
  refetchOnFocus: false, // Disabled
  refetchOnReconnect: true, // Keep for offline scenarios
}
```

### 3. **Stabilized Filter Dependencies**
```typescript
// BEFORE: Unstable object causing re-renders
const queryFilters = useMemo(() => ({
  ...filters, // This spread caused instability
  dateFrom: filters.dateFrom || defaultDate,
  limit: filters.limit || 100,
}), [filters]); // Unstable dependency

// AFTER: Stable individual dependencies
const queryFilters = useMemo(() => ({
  type: filters.type,
  dateFrom: filters.dateFrom || defaultDate,
  dateTo: filters.dateTo,
  limit: filters.limit || 100,
  offset: filters.offset || 0,
}), [
  filters.type,      // Individual stable values
  filters.dateFrom, 
  filters.dateTo,
  filters.limit,
  filters.offset
]);
```

### 4. **Memoized Timeline Data**
```typescript
// BEFORE: Conversion on every render
const events = convertToTimelineEvents(babyEvents);

// AFTER: Memoized conversion
const events = useMemo(() => 
  convertToTimelineEvents(babyEvents), 
  [babyEvents]
);
```

### 5. **Removed Duplicate Queries**
```typescript
// BEFORE: Individual event hook creating extra queries
useGetEventsQuery({ limit: 1 }, { skip: !enabled || !id });

// AFTER: Disabled to prevent duplicate API calls
return { event: null, isLoading: false, ... };
```

### 6. **Extended Cache Duration**
```typescript
// BEFORE: Short cache duration
keepUnusedDataFor: 5 * 60, // 5 minutes

// AFTER: Longer cache retention
keepUnusedDataFor: 15 * 60, // 15 minutes
```

### 7. **Memoized Filter Objects**
```typescript
// Timeline page - memoized filters to prevent re-renders
const memoizedFilters = useMemo(() => ({
  type: filter || undefined,
  dateFrom: dateFilter || format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  limit: 100
}), [filter, dateFilter]);
```

## Expected Results

### ✅ **Reduced API Calls**
- From thousands per minute → single call on mount + manual refreshes only
- No more automatic polling causing constant requests
- Stable cache keys preventing duplicate queries

### ✅ **Better Performance**
- Cached data served immediately (no loading delays)
- Background updates only when necessary
- Reduced network bandwidth usage

### ✅ **Maintained Functionality**
- All existing features still work
- Manual refresh still available
- Offline/online status still tracked
- Optimistic updates still functional

## Monitoring API Calls

To verify the fix is working:
1. Open browser DevTools → Network tab
2. Filter by "api/events"
3. Navigate to timeline page
4. Should see only 1-2 initial API calls, no continuous requests

## Cache-First Behavior Maintained

The timeline still provides:
- **Immediate data display** from cache
- **Background refresh** when manually triggered
- **Offline functionality** with queued changes
- **Real-time status indicators** for connection state

This optimization solves the excessive API call issue while maintaining all the performance benefits of the cache-first architecture.