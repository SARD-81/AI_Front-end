/**
 * Prints a staging capacity plan. It does not open sockets, send traffic,
 * or generate load. Invalid targets exit 2.
 *
 * Required environment:
 *   STAGING_BASE_URL          https staging origin, not a production host
 *   CONFIRM_STAGING=yes
 *   SLO_P95_MS                finite milliseconds, greater than 0
 *   SLO_P99_MS                finite milliseconds, greater than or equal to p95
 *   SLO_ERROR_RATE            finite ratio from 0 through 1
 *   SLO_AI_FIRST_BYTE_MS      finite milliseconds, greater than 0
 *   SLO_MAX_SMS_PER_RUN       finite count, greater than 0
 *   SLO_MAX_AI_REQUESTS       finite count, greater than 0
 */
import {pathToFileURL} from 'node:url';

const productionMarkers = ['sbu.ac.ir', 'soha.sbu'];

export function assessCapacityPlan(env) {
  const errors = [];
  const required = [
    'STAGING_BASE_URL',
    'CONFIRM_STAGING',
    'SLO_P95_MS',
    'SLO_P99_MS',
    'SLO_ERROR_RATE',
    'SLO_AI_FIRST_BYTE_MS',
    'SLO_MAX_SMS_PER_RUN',
    'SLO_MAX_AI_REQUESTS'
  ];
  for (const key of required) {
    if (!env[key]?.trim()) errors.push(`${key} is required`);
  }
  if (errors.length > 0) return {ok: false, errors};

  if (env.CONFIRM_STAGING !== 'yes') {
    errors.push('CONFIRM_STAGING must be yes');
  }

  let base;
  try {
    base = new URL(env.STAGING_BASE_URL);
  } catch {
    errors.push('STAGING_BASE_URL must be a valid URL');
    return {ok: false, errors};
  }
  if (base.protocol !== 'https:') errors.push('STAGING_BASE_URL must use https');
  if (productionMarkers.some((marker) => env.STAGING_BASE_URL.toLowerCase().includes(marker))) {
    errors.push('STAGING_BASE_URL looks like a production host');
  }

  const positive = (key) => {
    const value = Number(env[key]);
    if (!Number.isFinite(value) || value <= 0) errors.push(`${key} must be a finite number greater than 0`);
    return value;
  };
  const p95 = positive('SLO_P95_MS');
  const p99 = positive('SLO_P99_MS');
  const ai = positive('SLO_AI_FIRST_BYTE_MS');
  const sms = positive('SLO_MAX_SMS_PER_RUN');
  const model = positive('SLO_MAX_AI_REQUESTS');
  if (Number.isFinite(p95) && Number.isFinite(p99) && p99 < p95) {
    errors.push('SLO_P99_MS must be greater than or equal to SLO_P95_MS');
  }
  const errorRate = Number(env.SLO_ERROR_RATE);
  if (!Number.isFinite(errorRate) || errorRate < 0 || errorRate > 1) {
    errors.push('SLO_ERROR_RATE must be a finite ratio from 0 through 1');
  }

  if (errors.length > 0) return {ok: false, errors};
  return {
    ok: true,
    errors: [],
    plan: {
      base: base.origin,
      executesLoad: false,
      slo: {p95Ms: p95, p99Ms: p99, errorRate, aiFirstByteMs: ai, maxSmsPerRun: sms, maxAiRequests: model},
      scenarios: [
        '1. Concurrent login and OTP against the real limiter, under SLO_MAX_SMS_PER_RUN.',
        '2. Open short conversations and conversations longer than the compat scan ceiling.',
        '3. Ramp sessions toward 15000 only if the staging budget allows. Stop on SLO breach.',
        '4. Several message rates and concurrent WebSocket counts, under SLO_MAX_AI_REQUESTS.',
        '5. Two or more BFF instances with one session refreshing at the same time.',
        '6. Slow or cut AI, Django, Redis, or one BFF instance.',
        '7. A soak and a recovery pass after the pressure stops.'
      ],
      note: 'This process only printed a plan. It did not generate load and it is not a capacity result.'
    }
  };
}

function main() {
  const result = assessCapacityPlan(process.env);
  if (!result.ok) {
    console.error('Refusing to print a capacity plan:');
    for (const error of result.errors) console.error(`  ${error}`);
    console.error('These numbers are not invented by the frontend repository.');
    process.exit(2);
  }
  console.log(JSON.stringify(result.plan, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
