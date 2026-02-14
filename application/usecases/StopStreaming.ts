export class StopStreaming {
  execute(abortController?: AbortController | null) {
    abortController?.abort();
  }
}
