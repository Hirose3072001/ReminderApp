import { Platform } from 'react-native';

// Typography tokens - Manrope (headlines) + Inter (body/label)
// "Editorial Voice": asymmetric hierarchy, jump from headline-lg to body-md

export const FontFamily = {
  // Manrope - Display/Headline: geometric, authoritative
  manropeRegular: 'Manrope_400Regular',
  manropeMedium: 'Manrope_500Medium',
  manropeSemiBold: 'Manrope_600SemiBold',
  manropeBold: 'Manrope_700Bold',
  manropeExtraBold: 'Manrope_800ExtraBold',

  // Inter - Body/Label: exceptional legibility on mobile
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
} as const;

export const FontSize = {
  // Display (hero moments) - editorial impact
  displayLg: 56,    // 3.5rem
  displayMd: 45,
  displaySm: 36,

  // Headline - huge impact, skip weight after this
  headlineLg: 32,
  headlineMd: 28,
  headlineSm: 24,

  // Title
  titleLg: 22,
  titleMd: 18,
  titleSm: 16,

  // Body - skip middle weight
  bodyLg: 16,
  bodyMd: 14,
  bodySm: 12,

  // Label
  labelLg: 14,
  labelMd: 12,
  labelSm: 11,
} as const;

export const LetterSpacing = {
  tight: -0.02,     // display headlines
  normal: 0,
  wide: 0.01,
  wider: 0.05,
} as const;

export const LineHeight = {
  displayLg: 64,
  displayMd: 52,
  headlineLg: 40,
  headlineMd: 36,
  headlineSm: 32,
  titleLg: 28,
  titleMd: 24,
  titleSm: 22,
  bodyLg: 24,
  bodyMd: 20,
  bodySm: 16,
  labelLg: 20,
  labelMd: 16,
  labelSm: 16,
} as const;
