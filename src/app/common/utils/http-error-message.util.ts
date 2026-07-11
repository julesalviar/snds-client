function formatErrorMessageEntry(entry: unknown): string[] {
  if (typeof entry === 'string' && entry.trim()) {
    return [entry.trim()];
  }
  if (entry && typeof entry === 'object' && 'constraints' in entry) {
    const constraints = (entry as { constraints?: Record<string, string> })
      .constraints;
    if (!constraints) {
      return [];
    }
    return Object.values(constraints).filter(
      (message) => typeof message === 'string' && message.trim(),
    );
  }
  return [];
}

export function getHttpErrorMessage(err: unknown, fallback: string): string {
  const errorBody =
    err && typeof err === 'object' && 'error' in err
      ? (err as { error?: unknown }).error
      : err;

  if (errorBody && typeof errorBody === 'object' && 'message' in errorBody) {
    const message = (errorBody as { message?: unknown }).message;
    if (Array.isArray(message)) {
      const lines = message.flatMap(formatErrorMessageEntry);
      if (lines.length > 0) {
        return lines.join(' ');
      }
    }
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  if (typeof errorBody === 'string' && errorBody.trim()) {
    return errorBody.trim();
  }

  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}
