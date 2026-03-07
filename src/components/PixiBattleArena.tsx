import { useEffect, useRef, memo } from "react";
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { Enemy, EnemyAction, FloatingText, StatusEffect } from "../types";
import { Particle, updateParticle, createDamageParticles, createHealParticles, createShieldParticles, createDeathParticles } from "../pixi/particles";

const STAGE_W = 760;
const STAGE_H = 380;
const HERO_X = 260;
const ENEMY_X = 500;
const FIGHTER_Y = 250;
const HERO_INFO_X = HERO_X - 150;  // 110
const ENEMY_INFO_X = ENEMY_X + 150; // 650
const INFO_Y = FIGHTER_Y - 65;     // info要素のベースY
const HP_BAR_W = 140;
const HP_BAR_H = 8;

function intentLabel(action: EnemyAction): { text: string; color: number } {
  switch (action.type) {
    case "attack": return { text: `ATK ${action.value}`, color: 0xe05555 };
    case "heavy_attack": return { text: `HEAVY ${action.value}`, color: 0xff3333 };
    case "block": return { text: `BLOCK +${action.value}`, color: 0x5588e0 };
    case "heal": return { text: `HEAL +${action.value}`, color: 0x55bb55 };
    case "debuff": return { text: "DEBUFF", color: 0xaa55aa };
  }
}

function ts(opts: { size?: number; fill?: string | number; bold?: boolean; spacing?: number }) {
  return new TextStyle({
    fontFamily: "Cinzel, serif",
    fontSize: opts.size ?? 13,
    fill: opts.fill ?? "#c9a84c",
    fontWeight: opts.bold ? "bold" : "normal",
    letterSpacing: opts.spacing ?? 0,
  });
}

interface StageElements {
  heroSprite: Sprite;
  enemySprite: Sprite;
  heroBaseScale: { x: number; y: number };
  enemyBaseScale: { x: number; y: number };
  heroHpFill: Graphics;
  enemyHpFill: Graphics;
  heroHpText: Text;
  enemyHpText: Text;
  enemyNameText: Text;
  energyText: Text;
  shieldText: Text;
  shieldContainer: Container;
  intentText: Text;
  intentBg: Graphics;
  enemyBlockText: Text;
  enemyBlockContainer: Container;
  particleGfx: Graphics;
  floatContainer: Container;
  bgSprite: Sprite;
  bgGfx: Graphics;
  mainContainer: Container;
  heroStatusText: Text;
  enemyStatusText: Text;
}

interface Props {
  heroHp: number; heroMaxHp: number; heroShield: number;
  energy: number; maxEnergy: number;
  enemyHp: number; enemyMaxHp: number;
  enemyBlock: number; enemyPatternIdx: number;
  enemy: Enemy; heroImg: string;
  heroAttacking: boolean; enemyAttacking: boolean;
  floats: FloatingText[];
  floorNum: number;
  heroStatuses: StatusEffect[];
  enemyStatuses: StatusEffect[];
}

