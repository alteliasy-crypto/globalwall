// Bump on each release.
// Rules: bug/minor +0.0.1, regular +0.1.0, huge +1.0.0
export const APP_VERSION = "v2.1.1";

// Maintenance mode is now controlled automatically — set to false in production.
// Flip to true only while actively shipping a breaking change, then back to false.
export const MAINTENANCE_MODE = false;
export const MAINTENANCE_ETA = "~5 minutes";

export const DEV_NOTES: { version: string; date: string; notes: string[] }[] = [
  {
    version: "v2.1.1",
    date: "2026-04-19",
    notes: [
      "🐛 Fixed: like/dislike buttons can now be undone or switched (realtime UPDATE/DELETE events were being dropped)",
      "🐛 Fixed: removing an emoji reaction now updates the count instantly",
      "🐛 Fixed: Inbox now receives live notifications for likes, dislikes, reactions, and reports",
    ],
  },
  {
    version: "v2.1.0",
    date: "2026-04-19",
    notes: [
      "👍 Like / 👎 dislike buttons on every note with public counts",
      "🔔 New Inbox: see who liked, disliked, reacted to, or reported your notes (with unread badge)",
      "⌨️ 'X is typing...' indicator in live chat",
      "🛠️ Maintenance mode now defaults to off — only flipped on by the dev for breaking releases",
    ],
  },
  {
    version: "v2.0.1",
    date: "2026-04-19",
    notes: [
      "🐛 Fixed: emoji reaction picker (+) button is now always visible",
      "🐛 Fixed: reporting a note you'd already reported now shows a friendly message instead of failing",
      "😅 First test of the maintenance screen!",
    ],
  },
  {
    version: "v2.0.0",
    date: "2026-04-19",
    notes: [
      "🌍 Infinite pan + zoom canvas (drag empty space, scroll to zoom)",
      "💬 Live chat with profanity filter — messages auto-vanish after 60s",
      "👥 Online presence counter",
      "😄 Custom emoji reactions on every sticky note",
      "📅 Note dates now visible",
      "🐛 Fixed: 'Start over' now properly deletes your notes & resets the 0/3 counter",
      "📝 Added version & developer notes",
    ],
  },
  {
    version: "v1.0.0",
    date: "2026-04-18",
    notes: [
      "🎉 Initial launch: pin up to 3 sticky notes on the global cork board",
      "🎨 8 colors, drag-to-move, double-click to edit, live realtime sync",
      "🚩 Reporting + auto-ban after 5 reports",
      "🛡️ hCaptcha on first sign-in",
    ],
  },
];
