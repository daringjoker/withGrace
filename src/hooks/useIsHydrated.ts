import { useEffect, useState } from 'react';

/**
 * Hook to check if the component has hydrated on the client side.
 * This helps prevent hydration mismatches between server and client.
 */
export function useIsHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}