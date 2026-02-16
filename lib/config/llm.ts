const IS_PROD = process.env.NODE_ENV === 'production';

export const DEMO_MODE_DISABLED_ERROR = 'حالت دمو غیرفعال است و بک‌اند آماده نیست.';

function readOptionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const apiKey = readOptionalEnv(process.env.NEXT_PUBLIC_OPENROUTER_API_KEY);

export const llmConfig = {
  demoMode,
  openRouter: {
    apiKey,
    defaultModel: readOptionalEnv(process.env.NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL) ?? 'openai/gpt-4o-mini',
    baseUrl: readOptionalEnv(process.env.NEXT_PUBLIC_OPENROUTER_BASE_URL) ?? 'https://openrouter.ai/api/v1',
    siteUrl: readOptionalEnv(process.env.NEXT_PUBLIC_OPENROUTER_SITE_URL),
    appName: readOptionalEnv(process.env.NEXT_PUBLIC_OPENROUTER_APP_NAME) ?? 'AI Interface'
  }
} as const;

export function assertDemoModeReady() {
  if (!llmConfig.demoMode) {
    throw new Error(DEMO_MODE_DISABLED_ERROR);
  }

  if (!llmConfig.openRouter.apiKey) {
    throw new Error('کلید OpenRouter تنظیم نشده است. NEXT_PUBLIC_OPENROUTER_API_KEY را وارد کنید.');
  }
}

export function canUseDirectOpenRouterInBrowser() {
  return llmConfig.demoMode && Boolean(llmConfig.openRouter.apiKey);
}

export function logBackendHint() {
  if (IS_PROD) return;
  console.info(
    '[llm] Demo mode is disabled. Configure a backend LLM provider or set NEXT_PUBLIC_DEMO_MODE=true for local/demo usage only.'
  );
}
