import { Text, TextProps } from "./Themed";
import { FONT, DISPLAY_WEIGHT } from "@/constants/Brutalism";

/**
 * Display headline — Archivo Black on web, system black weight on native.
 * Use for hero numerals, screen titles, accent labels.
 */
export function DisplayText(props: TextProps) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: FONT.display,
          fontWeight: DISPLAY_WEIGHT as "900",
          letterSpacing: -0.5,
          textTransform: "uppercase",
        },
        props.style,
      ]}
    />
  );
}

/** Mono text — JetBrains Mono on web, platform mono on native. */
export function MonoText(props: TextProps) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: FONT.mono, letterSpacing: 0 }, props.style]}
    />
  );
}
