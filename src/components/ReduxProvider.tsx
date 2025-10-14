"use client";

import { Provider } from 'react-redux';
import { store } from '@/store';
import { useEffect, useState } from 'react';
import { setOnlineStatus } from '@/store/cacheSlice';

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Set hydration flag and initial online status after component mounts
    setIsHydrated(true);
    store.dispatch(setOnlineStatus(navigator.onLine));

    // Listen for online/offline events
    const handleOnline = () => store.dispatch(setOnlineStatus(true));
    const handleOffline = () => store.dispatch(setOnlineStatus(false));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return <Provider store={store}>{children}</Provider>;
}