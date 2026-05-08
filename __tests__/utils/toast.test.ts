import Toast from "react-native-toast-message";
import { showSuccess, showError, showInfo } from "@/utils/toast";

jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
  __esModule: true,
  default: { show: jest.fn() },
}));

const mockShow = Toast.show as jest.MockedFunction<typeof Toast.show>;

beforeEach(() => {
  mockShow.mockClear();
});

describe("showSuccess", () => {
  it("calls Toast.show with success type", () => {
    showSuccess("Request submitted");
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "success",
        text1: "Success",
        text2: "Request submitted",
        visibilityTime: 2200,
      }),
    );
  });

  it("uses provided title when both title and message given", () => {
    showSuccess("Saved", "Changes persisted");
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "success",
        text1: "Saved",
        text2: "Changes persisted",
      }),
    );
  });
});

describe("showError", () => {
  it("calls Toast.show with error type and title + message", () => {
    showError("Login Failed", "Invalid credentials");
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        text1: "Login Failed",
        text2: "Invalid credentials",
        visibilityTime: 4000,
      }),
    );
  });

  it("works with title only", () => {
    showError("Error");
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        text1: "Error",
        text2: undefined,
      }),
    );
  });
});

describe("showInfo", () => {
  it("calls Toast.show with info type", () => {
    showInfo("Pull down to refresh");
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "info",
        text1: "Info",
        text2: "Pull down to refresh",
        visibilityTime: 3000,
      }),
    );
  });

  it("uses provided title when both title and message given", () => {
    showInfo("Heads up", "New version available");
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "info",
        text1: "Heads up",
        text2: "New version available",
      }),
    );
  });
});
