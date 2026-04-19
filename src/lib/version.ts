// Bump on each release.
// Rules: bug/minor +0.0.1, regular +0.1.0, huge +1.0.0
export const APP_VERSION = "v2.0.0";

// Set to true when a release is in progress; user can't toggle.
// Update the message + ETA before flipping it on.
export const MAINTENANCE_MODE = false;
export const MAINTENANCE_ETA = "~10 minutes";

export const DEV_NOTES: { version: string; date: string; notes: string[] }[] = [
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
