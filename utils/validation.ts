import { RequestCategory } from "@/types";

const VALID_CATEGORIES: RequestCategory[] = ["Plumbing", "Electrical", "General"];

export interface ValidationError {
  field: string;
  message: string;
}

export function validateRequestForm(data: {
  title?: string;
  description?: string;
  category?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.title?.trim()) {
    errors.push({ field: "title", message: "Title is required" });
  } else if (data.title.trim().length < 5) {
    errors.push({ field: "title", message: "Title must be at least 5 characters" });
  }

  if (!data.description?.trim()) {
    errors.push({ field: "description", message: "Description is required" });
  } else if (data.description.trim().length < 10) {
    errors.push({ field: "description", message: "Description must be at least 10 characters" });
  }

  if (!data.category || !VALID_CATEGORIES.includes(data.category as RequestCategory)) {
    errors.push({ field: "category", message: "Please select a valid category" });
  }

  return errors;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Invalid email format";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  return null;
}
