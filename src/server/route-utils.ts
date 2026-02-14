import {NextResponse} from 'next/server';
import {AvalaiHttpError} from './avalai';

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        message,
        details
      }
    },
    {status}
  );
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AvalaiHttpError) {
    return jsonError(error.message, error.status, error.payload);
  }

  if (error instanceof Error) {
    return jsonError(error.message, 400);
  }

  return jsonError('Unexpected server error.', 500);
}
