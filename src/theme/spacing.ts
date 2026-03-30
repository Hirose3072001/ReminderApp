// Spacing scale (spacingScale: 3 from Stitch = 1rem base × 3 density)
// Based on 4pt grid

export const Spacing = {
  0: 0,
  1: 4,     // 0.25rem
  2: 8,     // 0.5rem
  3: 12,    // 0.75rem
  4: 16,    // 1rem (base) - "1.4rem" separation between list items minimum
  5: 20,    // 1.25rem
  6: 24,    // 1.5rem
  7: 28,    // 1.75rem
  8: 32,    // 2rem - horizontal button padding
  9: 36,    // 2.25rem
  10: 40,   // 2.5rem - section breathing room
  12: 48,   // 3rem
  14: 56,   // 3.5rem
  16: 64,   // 4rem
} as const;

// Border radius (roundness: ROUND_EIGHT = 8px base)
export const Radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,     // From Stitch: ROUND_EIGHT = default
  lg: 12,
  xl: 16,    // Button corner (1.5rem per spec... normalized to 16)
  xxl: 24,
  full: 9999, // Chips, pills
} as const;

// Elevation tokens (Tonal Layering - no drop shadows for non-floating elements)
export const Elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // "Ambient Shadows" ONLY for truly floating elements
  floating: {
    shadowColor: '#1A1C1C',  // on_surface at 4% opacity
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 32,
    elevation: 4,
  },
  modal: {
    shadowColor: '#1A1C1C',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 8,
  },
} as const;

// Animation durations
export const Duration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
} as const;
