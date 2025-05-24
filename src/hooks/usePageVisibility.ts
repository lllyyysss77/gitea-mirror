import { useEffect, useState } from 'react';

/**
 * Hook to detect if the page/tab is currently visible
 * Returns false when user switches to another tab or minimizes the window
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    // Set initial state
    setIsVisible(!document.hidden);

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
