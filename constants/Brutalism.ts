/**
 * Soft Brutalist style primitives.
 *
 * Hard 2px ink borders, chunky offset shadows (no blur), tight radii,
 * Archivo Black display + Inter Tight body. Use these instead of
 * sprinkling magic numbers across components.
 */
import { Platform } from "react-native";
import { palette } from "./Colors";

/**
 * Native falls back to system + heavy weight (no Google Fonts at runtime).
 * Web pulls Archivo Black / Inter Tight / JetBrains Mono from the
 * <link> in app/+html.tsx.
 */
export const FONT = {
  display: Platform.select({
    web: '"Archivo Black", "Helvetica Neue", system-ui, sans-serif',
    default: undefined as unknown as string,
  }) as string,
  body: Platform.select({
    web: '"Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: undefined as unknown as string,
  }) as string,
  mono: Platform.select({
    web: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    default: Platform.OS === "ios" ? "Menlo" : "monospace",
  }) as string,
} as const;

/** Display-text weight when no custom font is loaded (native). */
export const DISPLAY_WEIGHT = Platform.OS === "web" ? "400" : "900";
export const BODY_BOLD_WEIGHT = Platform.OS === "web" ? "700" : "800";

export const RADIUS = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  pill: 999,
} as const;

export const BORDER = {
  thin: 1.5,
  base: 2,
  heavy: 3,
} as const;

/**
 * Brutalist drop-shadow: solid black offset, no blur.
 * Renders as `box-shadow: Xpx Ypx 0 #ink` on web; native gets close via
 * elevation + tight shadowRadius hack.
 */
export function brutalShadow(offset = 4, color = palette.ink) {
  if (Platform.OS === "web") {
    // boxShadow is supported by react-native-web but not in RN's StyleSheet types.
    return { boxShadow: `${offset}px ${offset}px 0 0 ${color}` } as unknown as {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: offset,
  };
}

/** Smaller shadow for chips/badges/buttons. */
export const SHADOW_SM = brutalShadow(2);
/** Standard card shadow. */
export const SHADOW_MD = brutalShadow(4);
/** Hero / stat-card shadow. */
export const SHADOW_LG = brutalShadow(6);

/** Press-down state — translate the element to "land" on its shadow. */
export const PRESSED_TRANSFORM = [{ translateX: 2 }, { translateY: 2 }];

/** Standard brutalist card surface (cream paper + ink border + shadow). */
export function cardStyle(opts: {
  bg?: string;
  border?: string;
  shadow?: ReturnType<typeof brutalShadow>;
  radius?: number;
} = {}) {
  return {
    backgroundColor: opts.bg ?? palette.paper,
    borderWidth: BORDER.base,
    borderColor: opts.border ?? palette.ink,
    borderRadius: opts.radius ?? RADIUS.lg,
    ...(opts.shadow ?? SHADOW_MD),
  } as const;
}
