export interface TweenState {
  x: number;
  y: number;
  scale: number;
  alpha: number;
  rotation: number;
}

export interface Tween {
  id: string;
  startTime: number;
  duration: number;
  from: Partial<TweenState>;
  to: Partial<TweenState>;
  current: TweenState;
  done: boolean;
  onComplete?: () => void;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function updateTween(tween: Tween, now: number): Tween {
  const elapsed = now - tween.startTime;
  const rawT = Math.min(1, elapsed / tween.duration);
  const t = easeOutQuad(rawT);

  const current = { ...tween.current };
  for (const key of Object.keys(tween.to) as (keyof TweenState)[]) {
    const from = tween.from[key] ?? tween.current[key];
    const to = tween.to[key]!;
    (current as any)[key] = lerp(from as number, to as number, t);
  }

  const done = rawT >= 1;
  if (done && tween.onComplete) tween.onComplete();
  return { ...tween, current, done };
}

export function createTween(
  id: string,
  from: Partial<TweenState>,
  to: Partial<TweenState>,
  duration: number,
  onComplete?: () => void,
): Tween {
  const defaultState: TweenState = { x: 0, y: 0, scale: 1, alpha: 1, rotation: 0 };
  return {
    id, startTime: Date.now(), duration, from, to,
    current: { ...defaultState, ...from },
    done: false, onComplete,
  };
}

export function createAttackTween(
  id: string,
  startX: number,
  targetX: number,
  y: number,
): Tween[] {
  const now = Date.now();
  return [
    {
      id: `${id}-lunge`,
      startTime: now,
      duration: 150,
      from: { x: startX, y, scale: 1 },
      to: { x: targetX, y, scale: 1.15 },
      current: { x: startX, y, scale: 1, alpha: 1, rotation: 0 },
      done: false,
    },
    {
      id: `${id}-return`,
      startTime: now + 150,
      duration: 250,
      from: { x: targetX, y, scale: 1.15 },
      to: { x: startX, y, scale: 1 },
      current: { x: targetX, y, scale: 1.15, alpha: 1, rotation: 0 },
      done: false,
    },
  ];
}

export function createShakeTween(id: string, x: number, y: number, intensity = 6): Tween[] {
  const now = Date.now();
  const tweens: Tween[] = [];
  for (let i = 0; i < 4; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const decay = 1 - (i / 4);
    tweens.push({
      id: `${id}-shake-${i}`,
      startTime: now + i * 50,
      duration: 50,
      from: { x: x, y },
      to: { x: x + intensity * dir * decay, y },
      current: { x, y, scale: 1, alpha: 1, rotation: 0 },
      done: false,
    });
  }
  tweens.push({
    id: `${id}-shake-reset`,
    startTime: now + 200,
    duration: 100,
    from: { x: x + intensity * -1 * 0.25 },
    to: { x },
    current: { x, y, scale: 1, alpha: 1, rotation: 0 },
    done: false,
  });
  return tweens;
}
