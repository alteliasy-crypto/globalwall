import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MAINTENANCE_ETA } from "@/lib/version";
import { Sparkles, Heart, Trophy, Zap, Rocket, PartyPopper } from "lucide-react";

interface Props {
  dismissLabel?: string;
  onDismiss?: () => void;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  emoji: string;
  popped: boolean;
}

const BUBBLE_EMOJIS = ["🌟", "🎈", "🍩", "🌈", "🍕", "💎", "🔥", "🦄", "🍀", "🪐"];

export const MaintenanceScreen = ({ dismissLabel = "Enter the wall", onDismiss }: Props) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const idRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const comboTimerRef = useRef<number | null>(null);

  const rewardLabel = useMemo(() => {
    if (score >= 60) return "legendary wall goblin";
    if (score >= 35) return "pinball prophet";
    if (score >= 20) return "dopamine engineer";
    if (score >= 8) return "bubble bandit";
    return "warm-up mode";
  }, [score]);

  useEffect(() => {
    const spawn = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const id = ++idRef.current;
      const x = Math.random() * (rect.width - 60) + 30;
      const y = Math.random() * (rect.height - 60) + 30;
      const emoji = BUBBLE_EMOJIS[Math.floor(Math.random() * BUBBLE_EMOJIS.length)];
      setBubbles((p) => [...p, { id, x, y, emoji, popped: false }]);
      setTimeout(() => setBubbles((p) => p.filter((b) => b.id !== id)), 3500);
    };
    const t = setInterval(spawn, 700);
    return () => clearInterval(t);
  }, []);

  const pop = (id: number) => {
    setBubbles((p) => p.map((b) => (b.id === id ? { ...b, popped: true } : b)));
    setScore((s) => s + 1);
    setCombo((c) => c + 1);
    if (comboTimerRef.current) window.clearTimeout(comboTimerRef.current);
    comboTimerRef.current = window.setTimeout(() => setCombo(0), 1400);
    setTimeout(() => setBubbles((p) => p.filter((b) => b.id !== id)), 250);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-4">
      <div className="cork-board absolute inset-0 opacity-20" />

      {/* Bubble play area covers the whole screen */}
      <div ref={containerRef} className="pointer-events-none absolute inset-0">
        {bubbles.map((b) => (
          <button
            key={b.id}
            onClick={() => pop(b.id)}
            style={{ left: b.x, top: b.y }}
            className={`pointer-events-auto absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card text-2xl shadow-lg transition-all duration-200 hover:scale-110 ${
              b.popped ? "scale-150 opacity-0" : "animate-fade-in"
            }`}
          >
            {b.emoji}
          </button>
        ))}
      </div>

      <div className="relative w-full max-w-2xl rounded-3xl border-2 border-border bg-card/95 p-8 text-center shadow-2xl backdrop-blur-sm animate-enter">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 animate-pulse text-primary" />
          <span className="rounded-full bg-primary/15 px-3 py-0.5 font-handwritten text-sm font-bold text-primary">
            under construction
          </span>
          <Sparkles className="h-6 w-6 animate-pulse text-primary" />
        </div>

        <div className="mb-4 text-7xl" role="img" aria-label="working">
          🛠️
        </div>

        <h1 className="font-handwritten text-4xl font-bold text-foreground">
          we're shipping something new!
        </h1>

        <p className="mt-3 font-note text-base leading-relaxed text-foreground">
          the global wall is getting an upgrade. should be back in about{" "}
          <span className="rounded-md bg-primary/15 px-2 py-0.5 font-bold text-primary">
            {MAINTENANCE_ETA}
          </span>
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-border/50 bg-muted/40 p-4 text-left">
            <p className="font-handwritten text-xl text-foreground">Live maintenance event</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="reward-burst rounded-xl border border-border/50 bg-background/80 p-3">
                <Heart className="mx-auto h-4 w-4 fill-primary text-primary" />
                <p className="mt-1 font-handwritten text-2xl font-bold text-primary">{score}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Popped</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/80 p-3">
                <Zap className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-handwritten text-2xl font-bold text-primary">x{Math.max(combo, 1)}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Combo</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/80 p-3">
                <Trophy className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-handwritten text-sm font-bold text-primary">{rewardLabel}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rank</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-border/50 bg-background/70 p-3">
              <p className="font-note text-sm text-foreground">We're using maintenance mode as a hype splash now — faster updates, better releases, and a tiny game while the wall cools off.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/75 p-4 text-left">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              <p className="font-handwritten text-xl font-bold">Patch goals</p>
            </div>
            <ul className="mt-3 space-y-2 font-note text-sm text-foreground">
              <li>• endless measurable task loops</li>
              <li>• stronger rewards + streak momentum</li>
              <li>• richer wall identity and cosmetics</li>
              <li>• more playful micro-interactions</li>
            </ul>
            <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={() => { setScore(0); setCombo(0); }}>
              <PartyPopper className="mr-1 h-3.5 w-3.5" /> Reset run
            </Button>
            {onDismiss && (
              <Button size="sm" className="mt-2 rounded-full" onClick={onDismiss}>
                {dismissLabel}
              </Button>
            )}
          </div>
        </div>

        <p className="mt-6 font-handwritten text-sm text-muted-foreground">
          thanks for hanging out 💛
        </p>
      </div>
    </div>
  );
};
