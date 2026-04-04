/**
 * TracKeeper design token system.
 * All colors in the app MUST reference this file.
 */

const palette = {
  // Blue
  blue50: "#eff6ff",
  blue100: "#dbeafe",
  blue300: "#93c5fd",
  blue500: "#3b82f6",
  blue700: "#1d4ed8",
  blue800: "#1e40af",

  // Green
  green50: "#f0fdf4",
  green500: "#22c55e",
  green700: "#15803d",
  green800: "#166534",

  // Red
  red50: "#fef2f2",
  red200: "#fecaca",
  red500: "#ef4444",
  red700: "#b91c1c",
  red900: "#991b1b",

  // Amber
  amber50: "#fffbeb",
  amber100: "#fef3c7",
  amber500: "#f59e0b",
  amber800: "#92400e",

  // Violet
  violet50: "#f5f3ff",
  violet100: "#f3e8ff",
  violet300: "#c4b5fd",
  violet500: "#8b5cf6",
  violet600: "#7c3aed",

  // Neutrals
  white: "#fff",
  black: "#000",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
} as const;

/** Semantic light theme */
const light = {
  // Backgrounds
  background: palette.white,
  surface: palette.gray50,
  surfaceAlt: palette.gray100,

  // Text
  text: palette.gray900,
  textSecondary: palette.gray700,
  textBody: palette.gray600,
  textTertiary: palette.gray500,
  textMuted: palette.gray400,

  // Borders
  border: palette.gray300,
  borderLight: palette.gray200,

  // Primary
  primary: palette.blue500,
  primaryLight: palette.blue300,
  primaryBg: palette.blue50,
  primaryDark: palette.blue700,
  primaryBadgeBg: palette.blue100,

  // Success
  success: palette.green500,
  successBg: palette.green50,
  successTextDark: palette.green800,
  successTextMedium: palette.green700,

  // Error / Destructive
  error: palette.red500,
  errorBg: palette.red50,
  errorBorder: palette.red200,
  errorTextDark: palette.red900,
  errorTextMedium: palette.red700,

  // Warning
  warning: palette.amber500,
  warningBg: palette.amber50,
  warningBadgeBg: palette.amber100,
  warningTextDark: palette.amber800,

  // Violet (on hold / maintainer)
  violet: palette.violet500,
  violetDark: palette.violet600,
  violetBg: palette.violet50,
  violetBadgeBg: palette.violet100,
  violetBorder: palette.violet300,

  // Tint (legacy compat)
  tint: palette.blue500,
  tabIconDefault: palette.gray400,
  tabIconSelected: palette.blue500,

  // Overlay
  overlay: "rgba(0,0,0,0.4)",
} as const;

export type ThemeColors = { [K in keyof typeof light]: string };

/** Semantic dark theme */
const dark: ThemeColors = {
  background: palette.gray900,
  surface: palette.gray800,
  surfaceAlt: palette.gray700,

  text: palette.gray50,
  textSecondary: palette.gray300,
  textBody: palette.gray400,
  textTertiary: palette.gray500,
  textMuted: palette.gray500,

  border: palette.gray700,
  borderLight: palette.gray600,

  primary: palette.blue500,
  primaryLight: palette.blue300,
  primaryBg: "#1e293b",
  primaryDark: palette.blue300,
  primaryBadgeBg: "#1e3a5f",

  success: palette.green500,
  successBg: "#052e16",
  successTextDark: palette.green500,
  successTextMedium: palette.green500,

  error: palette.red500,
  errorBg: "#450a0a",
  errorBorder: "#7f1d1d",
  errorTextDark: palette.red500,
  errorTextMedium: palette.red500,

  warning: palette.amber500,
  warningBg: "#451a03",
  warningBadgeBg: "#78350f",
  warningTextDark: palette.amber500,

  violet: palette.violet500,
  violetDark: palette.violet300,
  violetBg: "#2e1065",
  violetBadgeBg: "#3b0764",
  violetBorder: palette.violet500,

  tint: palette.blue500,
  tabIconDefault: palette.gray500,
  tabIconSelected: palette.blue500,

  overlay: "rgba(0,0,0,0.6)",
};

const Colors = { light, dark } as const;
export { palette };
export default Colors;
