/**
 * Staging capacity plan. This file does not generate load.
 * It exits until an operator supplies agreed SLO numbers and an explicit
 * staging confirmation. Do not point it at production.
 *
 * Required environment:
 *   STAGING_BASE_URL          https staging origin, not a production host
 *   CONFIRM_STAGING=yes
 *   SLO_P95_MS                agreed p95 for ordinary BFF routes
 *   SLO_P99_MS                agreed p99 for ordinary BFF routes
 *   SLO_ERROR_RATE            agreed error ratio, for example 0.01
 *   SLO_AI_FIRST_BYTE_MS      agreed time to first model token
 *   SLO_MAX_SMS_PER_RUN       agreed SMS ceiling
 *   SLO_MAX_AI_REQUESTS       agreed model-call ceiling
 */
const productionMarkers = ['sbu.ac.ir', 'soha.sbu'];

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

const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error('Refusing to plan a load run without agreed targets:');
  for (const key of missing) console.error(`  ${key}`);
  console.error('These numbers are not invented by the frontend repository.');
  process.exit(2);
}

if (process.env.CONFIRM_STAGING !== 'yes') {
  console.error('Set CONFIRM_STAGING=yes only for a non-production staging host.');
  process.exit(2);
}

const base = process.env.STAGING_BASE_URL;
if (productionMarkers.some((marker) => base.toLowerCase().includes(marker))) {
  console.error('Refusing a host that looks like the university production name.');
  process.exit(2);
}

const scenarios = [
  '1. Concurrent login and OTP against the real limiter, under SLO_MAX_SMS_PER_RUN.',
  '2. Open short conversations and conversations longer than the compat scan ceiling.',
  '3. Ramp sessions toward 15000 only if the staging budget allows. Stop on SLO breach.',
  '4. Several message rates and concurrent WebSocket counts, under SLO_MAX_AI_REQUESTS.',
  '5. Two or more BFF instances with one session refreshing at the same time.',
  '6. Slow or cut AI, Django, Redis, or one BFF instance.',
  '7. A soak and a recovery pass after the pressure stops.'
];

console.log(
  JSON.stringify(
    {
      base,
      slo: {
        p95Ms: Number(process.env.SLO_P95_MS),
        p99Ms: Number(process.env.SLO_P99_MS),
        errorRate: Number(process.env.SLO_ERROR_RATE),
        aiFirstByteMs: Number(process.env.SLO_AI_FIRST_BYTE_MS),
        maxSmsPerRun: Number(process.env.SLO_MAX_SMS_PER_RUN),
        maxAiRequests: Number(process.env.SLO_MAX_AI_REQUESTS)
      },
      scenarios,
      note: 'Printing this plan does not execute load and is not a capacity result.'
    },
    null,
    2
  )
);
