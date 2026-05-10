import React from "react";
import { View, Platform } from "react-native";
import { palette } from "@/constants/Colors";
import { BORDER } from "@/constants/Brutalism";
import { useColors } from "@/hooks/useColors";

interface WebContainerProps {
  children: React.ReactNode;
  /** Width cap. Default 480 — mobile-app rhythm on desktop browsers. */
  maxWidth?: number;
}

/**
 * Tracks whether a WebContainer is already mounted in the tree so individual
 * screens that still wrap their own content (legacy) become pass-throughs and
 * we don't get nested ink rails / double borders.
 */
const WebContainerNestedContext = React.createContext(false);

/**
 * On web, constrains content to a max width and frames it with hard ink
 * side-rails so the cream canvas doesn't pool on ultra-wide monitors. On
 * native, renders children unchanged.
 *
 * Nested WebContainer instances render as a pass-through automatically — the
 * root layout wraps everything, page-level wrappers no longer add a second
 * border / column.
 */
export function WebContainer({ children, maxWidth = 480 }: WebContainerProps) {
  const alreadyWrapped = React.useContext(WebContainerNestedContext);
  const c = useColors();
  if (Platform.OS !== "web" || alreadyWrapped) {
    return <>{children}</>;
  }

  return (
    <WebContainerNestedContext.Provider value={true}>
      <View style={{ flex: 1, alignItems: "center", backgroundColor: c.background }}>
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth,
            borderLeftWidth: BORDER.base,
            borderRightWidth: BORDER.base,
            borderColor: palette.ink,
            backgroundColor: c.surface,
          }}
        >
          {children}
        </View>
      </View>
    </WebContainerNestedContext.Provider>
  );
}
