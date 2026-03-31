import {
  validateRequestForm,
  validateEmail,
  validatePassword,
  validateName,
  validateInviteCode,
} from "@/utils/validation";

describe("validation utils", () => {
  describe("validateRequestForm", () => {
    it("returns no errors for valid input", () => {
      const errors = validateRequestForm({
        title: "Leaking pipe in kitchen",
        description: "Water is dripping from under the sink continuously",
        category: "Plumbing",
      });
      expect(errors).toEqual([]);
    });

    it("rejects empty title", () => {
      const errors = validateRequestForm({
        title: "",
        description: "Valid description here",
        category: "Plumbing",
      });
      expect(errors).toContainEqual({ field: "title", message: "Title is required" });
    });

    it("rejects short title", () => {
      const errors = validateRequestForm({
        title: "Hi",
        description: "Valid description here",
        category: "Plumbing",
      });
      expect(errors).toContainEqual({
        field: "title",
        message: "Title must be at least 5 characters",
      });
    });

    it("rejects empty description", () => {
      const errors = validateRequestForm({
        title: "Valid title here",
        description: "",
        category: "Plumbing",
      });
      expect(errors).toContainEqual({ field: "description", message: "Description is required" });
    });

    it("rejects invalid category", () => {
      const errors = validateRequestForm({
        title: "Valid title here",
        description: "Valid description here",
        category: "InvalidCategory",
      });
      expect(errors).toContainEqual({
        field: "category",
        message: "Please select a valid category",
      });
    });

    it("returns multiple errors when multiple fields invalid", () => {
      const errors = validateRequestForm({});
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });

    it("rejects short description", () => {
      const errors = validateRequestForm({
        title: "Valid title here",
        description: "Short",
        category: "Plumbing",
      });
      expect(errors).toContainEqual({
        field: "description",
        message: "Description must be at least 10 characters",
      });
    });

    it("rejects missing category", () => {
      const errors = validateRequestForm({
        title: "Valid title here",
        description: "Valid description text",
      });
      expect(errors).toContainEqual({
        field: "category",
        message: "Please select a valid category",
      });
    });

    it("accepts valid priority", () => {
      const errors = validateRequestForm({
        title: "Valid title here",
        description: "Valid description text",
        category: "Plumbing",
        priority: "high",
      });
      expect(errors).toEqual([]);
    });

    it("rejects invalid priority", () => {
      const errors = validateRequestForm({
        title: "Valid title here",
        description: "Valid description text",
        category: "Plumbing",
        priority: "urgent",
      });
      expect(errors).toContainEqual({
        field: "priority",
        message: "Please select a valid priority",
      });
    });

    it("allows missing priority (optional)", () => {
      const errors = validateRequestForm({
        title: "Valid title here",
        description: "Valid description text",
        category: "Plumbing",
      });
      expect(errors).toEqual([]);
    });
  });

  describe("validateEmail", () => {
    it("returns null for valid email", () => {
      expect(validateEmail("test@example.com")).toBeNull();
    });

    it("rejects empty email", () => {
      expect(validateEmail("")).toBe("Email is required");
    });

    it("rejects invalid format", () => {
      expect(validateEmail("notanemail")).toBe("Invalid email format");
    });
  });

  describe("validatePassword", () => {
    it("returns null for valid password", () => {
      expect(validatePassword("123456")).toBeNull();
    });

    it("rejects empty password", () => {
      expect(validatePassword("")).toBe("Password is required");
    });

    it("rejects short password", () => {
      expect(validatePassword("12345")).toBe("Password must be at least 6 characters");
    });
  });

  describe("validateName", () => {
    it("returns null for valid name", () => {
      expect(validateName("John")).toBeNull();
    });

    it("rejects empty name", () => {
      expect(validateName("")).toBe("Name is required");
    });

    it("rejects single character name", () => {
      expect(validateName("J")).toBe("Name must be at least 2 characters");
    });
  });

  describe("validateInviteCode", () => {
    it("returns null for tenant (no code needed)", () => {
      expect(validateInviteCode("", "tenant")).toBeNull();
    });

    it("returns null for valid code with manager role", () => {
      expect(validateInviteCode("TRACKEEPER2026", "manager")).toBeNull();
    });

    it("returns null for valid code with maintainer role", () => {
      expect(validateInviteCode("TRACKEEPER2026", "maintainer")).toBeNull();
    });

    it("rejects empty code for manager", () => {
      expect(validateInviteCode("", "manager")).toBe("Invite code is required for this role");
    });

    it("rejects empty code for maintainer", () => {
      expect(validateInviteCode("", "maintainer")).toBe("Invite code is required for this role");
    });

    it("rejects wrong code for manager", () => {
      expect(validateInviteCode("WRONG", "manager")).toBe("Invalid invite code");
    });

    it("rejects wrong code for maintainer", () => {
      expect(validateInviteCode("WRONG", "maintainer")).toBe("Invalid invite code");
    });
  });
});