function PixiBattleArena(props: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const elRef = useRef<StageElements | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const propsRef = useRef(props);
  propsRef.current = props;
  const prevEnemyHpRef = useRef(props.enemyHp);
  const prevHeroHpRef = useRef(props.heroHp);
  const prevHeroAttRef = useRef(false);
  const prevEnemyAttRef = useRef(false);
  const prevFloatsRef = useRef<FloatingText[]>([]);
  const renderedFloatIdsRef = useRef<Set<number>>(new Set());
  const prevHeroShieldRef = useRef(props.heroShield);

  // Single effect for init + ticker-based updates
  useEffect(() => {
    if (!canvasRef.current) return;

    let cancelled = false;
    let app: Application | null = null;

    const init = async () => {
      app = new Application();
      await app.init({ width: STAGE_W, height: STAGE_H, background: 0x080810, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
      if (cancelled || !canvasRef.current) {
        try { app.destroy(true, { children: true }); } catch (_) {}
        return;
      }
      canvasRef.current.appendChild(app.canvas);
      appRef.current = app;

      // Preload all character textures
      const allImgs = ["/hero.png", "/slime.png", "/goblin.png", "/orc.png", "/vampire.png", "/dragon.png", "/arena-bg.png"];
      await Assets.load(allImgs);
      if (cancelled) return;

      const main = new Container();
      app.stage.addChild(main);

      // Background image
      const bgTexture = Assets.get("/arena-bg.png") as Texture;
      const bgSprite = new Sprite(bgTexture);
      bgSprite.width = STAGE_W; bgSprite.height = STAGE_H;
      bgSprite.alpha = 0.85;
      main.addChild(bgSprite);

      // Background overlay (for tints/effects)
      const bgGfx = new Graphics();
      main.addChild(bgGfx);

      // VS
      const vsText = new Text({ text: "VS", style: ts({ size: 18, fill: "#444444", spacing: 4 }) });
      vsText.anchor.set(0.5); vsText.x = STAGE_W / 2; vsText.y = STAGE_H / 2;
      main.addChild(vsText);

      // Hero sprite
      const heroTexture = Assets.get("/hero.png") as Texture;
      const heroSprite = new Sprite(heroTexture);
      heroSprite.anchor.set(0.5);
      heroSprite.height = 160;
      heroSprite.scale.x = heroSprite.scale.y;
      heroSprite.x = HERO_X; heroSprite.y = FIGHTER_Y;
      heroSprite.blendMode = "screen";
      main.addChild(heroSprite);

      // Enemy sprite
      const p = propsRef.current;
      const enemyTexture = Assets.get(p.enemy.img) as Texture;
      const enemySprite = new Sprite(enemyTexture);
      enemySprite.anchor.set(0.5);
      enemySprite.height = p.enemy.img.includes("dragon") ? 330 : 160;
      enemySprite.scale.x = enemySprite.scale.y;
      enemySprite.x = ENEMY_X; enemySprite.y = p.enemy.img.includes("dragon") ? FIGHTER_Y - 50 : FIGHTER_Y;
      main.addChild(enemySprite);

      // Hero info background
      const heroInfoBg = new Graphics();
      heroInfoBg.roundRect(HERO_INFO_X - 82, INFO_Y + 72, 164, 120, 8);
      heroInfoBg.fill({ color: 0x000000, alpha: 0.55 });
      heroInfoBg.roundRect(HERO_INFO_X - 82, INFO_Y + 72, 164, 120, 8);
      heroInfoBg.stroke({ color: 0xc9a84c, width: 1, alpha: 0.6 });
      main.addChild(heroInfoBg);

      // Hero info
      const heroNameText = new Text({ text: "MOVEUS", style: ts({ size: 13, spacing: 4 }) });
      heroNameText.anchor.set(0.5, 0); heroNameText.x = HERO_INFO_X; heroNameText.y = INFO_Y + 80;
      main.addChild(heroNameText);

      const heroHpBg = new Graphics();
      heroHpBg.roundRect(HERO_INFO_X - HP_BAR_W / 2, INFO_Y + 100, HP_BAR_W, HP_BAR_H, 4);
      heroHpBg.fill({ color: 0x222222 });
      main.addChild(heroHpBg);

      const heroHpFill = new Graphics();
      main.addChild(heroHpFill);

      const heroHpText = new Text({ text: "", style: ts({ size: 11, fill: "#888888" }) });
      heroHpText.anchor.set(0.5, 0); heroHpText.x = HERO_INFO_X; heroHpText.y = INFO_Y + 112;
      main.addChild(heroHpText);

      const energyText = new Text({ text: "", style: ts({ size: 11, spacing: 1 }) });
      energyText.anchor.set(0.5, 0); energyText.x = HERO_INFO_X; energyText.y = INFO_Y + 130;
      main.addChild(energyText);

      const shieldContainer = new Container();
      shieldContainer.x = HERO_INFO_X; shieldContainer.y = INFO_Y + 150;
      const shieldText = new Text({ text: "", style: ts({ size: 11, fill: "#5588e0" }) });
      shieldText.anchor.set(0.5, 0);
      shieldContainer.addChild(shieldText);
      main.addChild(shieldContainer);

      // Enemy info background
      const enemyInfoBg = new Graphics();
      enemyInfoBg.roundRect(ENEMY_INFO_X - 82, INFO_Y + 72, 164, 120, 8);
      enemyInfoBg.fill({ color: 0x000000, alpha: 0.55 });
      enemyInfoBg.roundRect(ENEMY_INFO_X - 82, INFO_Y + 72, 164, 120, 8);
      enemyInfoBg.stroke({ color: 0xc9a84c, width: 1, alpha: 0.6 });
      main.addChild(enemyInfoBg);

      // Enemy info
      const enemyNameText = new Text({ text: p.enemy.name, style: ts({ size: 13, spacing: 4 }) });
      enemyNameText.anchor.set(0.5, 0); enemyNameText.x = ENEMY_INFO_X; enemyNameText.y = INFO_Y + 80;
      main.addChild(enemyNameText);

      const enemyHpBg = new Graphics();
      enemyHpBg.roundRect(ENEMY_INFO_X - HP_BAR_W / 2, INFO_Y + 100, HP_BAR_W, HP_BAR_H, 4);
      enemyHpBg.fill({ color: 0x222222 });
      main.addChild(enemyHpBg);

      const enemyHpFill = new Graphics();
      main.addChild(enemyHpFill);

      const enemyHpText = new Text({ text: "", style: ts({ size: 11, fill: "#888888" }) });
      enemyHpText.anchor.set(0.5, 0); enemyHpText.x = ENEMY_INFO_X; enemyHpText.y = INFO_Y + 112;
      main.addChild(enemyHpText);

      const intentBg = new Graphics();
      main.addChild(intentBg);
      const intentText = new Text({ text: "", style: ts({ size: 10, spacing: 2 }) });
      intentText.anchor.set(0.5, 0.5); intentText.x = ENEMY_INFO_X; intentText.y = INFO_Y + 139;
      main.addChild(intentText);

      const enemyBlockContainer = new Container();
      enemyBlockContainer.x = ENEMY_INFO_X; enemyBlockContainer.y = INFO_Y + 158;
      const enemyBlockText = new Text({ text: "", style: ts({ size: 11, fill: "#5588e0" }) });
      enemyBlockText.anchor.set(0.5, 0);
      enemyBlockContainer.addChild(enemyBlockText);
      main.addChild(enemyBlockContainer);

      // Status effect text displays
      const heroStatusText = new Text({ text: "", style: ts({ size: 10, fill: "#aaaaaa" }) });
      heroStatusText.anchor.set(0.5, 0); heroStatusText.x = HERO_INFO_X; heroStatusText.y = INFO_Y + 168;
      main.addChild(heroStatusText);

      const enemyStatusText = new Text({ text: "", style: ts({ size: 10, fill: "#aaaaaa" }) });
      enemyStatusText.anchor.set(0.5, 0); enemyStatusText.x = ENEMY_INFO_X; enemyStatusText.y = INFO_Y + 175;
      main.addChild(enemyStatusText);

      const particleGfx = new Graphics();
      main.addChild(particleGfx);

      const floatContainer = new Container();
      main.addChild(floatContainer);

      // Capture base scale after width/height are set
      const heroBaseScale = { x: heroSprite.scale.x, y: heroSprite.scale.y };
      const enemyBaseScale = { x: enemySprite.scale.x, y: enemySprite.scale.y };

      const el: StageElements = {
        heroSprite, enemySprite, heroBaseScale, enemyBaseScale,
        heroHpFill, enemyHpFill, heroHpText, enemyHpText,
        enemyNameText, energyText, shieldText, shieldContainer,
        intentText, intentBg, enemyBlockText, enemyBlockContainer,
        particleGfx, floatContainer, bgSprite, bgGfx, mainContainer: main,
        heroStatusText, enemyStatusText,
      };
      elRef.current = el;

      // Main ticker — reads propsRef.current each frame
      app.ticker.add(() => {
        const s = elRef.current;
        if (!s) return;
        const cp = propsRef.current;

        // HP bars
        const heroPct = Math.max(0, cp.heroHp / cp.heroMaxHp);
        s.heroHpFill.clear();
        if (heroPct > 0) {
          s.heroHpFill.roundRect(HERO_INFO_X - HP_BAR_W / 2, INFO_Y + 100, HP_BAR_W * heroPct, HP_BAR_H, 4);
          s.heroHpFill.fill({ color: heroPct > 0.5 ? 0xc41a1a : heroPct > 0.25 ? 0xe06030 : 0xe05555 });
        }
        s.heroHpText.text = `${cp.heroHp} / ${cp.heroMaxHp}`;

        const enemyPct = Math.max(0, cp.enemyHp / cp.enemyMaxHp);
        s.enemyHpFill.clear();
        if (enemyPct > 0) {
          s.enemyHpFill.roundRect(ENEMY_INFO_X - HP_BAR_W / 2, INFO_Y + 100, HP_BAR_W * enemyPct, HP_BAR_H, 4);
          s.enemyHpFill.fill({ color: enemyPct > 0.5 ? 0xc41a1a : enemyPct > 0.25 ? 0xe06030 : 0xe05555 });
        }
        s.enemyHpText.text = `${cp.enemyHp} / ${cp.enemyMaxHp}`;

        // Energy & Shield
        s.energyText.text = `⚡ ${"◆".repeat(cp.energy)}${"◇".repeat(Math.max(0, cp.maxEnergy - cp.energy))}`;
        s.shieldContainer.visible = cp.heroShield > 0;
        if (cp.heroShield > 0) s.shieldText.text = `🛡 ${cp.heroShield}`;

        // Intent
        const intent = intentLabel(cp.enemy.pattern[cp.enemyPatternIdx % cp.enemy.pattern.length]);
        s.intentText.text = intent.text;
        s.intentText.style.fill = intent.color;
        s.intentBg.clear();
        s.intentBg.roundRect(ENEMY_INFO_X - 40, INFO_Y + 130, 80, 18, 3);
        s.intentBg.fill({ color: 0x000000, alpha: 0.5 });
        s.intentBg.roundRect(ENEMY_INFO_X - 40, INFO_Y + 130, 80, 18, 3);
        s.intentBg.stroke({ color: intent.color, width: 1, alpha: 0.6 });

        // Enemy block
        s.enemyBlockContainer.visible = cp.enemyBlock > 0;
        if (cp.enemyBlock > 0) s.enemyBlockText.text = `🛡 ${cp.enemyBlock}`;

        // Status effects display
        const statusIcons: Record<string, string> = {
          poison: "☠", strength: "💪", weak: "📉", vulnerable: "🎯", burn: "🔥",
        };
        const fmtStatuses = (statuses: StatusEffect[]) =>
          statuses.map(s => `${statusIcons[s.type] || "?"}${s.stacks}`).join(" ");
        s.heroStatusText.text = fmtStatuses(cp.heroStatuses ?? []);
        s.enemyStatusText.text = fmtStatuses(cp.enemyStatuses ?? []);

        // Update enemy sprite texture & name when floor changes
        s.enemyNameText.text = cp.enemy.name;
        const tex = Assets.get(cp.enemy.img);
        if (tex && s.enemySprite.texture !== tex) {
          s.enemySprite.texture = tex;
          s.enemySprite.height = cp.enemy.img.includes("dragon") ? 330 : 160;
          s.enemySprite.scale.x = s.enemySprite.scale.y;
          s.enemySprite.y = cp.enemy.img.includes("dragon") ? FIGHTER_Y - 50 : FIGHTER_Y;
          s.enemyBaseScale.x = s.enemySprite.scale.x;
          s.enemyBaseScale.y = s.enemySprite.scale.y;
        }

        // Background overlay (darken bottom, boss tint)
        s.bgGfx.clear();
        s.bgGfx.rect(0, STAGE_H - 60, STAGE_W, 60);
        s.bgGfx.fill({ color: 0x000000, alpha: 0.35 });
        if (cp.floorNum >= 4) {
          s.bgGfx.rect(0, 0, STAGE_W, STAGE_H);
          s.bgGfx.fill({ color: 0x8a0000, alpha: 0.15 });
        }

        // Hero attack trigger
        if (cp.heroAttacking && !prevHeroAttRef.current) {
          s.heroSprite.x = HERO_X + 60;
          s.heroSprite.scale.set(s.heroBaseScale.x * 1.12, s.heroBaseScale.y * 1.12);
          particlesRef.current.push(...createDamageParticles(ENEMY_X, FIGHTER_Y + 30));
          setTimeout(() => {
            s.heroSprite.x = HERO_X;
            s.heroSprite.y = FIGHTER_Y;
            s.heroSprite.scale.set(s.heroBaseScale.x, s.heroBaseScale.y);
          }, 200);
        }
        prevHeroAttRef.current = cp.heroAttacking;

        // Enemy attack trigger
        if (cp.enemyAttacking && !prevEnemyAttRef.current) {
          s.enemySprite.x = ENEMY_X - 60;
          s.enemySprite.scale.set(s.enemyBaseScale.x * 1.12, s.enemyBaseScale.y * 1.12);
          particlesRef.current.push(...createDamageParticles(HERO_X, FIGHTER_Y + 30, 5));
          let shakeCount = 0;
          const shakeInterval = setInterval(() => {
            const offset = (shakeCount % 2 === 0 ? 1 : -1) * Math.max(0, 6 - shakeCount);
            s.mainContainer.x = offset;
            shakeCount++;
            if (shakeCount > 5) { clearInterval(shakeInterval); s.mainContainer.x = 0; }
          }, 40);
          setTimeout(() => {
            s.enemySprite.x = ENEMY_X;
            s.enemySprite.y = cp.enemy.img.includes("dragon") ? FIGHTER_Y - 50 : FIGHTER_Y;
            s.enemySprite.scale.set(s.enemyBaseScale.x, s.enemyBaseScale.y);
          }, 200);
        }
        prevEnemyAttRef.current = cp.enemyAttacking;

        // Heal particles (hero HP went up)
        if (cp.heroHp > prevHeroHpRef.current) {
          particlesRef.current.push(...createHealParticles(HERO_X, FIGHTER_Y + 30));
        }

        prevHeroHpRef.current = cp.heroHp;

        // Shield particles (hero shield went up)
        if (cp.heroShield > prevHeroShieldRef.current) {
          particlesRef.current.push(...createShieldParticles(HERO_X, FIGHTER_Y + 30));
        }
        prevHeroShieldRef.current = cp.heroShield;

        // Death particles + enemy fade-out
        if (cp.enemyHp <= 0 && prevEnemyHpRef.current > 0) {
          particlesRef.current.push(...createDeathParticles(ENEMY_X, FIGHTER_Y + 40));
          const fadeStart = Date.now();
          const fadeTick = () => {
            const t = Math.min(1, (Date.now() - fadeStart) / 600);
            s.enemySprite.alpha = 1 - t;
            if (t < 1) requestAnimationFrame(fadeTick);
          };
          requestAnimationFrame(fadeTick);
        }
        // Reset enemy alpha when new enemy appears
        if (cp.enemyHp > 0 && prevEnemyHpRef.current <= 0) {
          s.enemySprite.alpha = 1;
        }
        prevEnemyHpRef.current = cp.enemyHp;

        // Float texts — only render newly added floats (ID tracking to avoid duplicates)
        if (cp.floats !== prevFloatsRef.current) {
          for (const ft of cp.floats) {
            if (renderedFloatIdsRef.current.has(ft.id)) continue;
            renderedFloatIdsRef.current.add(ft.id);
            const fx = (ft.x / 100) * STAGE_W;
            const fy = (ft.y / 100) * STAGE_H + 20;
            const txt = new Text({ text: ft.text, style: ts({ size: 26, fill: ft.color, bold: true }) });
            txt.anchor.set(0.5); txt.x = fx; txt.y = fy;
            s.floatContainer.addChild(txt);
            const start = Date.now();
            const animTick = () => {
              const progress = Math.min(1, (Date.now() - start) / 1000);
              txt.y = fy - 60 * progress;
              txt.alpha = 1 - progress;
              if (progress < 1) requestAnimationFrame(animTick);
              else {
                renderedFloatIdsRef.current.delete(ft.id);
                s.floatContainer.removeChild(txt); txt.destroy();
              }
            };
            requestAnimationFrame(animTick);
          }
        }
        prevFloatsRef.current = cp.floats;

        // Particles
        s.particleGfx.clear();
        particlesRef.current = particlesRef.current.map(updateParticle).filter(p => p.life > 0);
        for (const p of particlesRef.current) {
          s.particleGfx.circle(p.x, p.y, p.size);
          s.particleGfx.fill({ color: p.color, alpha: p.alpha });
        }
      });
    };

    init();

    return () => {
      cancelled = true;
      try { appRef.current?.destroy(true, { children: true }); } catch (_) {}
      appRef.current = null;
      elRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={canvasRef}
      className="pixi-arena"
      style={{
        border: "1px solid #3a2a1a",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.8), 0 0 20px rgba(139,60,20,0.1)",
        marginBottom: 16,
        overflow: "hidden",
      }}
    />
  );
}

export default memo(PixiBattleArena);
