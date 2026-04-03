import React, { Component, ErrorInfo } from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" }}
          accessibilityRole="alert"
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 8 }}>
            {this.props.fallbackTitle ?? "Something went wrong"}
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 16 }}>
            {this.state.error?.message ?? "An unexpected error occurred"}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "#3b82f6", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
