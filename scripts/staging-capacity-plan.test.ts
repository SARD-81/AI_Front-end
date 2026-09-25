import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const { assessCapacityPlan } = createRequire(import.meta.url)(
  './staging-capacity-plan.mjs'
) as {
  assessCapacityPlan: (env: Record<string, string | undefined>) => {
    ok: boolean;
    errors: string[];
    plan?: { executesLoad: boolean };
  };
};

const valid = {
  STAGING_BASE_URL: 'https://staging.example.test',
  CONFIRM_STAGING: 'yes',
  SLO_P95_MS: '400',
  SLO_P99_MS: '900',
  SLO_ERROR_RATE: '0.01',
  SLO_AI_FIRST_BYTE_MS: '2000',
  SLO_MAX_SMS_PER_RUN: '20',
  SLO_MAX_AI_REQUESTS: '50'
};

describe('staging capacity plan', () => {
  it('prints a plan only when every target is a real bound', () => {
    const result = assessCapacityPlan(valid);
    expect(result.ok).toBe(true);
    expect(result.plan?.executesLoad).toBe(false);
  });

  it.each([
    ['SLO_P95_MS', 'abc'],
    ['SLO_P99_MS', '-2'],
    ['SLO_ERROR_RATE', '9'],
    ['SLO_MAX_AI_REQUESTS', '-1'],
    ['SLO_MAX_SMS_PER_RUN', '0']
  ])('rejects %s=%s', (key, value) => {
    const result = assessCapacityPlan({ ...valid, [key]: value });
    expect(result.ok).toBe(false);
  });

  it('rejects p99 below p95, a non-https URL, and a production-looking host', () => {
    expect(assessCapacityPlan({ ...valid, SLO_P99_MS: '100' }).ok).toBe(false);
    expect(
      assessCapacityPlan({
        ...valid,
        STAGING_BASE_URL: 'http://staging.example.test'
      }).ok
    ).toBe(false);
    expect(
      assessCapacityPlan({
        ...valid,
        STAGING_BASE_URL: 'https://soha.sbu.ac.ir'
      }).ok
    ).toBe(false);
  });

  it('exits non-zero for an invalid invocation and does not claim it ran load', () => {
    const child = spawnSync(
      process.execPath,
      ['scripts/staging-capacity-plan.mjs'],
      {
        env: { ...process.env, ...valid, SLO_P95_MS: 'abc' },
        encoding: 'utf8'
      }
    );
    expect(child.status).not.toBe(0);
    expect(child.stdout).not.toContain('executesLoad');
  });
});
