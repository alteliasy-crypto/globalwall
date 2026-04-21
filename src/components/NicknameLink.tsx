import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  nickname: string | null | undefined;
  className?: string;
  withAt?: boolean;
}

export const NicknameLink = ({ userId, nickname, className, withAt }: Props) => {
  return (
    <Link
      to={`/u/${userId}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={cn("underline-offset-2 hover:underline", className)}
    >
      {withAt ? "@" : ""}{nickname ?? "anon"}
    </Link>
  );
};
