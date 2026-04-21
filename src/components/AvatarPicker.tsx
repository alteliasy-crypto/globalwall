import { AVATAR_PRESETS } from "@/lib/avatars";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (key: string) => void;
}

export const AvatarPicker = ({ value, onChange }: Props) => {
  return (
    <div className="grid grid-cols-6 gap-2">
      {AVATAR_PRESETS.map((a) => {
        const active = a.key === value;
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => onChange(a.key)}
            className={cn(
              "flex items-center justify-center rounded-full p-1 transition-all",
              active
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "opacity-80 hover:opacity-100 hover:scale-110"
            )}
            title={a.key}
          >
            <Avatar avatarKey={a.key} size="md" />
          </button>
        );
      })}
    </div>
  );
};
