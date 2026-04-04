/**
 * Safely convert a 6-digit hex color to rgba with the given opacity.
 * Replaces the brittle `color + "20"` pattern used throughout the codebase.
 */
export function withOpacity(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Return "#fff" or "#000" depending on which has better contrast against the given hex color.
 * Uses WCAG relative luminance formula.
 */
export function contrastText(hex: string): "#fff" | "#000" {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  // sRGB → linear
  const lr = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
  const lg = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
  const lb = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  return luminance > 0.4 ? "#000" : "#fff";
}
