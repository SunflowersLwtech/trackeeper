import Colors, { type ThemeColors } from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

/** Returns the full semantic color set for the current theme. */
export function useColors(): ThemeColors {
  const scheme = useColorScheme() ?? "light";
  return Colors[scheme];
}
