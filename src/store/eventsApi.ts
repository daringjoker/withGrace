import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BabyEventWithRelations } from '@/types/baby-events';

// Types for API responses
export interface EventsResponse {
  events: BabyEventWithRelations[];
  totalCount: number;
  hasMore: boolean;
}

export interface EventFilters {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface CreateEventData {
  type: string;
  time: string;
  date: string;
  notes?: string;
  feedingEvent?: {
    feedingType: string;
    amount?: number;
    duration?: number;
    side?: string;
  };
  diaperEvent?: {
    wet: number;
    dirty: number;
    color?: string;
    texture?: string;
    consistency?: string;
  };
  sleepEvent?: {
    duration?: number;
    sleepType: string;
    startTime?: string;
    endTime?: string;
  };
  otherEvent?: {
    eventType: string;
    description: string;
  };
  images?: Array<{ url: string; filename: string }>;
}

// RTK Query API slice for events
export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/events',
  }),
  tagTypes: ['Event', 'EventsList'],
  endpoints: (builder) => ({
    // Get events with caching and background updates
    getEvents: builder.query<EventsResponse, EventFilters>({
      query: (filters) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
        return `?${params}`;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformResponse: (response: any) => {
        // Handle the API response format { success: true, data: { events: [...] } }
        if (response && response.success && response.data) {
          return {
            events: response.data.events || [],
            totalCount: response.data.totalCount || 0,
            hasMore: response.data.events?.length === (response.data.limit || 50),
          };
        }
        
        return {
          events: [],
          totalCount: 0,
          hasMore: false,
        };
      },
      providesTags: (result, error, filters) => [
        { type: 'EventsList', id: JSON.stringify(filters) },
        ...(result?.events || []).map((event) => ({ type: 'Event' as const, id: event.id })),
      ],
      // Keep cached data for longer to reduce API calls
      keepUnusedDataFor: 15 * 60, // 15 minutes
    }),

    // Get single event
    getEvent: builder.query<BabyEventWithRelations, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Event', id }],
      keepUnusedDataFor: 10 * 60, // 10 minutes for individual events
    }),

    // Create new event with optimistic updates and offline support
    createEvent: builder.mutation<BabyEventWithRelations, CreateEventData>({
      query: (eventData) => ({
        url: '',
        method: 'POST',
        body: eventData,
      }),
      // Optimistically update the cache and handle offline scenarios
      async onQueryStarted(eventData, { dispatch, queryFulfilled, getState }) {
        // Check if we're offline
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentState = getState() as any;
        const isOnline = currentState.cache.syncStatus.isOnline;
        
        if (!isOnline) {
          // Add to offline actions queue
          const { addOfflineAction } = await import('./cacheSlice');
          dispatch(addOfflineAction({
            type: 'create',
            data: eventData,
          }));
        }
        // Create optimistic update for events list
        const tempId = `temp-${Date.now()}`;
        const optimisticEvent: BabyEventWithRelations = {
          ...eventData,
          id: tempId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: eventData.type as any, // Type assertion for compatibility
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Add proper relation objects with required fields
          feedingEvent: eventData.feedingEvent ? {
            id: `temp-feeding-${tempId}`,
            eventId: tempId,
            ...eventData.feedingEvent
          } : undefined,
          diaperEvent: eventData.diaperEvent ? {
            id: `temp-diaper-${tempId}`,
            eventId: tempId,
            ...eventData.diaperEvent
          } : undefined,
          sleepEvent: eventData.sleepEvent ? {
            id: `temp-sleep-${tempId}`,
            eventId: tempId,
            ...eventData.sleepEvent
          } : undefined,
          otherEvent: eventData.otherEvent ? {
            id: `temp-other-${tempId}`,
            eventId: tempId,
            ...eventData.otherEvent
          } : undefined,
          // Ensure images have proper ImageData structure
          images: eventData.images?.map((img, index) => ({
            id: `temp-img-${Date.now()}-${index}`,
            url: img.url,
            key: `temp-key-${index}`,
            name: img.filename,
            size: 0,
            uploadedAt: new Date().toISOString(),
            caption: undefined,
            tags: undefined
          }))
        };

        // Find all active events queries and update them optimistically
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stateSnapshot = getState() as any;
        const eventsQueries = Object.keys(stateSnapshot.eventsApi.queries)
          .filter((key) => key.startsWith('getEvents'))
          .map((key) => stateSnapshot.eventsApi.queries[key]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const patchResults: any[] = [];

        eventsQueries.forEach((queryState) => {
          if (queryState?.data) {
            const patchResult = dispatch(
              eventsApi.util.updateQueryData('getEvents', queryState.originalArgs, (draft) => {
                draft.events.unshift(optimisticEvent);
                draft.totalCount += 1;
              })
            );
            patchResults.push(patchResult);
          }
        });

        try {
          const result = await queryFulfilled;
          
          // Replace optimistic update with real data
          patchResults.forEach((patchResult, index) => {
            const queryState = eventsQueries[index];
            if (queryState) {
              dispatch(
                eventsApi.util.updateQueryData('getEvents', queryState.originalArgs, (draft) => {
                  const tempIndex = draft.events.findIndex(e => e.id === tempId);
                  if (tempIndex !== -1) {
                    draft.events[tempIndex] = result.data;
                  }
                })
              );
            }
          });
        } catch {
          // Revert optimistic updates on error
          patchResults.forEach((patchResult) => {
            patchResult.undo();
          });
        }
      },
      invalidatesTags: ['EventsList'],
    }),

    // Update event with optimistic updates
    updateEvent: builder.mutation<BabyEventWithRelations, { id: string; data: Partial<CreateEventData> }>({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        // Optimistically update individual event
        const patchResult = dispatch(
          eventsApi.util.updateQueryData('getEvent', id, (draft) => {
            Object.assign(draft, data);
          })
        );

        // Optimistically update events lists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const listPatchResults: any[] = [];
        // This would need to iterate through active getEvents queries
        // For now, we'll invalidate to keep it simple

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
          listPatchResults.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Event', id },
        'EventsList',
      ],
    }),

    // Delete event with optimistic updates
    deleteEvent: builder.mutation<void, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        // Find all active events queries and remove the event optimistically
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = getState() as any;
        const eventsQueries = Object.keys(state.eventsApi.queries)
          .filter((key) => key.startsWith('getEvents'))
          .map((key) => state.eventsApi.queries[key]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const patchResults: any[] = [];

        eventsQueries.forEach((queryState) => {
          if (queryState?.data) {
            const patchResult = dispatch(
              eventsApi.util.updateQueryData('getEvents', queryState.originalArgs, (draft) => {
                const index = draft.events.findIndex(event => event.id === id);
                if (index !== -1) {
                  draft.events.splice(index, 1);
                  draft.totalCount -= 1;
                }
              })
            );
            patchResults.push(patchResult);
          }
        });

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic updates on error
          patchResults.forEach((patchResult) => {
            patchResult.undo();
          });
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: 'Event', id },
        'EventsList',
      ],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetEventsQuery,
  useGetEventQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useLazyGetEventsQuery,
} = eventsApi;

// Export util functions for manual cache updates
export const {
  updateQueryData,
  invalidateTags,
} = eventsApi.util;