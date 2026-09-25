export type OtpLane = 'activation' | 'registration' | 'recovery';

export type OtpHold = {
  id: number;
  seconds: number;
  startedAt: number;
};

export type OtpLanes = Record<OtpLane, OtpHold | null>;

export function emptyOtpLanes(): OtpLanes {
  return {activation: null, registration: null, recovery: null};
}

export function armOtpLane(
  lanes: OtpLanes,
  lane: OtpLane,
  seconds: number | null | undefined,
  now: number
): OtpLanes {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return lanes;
  }

  return {
    ...lanes,
    [lane]: {
      id: (lanes[lane]?.id ?? 0) + 1,
      seconds: Math.ceil(seconds),
      startedAt: now
    }
  };
}

export function otpSecondsLeft(hold: OtpHold | null, now: number): number {
  if (!hold) return 0;
  const elapsed = Math.floor((now - hold.startedAt) / 1000);
  return Math.max(0, hold.seconds - elapsed);
}
