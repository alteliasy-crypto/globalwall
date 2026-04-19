import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onSubmit: (nickname: string) => Promise<{ error: Error | null }>;
}

export const NicknameDialog = ({ open, onSubmit }: Props) => {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const v = value.trim();
    if (v.length < 2 || v.length > 20) {
      toast.error("Nickname must be 2–20 characters");
      return;
    }
    setBusy(true);
    const { error } = await onSubmit(v);
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Nickname taken" : error.message);
    } else {
      toast.success(`Welcome, ${v}!`);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-handwritten text-3xl">Pick a nickname ✏️</DialogTitle>
          <DialogDescription className="font-note">
            This is how the world will see you on the wall. Keep it nice — you only get 3 sticky notes.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          <Input
            autoFocus
            placeholder="e.g. doodle_dragon"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            maxLength={20}
            className="font-note text-lg"
          />
          <Button onClick={submit} disabled={busy}>
            {busy ? "..." : "Enter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
