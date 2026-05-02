// Lightweight profanity / inappropriate-content filter.
// Catches obvious slurs & vulgarity, common leetspeak, and obvious harassment cues.
// Not bulletproof — moderation reports still exist as a backstop.

const BAD_WORDS = [
  "fuck", "fucking", "fucker", "motherfucker", "shit", "bullshit", "bitch", "asshole", "bastard",
  "dick", "pussy", "cock", "cunt", "slut", "whore", "fag", "faggot", "nigger", "nigga",
  "retard", "retarded", "tranny", "kike", "spic", "chink", "gook", "wetback", "coon", "beaner", "dyke",
  "rape", "rapist", "molest", "molester", "pedo", "pedophile", "kill yourself", "kys", "kill urself",
  "suicide", "hang yourself", "go die", "die loser", "porn", "porno", "nude", "nudes", "sex", "horny",
  "onlyfans", "blowjob", "handjob", "hitler", "nazi", "swastika", "discord.gg", "telegram.me", "t.me", "http", "www",
];

// Map leet/symbol substitutions to letters
const NORMALIZE_MAP: Record<string, string> = {
  "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "@": "a",
  "5": "s", "$": "s", "7": "t", "+": "t", "8": "b", "9": "g",
};

function normalize(input: string): string {
  let s = input.toLowerCase();
  s = s.replace(/[01!34@5$7+89]/g, (c) => NORMALIZE_MAP[c] ?? c);
  // collapse repeated chars: "fuuuck" -> "fuck"
  s = s.replace(/(.)\1{2,}/g, "$1$1");
  // strip non-alphanumeric so "f.u.c.k" -> "fuck"
  s = s.replace(/[^a-z0-9 ]/g, "");
  return s;
}

export function containsProfanity(text: string): boolean {
  const norm = normalize(text);
  const compact = norm.replace(/\s+/g, "");
  const repeatedSpam = /(.)\1{9,}/.test(norm) || (compact.length >= 12 && compact === compact[0].repeat(compact.length));
  return repeatedSpam || BAD_WORDS.some((w) => {
    if (w.includes(" ")) return norm.includes(w);
    return compact.includes(w);
  });
}

export function cleanText(text: string): string {
  // Replace bad words with asterisks (preserve length roughly)
  let out = text;
  const norm = normalize(text);
  BAD_WORDS.forEach((w) => {
    if (w.includes(" ")) {
      const re = new RegExp(w.replace(/ /g, "\\s+"), "gi");
      out = out.replace(re, "*".repeat(w.length));
    } else if (norm.replace(/\s+/g, "").includes(w)) {
      // Best-effort visual mask
      const re = new RegExp(w.split("").join("[^a-z0-9]*"), "gi");
      out = out.replace(re, (m) => "*".repeat(m.length));
    }
  });
  return out;
}
