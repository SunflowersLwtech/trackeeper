import React from "react";
import { render, screen } from "@testing-library/react-native";
import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders the title text", () => {
    render(<EmptyState title="No requests yet" />);
    expect(screen.getByText("No requests yet")).toBeTruthy();
  });

  it("renders the subtitle when provided", () => {
    render(<EmptyState title="No requests" subtitle="Create your first request" />);
    expect(screen.getByText("Create your first request")).toBeTruthy();
  });

  it("does not render subtitle when not provided", () => {
    render(<EmptyState title="No requests" />);
    // Only the title should be present
    const allTexts = screen.getAllByText(/.+/);
    expect(allTexts).toHaveLength(1);
    expect(allTexts[0]).toHaveTextContent("No requests");
  });

  it("renders different title text", () => {
    render(<EmptyState title="All caught up!" />);
    expect(screen.getByText("All caught up!")).toBeTruthy();
  });
});
