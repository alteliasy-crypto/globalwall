import { cn } from "@/lib/utils";
import { getAvatar } from "@/lib/avatars";

interface Props {
  avatarKey: string | null | undefined;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}

const SIZE_CLS: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-5 w-5 text-[11px]",
  sm: "h-7 w-7 text-base",
  md: "h-10 w-10 text-xl",
  lg: "h-16 w-16 text-3xl",
  xl: "h-24 w-24 text-5xl",
};

export const Avatar = ({ avatarKey, size = "md", className, ring }: Props) => {
  const a = getAvatar(avatarKey);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        a.bg,
        SIZE_CLS[size],
        ring && `ring-2 ring-offset-2 ring-offset-background ${a.ring}`,
        className
      )}
      aria-hidden
    >
      {a.emoji}
    </span>
  );
};
