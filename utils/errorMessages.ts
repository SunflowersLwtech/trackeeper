type ErrorLike = {
  code?: string;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

const FRIENDLY_BY_CODE: Record<string, string> = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Use a stronger password.",
  "auth/network-request-failed": "Network problem. Check your connection and try again.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/requires-recent-login": "Please sign in again before retrying this action.",
  "permission-denied": "You do not have permission to do that.",
  "firestore/permission-denied": "You do not have permission to do that.",
  "storage/unauthorized": "You do not have permission to do that.",
  unavailable: "Service is temporarily unavailable. Try again.",
  "deadline-exceeded": "Service is taking too long to respond. Try again.",
  "not-found": "The requested record was not found.",
  "already-exists": "This record already exists.",
  EMAIL_EXISTS: "An account with this email already exists.",
  INVALID_LOGIN_CREDENTIALS: "Email or password is incorrect.",
  EMAIL_NOT_FOUND: "Email or password is incorrect.",
  INVALID_PASSWORD: "Email or password is incorrect.",
  WEAK_PASSWORD: "Use a stronger password.",
  TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Wait a moment and try again.",
};

function asErrorLike(error: unknown): ErrorLike {
  return (error ?? {}) as ErrorLike;
}

function codeFromFirebaseMessage(message: string): string | null {
  const serviceMatch = message.match(/\(((?:auth|firestore|storage)\/[^)]+)\)/);
  if (serviceMatch?.[1]) return serviceMatch[1];
  return null;
}

export function getErrorCode(error: unknown): string | null {
  const err = asErrorLike(error);
  const direct = err.code ?? err.error?.code ?? err.error?.message;
  if (direct) return direct;
  const message = err.message;
  return message ? codeFromFirebaseMessage(message) : null;
}

function looksTechnical(message: string): boolean {
  return (
    message.includes("Firebase:") ||
    message.includes("FirebaseError") ||
    /\b(auth|firestore|storage)\//i.test(message) ||
    /Missing or insufficient permissions/i.test(message) ||
    /Failed to create account:/i.test(message) ||
    /Unsupported field value/i.test(message)
  );
}

export function friendlyErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  const code = getErrorCode(error);
  if (code && FRIENDLY_BY_CODE[code]) return FRIENDLY_BY_CODE[code];

  const normalized = code?.toLowerCase();
  if (normalized && FRIENDLY_BY_CODE[normalized]) return FRIENDLY_BY_CODE[normalized];

  const message = asErrorLike(error).message;
  if (!message) return fallback;
  if (looksTechnical(message)) return fallback;
  return message;
}
