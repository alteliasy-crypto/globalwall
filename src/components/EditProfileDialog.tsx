import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AvatarPicker } from "./AvatarPicker";
import { toast } from "sonner";
import { containsProfanity } from "@/lib/profanity";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialNickname: string;
  initialBio: string;
  initialAvatarKey: string;
  onSaveNickname: (nickname: string) => Promise<{ error: any }>;
  onSaveExtras: (patch: { bio?: string; avatar_key?: string }) => Promise<{ error: any }>;
}

export const EditProfileDialog = ({
  open, onOpenChange, initialNickname, initialBio, initialAvatarKey,
  onSaveNickname, onSaveExtras,
}: Props) => {
  const [nick, setNick] = useState(initialNickname);
  const [bio, setBio] = useState(initialBio);
  const [avatarKey, setAvatarKey] = useState(initialAvatarKey);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNick(initialNickname);
      setBio(initialBio);
      setAvatarKey(initialAvatarKey);
    }
  }, [open, initialNickname, initialBio, initialAvatarKey]);

  const submit = async () => {
    const trimmedNick = nick.trim();
    const trimmedBio = bio.trim();
    if (!trimmedNick) { toast.error("Nickname can't be empty."); return; }
    if (containsProfanity(trimmedNick) || containsProfanity(trimmedBio)) {
      toast.error("Please keep it kind — that wording isn't allowed.");
      return;
    }
    setSaving(true);
    if (trimmedNick !== initialNickname) {
      const { error } = await onSaveNickname(trimmedNick);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    const { error } = await onSaveExtras({ bio: trimmedBio, avatar_key: avatarKey });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-handwritten text-3xl">Edit your profile</DialogTitle>
          <DialogDescription className="font-note">
            Pick an avatar, set a nickname, and add a short bio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="font-handwritten text-base">Avatar</Label>
            <div className="mt-2"><AvatarPicker value={avatarKey} onChange={setAvatarKey} /></div>
          </div>
          <div>
            <Label htmlFor="nick" className="font-handwritten text-base">Nickname</Label>
            <Input id="nick" value={nick} onChange={(e) => setNick(e.target.value)} maxLength={24} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="bio" className="font-handwritten text-base">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200}
              placeholder="Tell the wall about yourself..." className="mt-1 resize-none" rows={3} />
            <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/200</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
