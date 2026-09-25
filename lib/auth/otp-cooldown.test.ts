import {describe, expect, it} from 'vitest';
import {armOtpLane, emptyOtpLanes, otpSecondsLeft} from '@/lib/auth/otp-cooldown';

describe('otp cooldown lanes', () => {
  it('restarts when a later success repeats the same retry_after', () => {
    const first = armOtpLane(emptyOtpLanes(), 'registration', 60, 1_000);
    const later = armOtpLane(first, 'registration', 60, 61_000);

    expect(later.registration?.id).toBe(2);
    expect(later.registration?.startedAt).toBe(61_000);
    expect(otpSecondsLeft(first.registration, 61_000)).toBe(0);
    expect(otpSecondsLeft(later.registration, 61_000)).toBe(60);
  });

  it('keeps activation, registration, and recovery clocks apart', () => {
    let lanes = emptyOtpLanes();
    lanes = armOtpLane(lanes, 'registration', 60, 1_000);
    lanes = armOtpLane(lanes, 'activation', 30, 5_000);
    lanes = armOtpLane(lanes, 'recovery', 60, 10_000);

    expect(otpSecondsLeft(lanes.registration, 10_000)).toBe(51);
    expect(otpSecondsLeft(lanes.activation, 10_000)).toBe(25);
    expect(otpSecondsLeft(lanes.recovery, 10_000)).toBe(60);
    expect(lanes.registration?.id).toBe(1);
    expect(lanes.activation?.id).toBe(1);
    expect(lanes.recovery?.id).toBe(1);
  });

  it('arms a 429 retry_after without touching the other lanes', () => {
    const armed = armOtpLane(emptyOtpLanes(), 'recovery', 3600, 2_000);
    const limited = armOtpLane(armed, 'recovery', 3600, 8_000);

    expect(limited.activation).toBeNull();
    expect(limited.registration).toBeNull();
    expect(limited.recovery?.id).toBe(2);
    expect(otpSecondsLeft(limited.recovery, 8_000)).toBe(3600);
  });
});
