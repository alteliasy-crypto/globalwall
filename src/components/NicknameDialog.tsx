import { useRef, useState } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const HCAPTCHA_SITE_KEY = "b246369c-967a-4530-a170-01caec86983a";

interface Props {
  open: boolean;
  needsCaptcha: boolean;
  onCaptchaVerified: (token: string) => Promise<{ error: Error | null }>;
  onSubmit: (nickname: string) => Promise<{ error: Error | null }>;
}

export const NicknameDialog = ({ open, needsCaptcha, onCaptchaVerified, onSubmit }: Props) => {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const captchaRef = useRef<HCaptcha>(null);

  const handleCaptcha = async (token: string) => {
    setVerifying(true);
    const { error } = await onCaptchaVerified(token);
    setVerifying(false);
    if (error) {
      toast.error(error.message || "Captcha verification failed");
      captchaRef.current?.resetCaptcha();
    }
  };

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
          <DialogTitle className="font-handwritten text-3xl">
            {needsCaptcha ? "Quick check 🤖" : "Pick a nickname ✏️"}
          </DialogTitle>
          <DialogDescription className="font-note">
            {needsCaptcha
              ? "Confirm you're human to enter the wall."
              : "This is how the world will see you on the wall. Keep it nice — you only get 3 sticky notes."}
          </DialogDescription>
        </DialogHeader>

        {needsCaptcha ? (
          <div className="flex flex-col items-center gap-3 pt-2">
            <HCaptcha
              ref={captchaRef}
              sitekey={HCAPTCHA_SITE_KEY}
              onVerify={handleCaptcha}
              onExpire={() => captchaRef.current?.resetCaptcha()}
            />
            {verifying && <p className="font-note text-sm text-muted-foreground">Signing you in…</p>}
            <button
              onClick={() => { import("@/lib/guest").then(({ setGuestMode }) => { setGuestMode(true); window.location.reload(); }); }}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Continue as guest (browse-only — no posting, liking, chat, or shop)
            </button>
          </div>
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
};
