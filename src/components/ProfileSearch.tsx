import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "./Avatar";
import { Link } from "react-router-dom";

interface Row { user_id: string; nickname: string; avatar_key: string; equipped_title: string | null }

export const ProfileSearch = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setRows([]); return; }
      setLoading(true);
      const { data } = await (supabase as any).rpc("search_users", { _query: q.trim(), _limit: 20 });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-full" title="Search profiles">
          <Search className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-handwritten text-3xl flex items-center gap-2">
            <Search className="h-5 w-5" /> Find people
          </DialogTitle>
          <DialogDescription>Type at least 2 characters to search.</DialogDescription>
        </DialogHeader>
        <Input autoFocus placeholder="Search nicknames..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-[50vh] overflow-y-auto space-y-1">
          {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
          {!loading && q.trim().length >= 2 && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No users found.</p>
          )}
          {rows.map((r) => (
            <Link
              key={r.user_id}
              to={`/u/${r.user_id}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-2 hover:bg-card"
            >
              <Avatar avatarKey={r.avatar_key} size="sm" />
              <div className="flex flex-col">
                <span className="font-handwritten text-lg leading-none">{r.nickname}</span>
                {r.equipped_title && (
                  <span className="text-[10px] uppercase tracking-wider text-primary">{r.equipped_title.replace(/^title_/, "").replace(/_/g, " ")}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
