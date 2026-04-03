import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { Message } from "@/types";

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    senderId: "user-1",
    senderName: "Alice",
    text: "Hello there!",
    createdAt: { toDate: () => new Date("2026-01-01T14:30:00Z") } as Message["createdAt"],
    ...overrides,
  };
}

describe("ChatBubble", () => {
  it("renders the message text", () => {
    render(<ChatBubble message={makeMessage()} isOwn={false} />);
    expect(screen.getByText("Hello there!")).toBeTruthy();
  });

  it("renders sender name for other messages", () => {
    render(<ChatBubble message={makeMessage({ senderName: "Bob" })} isOwn={false} />);
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("does not render sender name for own messages", () => {
    render(<ChatBubble message={makeMessage({ senderName: "Bob" })} isOwn={true} />);
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("renders formatted time", () => {
    render(<ChatBubble message={makeMessage()} isOwn={false} />);
    // Timestamp is 14:30 UTC — the exact display depends on local timezone,
    // but the time text element should be present
    const timeTexts = screen.getAllByText(/\d{2}:\d{2}/);
    expect(timeTexts.length).toBeGreaterThan(0);
  });

  it("renders different message text", () => {
    render(<ChatBubble message={makeMessage({ text: "Fix the pipe" })} isOwn={true} />);
    expect(screen.getByText("Fix the pipe")).toBeTruthy();
  });
});
