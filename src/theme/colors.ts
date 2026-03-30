// Design tokens from Stitch "Onboarding Design" project
// The Digital Gallery - High-End Editorial Mobile Design System

export const Colors = {
  // Primary
  primary: '#005BBF',
  primaryContainer: '#1A73E8',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#FFFFFF',
  primaryFixed: '#D8E2FF',
  primaryFixedDim: '#ADC7FF',

  // Secondary
  secondary: '#475E8C',
  secondaryContainer: '#B2C9FE',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#3D5481',

  // Tertiary
  tertiary: '#9E4300',
  tertiaryContainer: '#C55500',
  onTertiary: '#FFFFFF',

  // Surface hierarchy (The "No-Line" Rule)
  surface: '#F9F9F9',            // Layer 0 - main background
  surfaceBright: '#F9F9F9',
  surfaceContainerLowest: '#FFFFFF',  // Layer 0 - highlight white
  surfaceContainerLow: '#F3F3F4',     // Layer 1 - cards/sections
  surfaceContainer: '#EEEEEE',        // Layer 2 - nested elements
  surfaceContainerHigh: '#E8E8E8',
  surfaceContainerHighest: '#E2E2E2',
  surfaceDim: '#DADADA',
  surfaceVariant: '#E2E2E2',

  // On Surface
  onSurface: '#1A1C1C',       // "ink-like" softness, never pure black
  onSurfaceVariant: '#414754',
  onBackground: '#1A1C1C',
  background: '#F9F9F9',

  // Outline (Ghost border only)
  outline: '#727785',
  outlineVariant: '#C1C6D6',

  // Error
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onError: '#FFFFFF',
  onErrorContainer: '#93000A',

  // Inverse
  inverseSurface: '#2F3131',
  inverseOnSurface: '#F0F1F1',
  inversePrimary: '#ADC7FF',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof Colors;
