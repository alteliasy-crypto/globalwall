import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MAINTENANCE_ETA } from "@/lib/version";
import { Sparkles, Heart } from "lucide-react";

interface Bubble {
  id: number;
  x: number;
  y: number;
  emoji: string;
  popped: boolean;
}

const BUBBLE_EMOJIS = ["🌟", "🎈", "🍩", "🌈", "🍕", "💎", "🔥", "🦄", "🍀", "🪐"];

export const MaintenanceScreen = () => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const idRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

      <div className="relative w-full max-w-lg rounded-3xl border-2 border-border bg-card/95 p-8 text-center shadow-2xl backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 animate-pulse text-primary" />
          <span className="rounded-full bg-amber-400/20 px-3 py-0.5 font-handwritten text-sm font-bold text-amber-700 dark:text-amber-400">
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

        <div className="mt-6 rounded-2xl border border-border/50 bg-muted/40 p-4">
          <p className="font-handwritten text-base text-foreground">
            🎮 in the meantime — pop the bubbles!
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            <span className="font-handwritten text-2xl font-bold tabular-nums text-primary">
              {score}
            </span>
            <span className="font-handwritten text-base text-muted-foreground">popped</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 rounded-full"
            onClick={() => setScore(0)}
          >
            Reset score
          </Button>
        </div>

        <p className="mt-6 font-handwritten text-sm text-muted-foreground">
          thanks for hanging out 💛
        </p>
      </div>
    </div>
  );
};
