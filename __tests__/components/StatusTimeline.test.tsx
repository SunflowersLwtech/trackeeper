import React from "react";
import { render, screen } from "@testing-library/react-native";
import { StatusTimeline } from "@/components/request/StatusTimeline";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

describe("StatusTimeline", () => {
  it("renders step labels and progress for submitted status", () => {
    render(<StatusTimeline currentStatus="submitted" />);
    // "Submitted" appears in header + step label row
    expect(screen.getAllByText("Submitted").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Assigned")).toBeTruthy();
    expect(screen.getByText("In Progress")).toBeTruthy();
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByText("Step 1 of 4")).toBeTruthy();
  });

  it("shows cancelled state with no step labels", () => {
    render(<StatusTimeline currentStatus="cancelled" />);
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.queryByText("Step 1 of 4")).toBeNull();
  });

  it("shows on_hold status prominently with step labels", () => {
    render(<StatusTimeline currentStatus="on_hold" />);
    expect(screen.getByText("On Hold")).toBeTruthy();
    // Step labels should still be visible
    expect(screen.getAllByText("Submitted").length).toBeGreaterThanOrEqual(1);
  });

  it("renders correct step for assigned status", () => {
    render(<StatusTimeline currentStatus="assigned" />);
    expect(screen.getAllByText("Assigned").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Step 2 of 4")).toBeTruthy();
  });

  it("renders correct step for completed status", () => {
    render(<StatusTimeline currentStatus="completed" />);
    expect(screen.getByText("Step 4 of 4")).toBeTruthy();
    expect(screen.getAllByText("Completed").length).toBeGreaterThanOrEqual(1);
  });
});
