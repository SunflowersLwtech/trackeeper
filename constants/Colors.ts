/**
 * TracKeeper design token system — Soft Brutalist Card.
 *
 * Cream paper, ink-black borders, chunky 4px drop-shadow cards,
 * cobalt primary, tomato + mustard accents, lime + plum status.
 * Display: Archivo Black. Body: Inter Tight. Mono: JetBrains Mono.
 *
 * All colors in the app MUST reference this file.
 */

const palette = {
  // Cream / paper
  cream50: "#FAF6EC",
  cream100: "#F4ECD8", // canvas
  cream200: "#EAE0C8",
  cream300: "#D9CCAA",
  paper: "#FFFEF8", // card surface
  parchment: "#F8F0DC",

  // Ink (true brutalist black)
  ink: "#0A0A0A",
  ink800: "#1A1A1A",
  ink600: "#3D3D3D",
  ink500: "#5C544A",
  ink400: "#857C70",
  ink300: "#A8A095",
  ink200: "#CFC8BD",
  ink100: "#E0D9CC",

  // Cobalt — primary
  cobalt50: "#E6E9FF",
  cobalt300: "#7B8AFF",
  cobalt500: "#1E3AFF",
  cobalt700: "#0F1E99",

  // Tomato — destructive / high-priority
  tomato50: "#FFE9E3",
  tomato300: "#FF9479",
  tomato500: "#FF4D2E",
  tomato700: "#B82A11",

  // Mustard — warning / in-progress
  mustard50: "#FFF4D0",
  mustard300: "#FFD96A",
  mustard500: "#F4B400",
  mustard700: "#9C6E00",

  // Lime — success / low-priority
  lime50: "#E5FBD8",
  lime300: "#9FE57A",
  lime500: "#5BD27D",
  lime700: "#2A8A48",

  // Plum — on-hold / violet roles
  plum50: "#EFE4FF",
  plum300: "#B998FF",
  plum500: "#7C3AED",
  plum700: "#4C1D95",

  // Sky — info / chat
  sky50: "#DCF2FF",
  sky500: "#0EA5E9",
  sky700: "#0369A1",

  white: "#FFFFFF",
  black: "#000000",
  smoke: "#F2F2F2",
} as const;

/** Soft Brutalist light theme */
const light = {
  // Backgrounds
  background: palette.cream100,
  surface: palette.paper,
  surfaceAlt: palette.cream200,

  // Text
  text: palette.ink,
  textSecondary: palette.ink800,
  textBody: palette.ink600,
  textTertiary: palette.ink500,
  textMuted: palette.ink400,

  // Borders — brutalist hard ink lines
  border: palette.ink,
  borderLight: palette.ink200,

  // Primary — cobalt
  primary: palette.cobalt500,
  primaryLight: palette.cobalt300,
  primaryBg: palette.cobalt50,
  primaryDark: palette.cobalt700,
  primaryBadgeBg: palette.cobalt50,

  // Success — lime
  success: palette.lime500,
  successBg: palette.lime50,
  successTextDark: palette.lime700,
  successTextMedium: palette.lime700,

  // Error / Destructive — tomato
  error: palette.tomato500,
  errorBg: palette.tomato50,
  errorBorder: palette.tomato300,
  errorTextDark: palette.tomato700,
  errorTextMedium: palette.tomato700,

  // Warning — mustard
  warning: palette.mustard500,
  warningBg: palette.mustard50,
  warningBadgeBg: palette.mustard300,
  warningTextDark: palette.mustard700,

  // Violet / on-hold — plum
  violet: palette.plum500,
  violetDark: palette.plum700,
  violetBg: palette.plum50,
  violetBadgeBg: palette.plum300,
  violetBorder: palette.plum500,

  // Tint (legacy compat)
  tint: palette.cobalt500,
  tabIconDefault: palette.ink400,
  tabIconSelected: palette.cobalt500,

  // Overlay
  overlay: "rgba(10,10,10,0.55)",
} as const;

export type ThemeColors = { [K in keyof typeof light]: string };

/** Soft Brutalist dark theme — inverted ink canvas with same accents */
const dark: ThemeColors = {
  background: "#11100D",
  surface: "#1B1A16",
  surfaceAlt: "#26241F",

  text: palette.cream50,
  textSecondary: palette.cream100,
  textBody: palette.ink200,
  textTertiary: palette.ink300,
  textMuted: palette.ink400,

  border: palette.cream100,
  borderLight: palette.ink600,

  primary: palette.cobalt300,
  primaryLight: palette.cobalt500,
  primaryBg: "#0F1335",
  primaryDark: palette.cobalt300,
  primaryBadgeBg: "#1A1F4D",

  success: palette.lime300,
  successBg: "#0E2818",
  successTextDark: palette.lime300,
  successTextMedium: palette.lime300,

  error: palette.tomato300,
  errorBg: "#3A130A",
  errorBorder: palette.tomato500,
  errorTextDark: palette.tomato300,
  errorTextMedium: palette.tomato300,

  warning: palette.mustard300,
  warningBg: "#2E1F00",
  warningBadgeBg: palette.mustard500,
  warningTextDark: palette.mustard300,

  violet: palette.plum300,
  violetDark: palette.plum300,
  violetBg: "#1F0E3D",
  violetBadgeBg: palette.plum500,
  violetBorder: palette.plum300,

  tint: palette.cobalt300,
  tabIconDefault: palette.ink400,
  tabIconSelected: palette.cobalt300,

  overlay: "rgba(0,0,0,0.7)",
};

const Colors = { light, dark } as const;
export { palette };
export default Colors;
