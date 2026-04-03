import React from "react";
import { render, screen } from "@testing-library/react-native";
import { StatusTimeline } from "@/components/request/StatusTimeline";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

describe("StatusTimeline", () => {
  it("renders all four timeline step labels", () => {
    render(<StatusTimeline currentStatus="submitted" />);
    expect(screen.getByText("Submitted")).toBeTruthy();
    expect(screen.getByText("Assigned")).toBeTruthy();
    expect(screen.getByText("In Progress")).toBeTruthy();
    expect(screen.getByText("Completed")).toBeTruthy();
  });

  it("renders step numbers 1-4", () => {
    render(<StatusTimeline currentStatus="submitted" />);
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("shows cancelled state instead of timeline", () => {
    render(<StatusTimeline currentStatus="cancelled" />);
    expect(screen.getByText("Request Cancelled")).toBeTruthy();
    expect(screen.queryByText("Submitted")).toBeNull();
  });

  it("shows on_hold banner when status is on_hold", () => {
    render(<StatusTimeline currentStatus="on_hold" />);
    expect(screen.getByText("On Hold")).toBeTruthy();
    // Timeline steps should still be visible underneath
    expect(screen.getByText("Submitted")).toBeTruthy();
  });

  it("renders timeline for assigned status", () => {
    render(<StatusTimeline currentStatus="assigned" />);
    // Steps 1 and 2 should be active, step labels should all appear
    expect(screen.getByText("Submitted")).toBeTruthy();
    expect(screen.getByText("Assigned")).toBeTruthy();
    expect(screen.getByText("In Progress")).toBeTruthy();
    expect(screen.getByText("Completed")).toBeTruthy();
  });

  it("renders timeline for completed status (all steps active)", () => {
    render(<StatusTimeline currentStatus="completed" />);
    expect(screen.getByText("Submitted")).toBeTruthy();
    expect(screen.getByText("Completed")).toBeTruthy();
  });
});
