import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  nickname: string | null | undefined;
  className?: string;
  withAt?: boolean;
  title?: string | null;
  badge?: string | null;
}

const pretty = (key: string) =>
  key.replace(/^title_|^badge_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const BADGE_EMOJI: Record<string, string> = {
  badge_star: "⭐", badge_fire: "🔥", badge_crown: "👑", badge_heart: "❤️",
  badge_lightning: "⚡", badge_diamond: "💎", badge_sparkle: "✨", badge_rocket: "🚀",
  badge_trophy: "🏆", badge_medal: "🏅", badge_skull: "💀", badge_ghost: "👻",
};

export const NicknameLink = ({ userId, nickname, className, withAt, title, badge }: Props) => {
  const emoji = badge ? (BADGE_EMOJI[badge] ?? "🎖️") : null;
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <Link
        to={`/u/${userId}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={cn("underline-offset-2 hover:underline truncate", className)}
      >
        {withAt ? "@" : ""}{nickname ?? "anon"}
      </Link>
      {emoji && <span title={pretty(badge!)} className="text-sm leading-none">{emoji}</span>}
      {title && (
        <span
          className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary leading-none"
          title="Equipped title"
        >
          {pretty(title)}
        </span>
      )}
    </span>
  );
};
