import {canUseDirectOpenRouterInBrowser, llmConfig} from '@/lib/config/llm';
import {OpenRouterBffProvider} from '@/lib/llm/providers/openrouter-bff';
import {OpenRouterBrowserProvider} from '@/lib/llm/providers/openrouter-browser';
import type {LlmProvider} from '@/lib/llm/types';

const bffProvider = new OpenRouterBffProvider();
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

  return bffProvider;
}
