/**
 * Timeline Constants
 * Centralized configuration for timeline dimensions and styling
 */

export const TIMELINE_CONFIG = {
  // Layout dimensions
  MAX_TIMELINE_WIDTH: 400,
  WINDOW_MARGIN: 16, // Reduced for mobile
  HOUR_HEIGHT: 60,
  DAY_SEPARATOR_HEIGHT: 40,
  EVENT_RADIUS: 14, // Slightly smaller for mobile touch
  
  // Amplitude configuration
  DESKTOP_AMPLITUDE_DIVISOR: 3,
  MOBILE_AMPLITUDE_DIVISOR: 4, // More compact on mobile
  DESKTOP_MAX_AMPLITUDE: 80,
  MOBILE_MAX_AMPLITUDE: 60, // Reduced to prevent horizontal scroll
  
  // Timeline curve configuration
  ZERO_CROSSINGS_PER_DAY: 2,
  
  // Scroll and loading
  DAYS_BUFFER: 3,
  MAX_DAYS_IN_MEMORY: 21,
  SCROLL_THRESHOLD: 200,
  LOADING_DELAY: 100,
  INITIAL_SCROLL_DELAY: 300,
  
  // Label positioning
  LABEL_X_POSITION: 5,
  
  // Z-index layers
  Z_INDEX: {
    LOADING_INDICATOR: 10,
    FLOATING_BUTTON: 20,
    MODAL: 50,
  }
} as const;

/**
 * Get timeline width based on window size
 */
export const getTimelineWidth = (): number => {
  if (typeof window === 'undefined') return TIMELINE_CONFIG.MAX_TIMELINE_WIDTH;
  return Math.min(TIMELINE_CONFIG.MAX_TIMELINE_WIDTH, window.innerWidth - TIMELINE_CONFIG.WINDOW_MARGIN);
};

/**
 * Get timeline center X position
 */
export const getTimelineCenterX = (timelineWidth: number): number => {
  return timelineWidth / 2;
};

/**
 * Get timeline amplitude based on screen size
 */
export const getTimelineAmplitude = (timelineWidth: number, isSmallScreen: boolean): number => {
  if (isSmallScreen) {
    return Math.min(TIMELINE_CONFIG.MOBILE_MAX_AMPLITUDE, timelineWidth / TIMELINE_CONFIG.MOBILE_AMPLITUDE_DIVISOR);
  }
  return Math.min(TIMELINE_CONFIG.DESKTOP_MAX_AMPLITUDE, timelineWidth / TIMELINE_CONFIG.DESKTOP_AMPLITUDE_DIVISOR);
};

/**
 * Calculate day height including separator
 */
export const getDayHeight = (): number => {
  return 24 * TIMELINE_CONFIG.HOUR_HEIGHT;
};

/**
 * Calculate total timeline height for given number of days
 */
export const getTotalTimelineHeight = (numDays: number): number => {
  return numDays * (getDayHeight() + TIMELINE_CONFIG.DAY_SEPARATOR_HEIGHT);
};