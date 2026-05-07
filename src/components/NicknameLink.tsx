import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  nickname: string | null | undefined;
  className?: string;
  withAt?: boolean;
  title?: string | null;
}

const prettyTitle = (key: string) =>
  key.replace(/^title_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const NicknameLink = ({ userId, nickname, className, withAt, title }: Props) => {
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
      {title && (
        <span
          className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary leading-none"
          title="Equipped title"
        >
          {prettyTitle(title)}
        </span>
      )}
    </span>
  );
};
