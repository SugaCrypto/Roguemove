export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
}

let particleId = 0;

export function createDamageParticles(x: number, y: number, count = 8): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 1.5 + Math.random() * 2.5;
    particles.push({
      id: ++particleId,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 30 + Math.random() * 20,
      maxLife: 30 + Math.random() * 20,
      size: 2 + Math.random() * 3,
      color: Math.random() > 0.5 ? 0xe05555 : 0xff6633,
      alpha: 1,
    });
  }
  return particles;
}

export function createHealParticles(x: number, y: number, count = 6): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: ++particleId,
      x: x + (Math.random() - 0.5) * 40,
      y: y + Math.random() * 20,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -1 - Math.random() * 1.5,
      life: 40 + Math.random() * 20,
      maxLife: 40 + Math.random() * 20,
      size: 2 + Math.random() * 2,
      color: 0x55bb55,
      alpha: 1,
    });
  }
  return particles;
}

export function createShieldParticles(x: number, y: number, count = 5): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    particles.push({
      id: ++particleId,
      x: x + Math.cos(angle) * 25,
      y: y + Math.sin(angle) * 25,
      vx: Math.cos(angle) * 0.8,
      vy: Math.sin(angle) * 0.8,
      life: 25 + Math.random() * 10,
      maxLife: 25 + Math.random() * 10,
      size: 2 + Math.random() * 2,
      color: 0x5588e0,
      alpha: 0.8,
    });
  }
  return particles;
}

export function createDeathParticles(x: number, y: number, count = 20): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
    const speed = 2 + Math.random() * 4;
    particles.push({
      id: ++particleId,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 40 + Math.random() * 30,
      maxLife: 40 + Math.random() * 30,
      size: 3 + Math.random() * 4,
      color: [0xe05555, 0xff6633, 0xffaa00, 0xc9a84c][Math.floor(Math.random() * 4)],
      alpha: 1,
    });
  }
  return particles;
}

export function updateParticle(p: Particle): Particle {
  return {
    ...p,
    x: p.x + p.vx,
    y: p.y + p.vy,
    vy: p.vy + 0.02,
    life: p.life - 1,
    alpha: Math.max(0, p.life / p.maxLife),
    size: p.size * (0.98 + 0.02 * (p.life / p.maxLife)),
  };
}
