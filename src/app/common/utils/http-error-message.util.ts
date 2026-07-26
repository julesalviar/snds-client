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

function readMessageField(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const lines = value.flatMap(formatErrorMessageEntry);
    return lines.length > 0 ? lines.join(' ') : null;
  }
  return null;
}

function isAngularHttpFailureMessage(message: string): boolean {
  return /^Http failure response for /i.test(message);
}

function readErrorBody(err: unknown): unknown {
  if (err && typeof err === 'object' && 'error' in err) {
    return (err as { error?: unknown }).error;
  }
  return err;
}

export function getHttpErrorMessage(err: unknown, fallback: string): string {
  const errorBody = readErrorBody(err);

  if (errorBody && typeof errorBody === 'object') {
    const body = errorBody as Record<string, unknown>;
    const fromMessage = readMessageField(body['message']);
    if (fromMessage) {
      return fromMessage;
    }

    if (body['data'] && typeof body['data'] === 'object') {
      const nested = readMessageField(
        (body['data'] as Record<string, unknown>)['message'],
      );
      if (nested) {
        return nested;
      }
    }

    const fromError = readMessageField(body['error']);
    if (
      fromError &&
      fromError !== 'Forbidden' &&
      fromError !== 'Bad Request' &&
      fromError !== 'Internal Server Error'
    ) {
      return fromError;
    }
  }

  if (typeof errorBody === 'string' && errorBody.trim()) {
    return errorBody.trim();
  }

  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (
      typeof message === 'string' &&
      message.trim() &&
      !isAngularHttpFailureMessage(message)
    ) {
      return message.trim();
    }
  }

  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: number }).status;
    if (status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (status === 0) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
  }

  return fallback;
}
