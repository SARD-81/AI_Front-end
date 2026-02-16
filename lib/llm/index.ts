import {canUseDirectOpenRouterInBrowser, DEMO_MODE_DISABLED_ERROR, llmConfig} from '@/lib/config/llm';
import {BackendPlaceholderProvider} from '@/lib/llm/providers/backend-placeholder';
import {OpenRouterBrowserProvider} from '@/lib/llm/providers/openrouter-browser';
import type {LlmProvider} from '@/lib/llm/types';

const backendProvider = new BackendPlaceholderProvider();
const demoProvider = new OpenRouterBrowserProvider();

export function getLlmProvider(): LlmProvider {
  if (llmConfig.demoMode) {
    if (canUseDirectOpenRouterInBrowser()) {
      return demoProvider;
    }

    return {
      async sendStreamingChat() {
        throw new Error('کلید OpenRouter برای حالت دمو تنظیم نشده است.');
      }
    };
  }

  return {
    async sendStreamingChat(input, onToken, onDone) {
      try {
        await backendProvider.sendStreamingChat(input, onToken, onDone);
      } catch {
        throw new Error(DEMO_MODE_DISABLED_ERROR);
      }
    }
  };
}
