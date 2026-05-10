import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { RequestCard } from "@/components/request/RequestCard";
import type { MaintenanceRequest } from "@/types";

jest.mock("firebase/firestore", () => ({
  Timestamp: {
    fromDate: (date: Date) => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
    }),
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("@/components/ui/StatusBadge", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require("react-native");
  return {
    StatusBadge: ({ status }: { status: string }) => <Text testID="status-badge">{status}</Text>,
  };
});

jest.mock("@/components/ui/PriorityBadge", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require("react-native");
  return {
    PriorityBadge: ({ priority }: { priority: string }) => <Text testID="priority-badge">{priority}</Text>,
  };
});

function makeRequest(overrides: Partial<MaintenanceRequest> = {}): MaintenanceRequest {
  return {
    id: "req-1",
    title: "Leaky faucet",
    description: "Kitchen sink dripping",
    category: "Plumbing",
    priority: "high",
    status: "submitted",
    tenantId: "t1",
    tenantName: "Alice",
    statusHistory: [],
    createdAt: { toDate: () => new Date("2026-01-01T12:00:00Z") } as MaintenanceRequest["createdAt"],
    ...overrides,
  };
}

describe("RequestCard", () => {
  it("renders the request title", () => {
    render(<RequestCard request={makeRequest()} onPress={jest.fn()} />);
    expect(screen.getByText("Leaky faucet")).toBeTruthy();
  });

  it("renders the description", () => {
    render(<RequestCard request={makeRequest()} onPress={jest.fn()} />);
    expect(screen.getByText("Kitchen sink dripping")).toBeTruthy();
  });

  it("renders the category", () => {
    render(<RequestCard request={makeRequest()} onPress={jest.fn()} />);
    expect(screen.getByText("Plumbing")).toBeTruthy();
  });

  it("renders the status badge with correct status", () => {
    render(<RequestCard request={makeRequest({ status: "assigned" })} onPress={jest.fn()} />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent("assigned");
  });

  it("renders the priority badge", () => {
    render(<RequestCard request={makeRequest({ priority: "high" })} onPress={jest.fn()} />);
    expect(screen.getByTestId("priority-badge")).toHaveTextContent("high");
  });

  it("renders assignee name when present", () => {
    render(
      <RequestCard
        request={makeRequest({ assignedToName: "Bob" })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText(/Assigned to Bob/)).toBeTruthy();
  });

  it("does not render assignee when not present", () => {
    render(<RequestCard request={makeRequest()} onPress={jest.fn()} />);
    expect(screen.queryByText(/Assigned to/)).toBeNull();
  });

  it("calls onPress when card is pressed", () => {
    const onPress = jest.fn();
    render(<RequestCard request={makeRequest()} onPress={onPress} />);
    fireEvent.press(screen.getByTestId("request-card-Leaky faucet"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("sets accessibilityLabel with title and status", () => {
    render(<RequestCard request={makeRequest({ status: "in_progress" })} onPress={jest.fn()} />);
    expect(
      screen.getByLabelText("Leaky faucet, status: in_progress"),
    ).toBeTruthy();
  });
});
