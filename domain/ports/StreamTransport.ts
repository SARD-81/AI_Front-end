export interface StreamCallbacks {
  onDelta: (delta: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export interface StreamTransport {
  streamChat(
    payload: Record<string, unknown>,
    options: StreamCallbacks & { signal?: AbortSignal },
  ): Promise<void>;
}
