// Bump on each release.
// Rules: bug/minor +0.0.1, regular +0.1.0, huge +1.0.0
export const APP_VERSION = "v5.1.2";

// Maintenance mode is now controlled automatically — set to false in production.
// Flip to true only while actively shipping a breaking change, then back to false.
export const MAINTENANCE_MODE = false;
export const MAINTENANCE_ETA = "~5 minutes";

export const DEV_NOTES: { version: string; date: string; notes: string[] }[] = [
  {
    version: "v5.1.2",
    date: "2026-05-02",
    notes: [
      "🧯 Maintenance splash temporarily removed from the main wall flow",
      "⚙️ Added Settings with a device chooser for auto, phone, tablet, and desktop frames",
      "🎨 Color Palette now supports multiple favorite colors with a dedicated Favorites tab",
      "🛒 Wall Market now shows owned cosmetics and active boosts after purchase",
      "🪜 Quest Ladder now fills 20 live slots and keeps replacements refreshing instantly",
      "🛡️ Strengthened note profanity/spam filtering and enabled voting on your own notes",
    ],
  },
  {
    version: "v5.1.1",
    date: "2026-05-02",
    notes: [
      "🧯 Fixed the *real* 3-note hard cap — the database trigger now enforces 15/hour (+1 per 2 quests done) instead of a hard total",
      "🐛 Fixed Wall Market crash: \"column reference 'coins' is ambiguous\"",
      "🪜 Quest Ladder pool expanded to 20 quests — exactly 2 per Fire level (1🔥 → 10🔥)",
      "🎨 Removed the legacy quick-color strip — only the full 264-color Palette remains, with a Favorite Color one-click button",
      "🧹 Removed the Diagnose dev button and the Share button from Quest Ladder",
    ],
  },
  {
    version: "v5.1.0",
    date: "2026-04-24",
    notes: [
      "🌈 Hundreds of new colors — new full-page Color Palette with 250+ shades grouped by family + search",
      "⏱️ Removed the hard 3-note limit — now 15 notes per rolling hour (+1 per 2 quests done)",
      "🧯 Fixed: extra slots from quests now actually let you place notes (no more phantom limit)",
      "🪟 Quests, Wall Market, Wall Street Rankings, Live Chat & Colors now open as full-page panels",
      "📐 Toolbar widened to fit the new buttons; quest tab no longer overflows the screen",
    ],
  },
  {
    version: "v5.0.1",
    date: "2026-04-24",
    notes: [
      "🛠️ Fixed Quest Ladder crash — `roll_quest` no longer throws \"missing FROM-clause entry for table 'h'\"; new quests spawn cleanly every time",
      "🧹 Removed legacy daily-task tables/functions that were conflicting with the Quest Ladder backend",
      "⚡ Added DB indexes on quest_ladder & quest_history for snappier loads",
      "🎨 Reworked main screen: floating glass control dock, cleaner empty state, polished version chip",
    ],
  },
  {
    version: "v5.0.0",
    date: "2026-04-23",
    notes: [
      "🪜 Quest Ladder replaces daily tasks — always 3 active quests, finish one and a fresh one slides in instantly",
      "🔥 Each quest has a Fire Level (1–10) — higher fire = more coins + chance of rare 💎 tokens",
      "🛒 Wall Market shop — spend coins/tokens on themes, badges, pin effects, and 2x/3x boost potions",
      "🏆 Wall Street Rankings — live global leaderboard ranking by coins, top fire cleared, and heat streak",
      "🌶️ Heat Streaks — chain high-fire quests within 30 min to build a glowing reward multiplier (up to 3x)",
      "✨ Streak Shields, Boost potions, claim animations, and a fully reworked quest UI for max dopamine",
    ],
  },
  {
    version: "v4.0.0",
    date: "2026-04-22",
    notes: [
      "♾️ Endless task chain — finish one and another measurable challenge spawns instantly",
      "⚡ Momentum rewards — the more tasks you clear today, the bigger tomorrow's XP boost gets",
      "🎉 Task panel now hits harder with chain, boost, and share-for-random-reward feedback",
      "🎨 More sticky note colors and many more profile pictures for better wall identity",
      "🛠️ Maintenance mode got rebuilt into a full event-style screen and can now be used as a live splash experience",
    ],
  },
  {
    version: "v3.1.1",
    date: "2026-04-22",
    notes: [
      "🛠️ Fixed daily tasks — progress now updates from real actions like posting, reacting, favoriting, following, and profile edits",
      "🎁 Task rewards can only be claimed after the requirement is actually met, preventing false completes",
      "🔄 Task progress now refreshes live across the wall, profile, and toolbar after supported actions",
    ],
  },
  {
    version: "v3.1.0",
    date: "2026-04-21",
    notes: [
      "🎯 Daily tasks! A new random task drops every UTC midnight (never the same as yesterday)",
      "✨ XP & levels — earn xp from daily tasks and login streaks; level shown on every profile",
      "🔥 Login streaks — log in on consecutive days for bigger xp bonuses (caps at 10-day multiplier)",
      "📌 Bonus sticky-note slots — every completed daily task unlocks +1 slot beyond the base 3",
      "📊 New level progress bar on profiles + streak/level chip in the toolbar daily-task popover",
    ],
  },
  {
    version: "v3.0.0",
    date: "2026-04-20",
    notes: [
      "👤 New user profiles! Click any nickname to view someone's profile, bio, notes, followers, and warning/report stats",
      "🎨 12 preset avatars — pick yours from your profile menu",
      "✍️ Editable bios (200 chars) and changeable nicknames from the new Edit Profile dialog",
      "➕ Follow / unfollow other wall-goers, with follower & following counts",
      "🔒 Security: report submissions are no longer broadcast to all users — they now arrive as private inbox notifications only the note's owner can see",
      "🔒 Security: removed an overly broad realtime channel policy",
    ],
  },
  {
    version: "v2.2.0",
    date: "2026-04-20",
    notes: [
      "🐛 Fixed: emoji + reaction buttons now actually open (canvas was stealing pointer events from popovers)",
      "🐛 Fixed: report submission now works (was failing due to a duplicate database trigger)",
      "🛡️ Server-side profanity filter — bad notes are now rejected at the database, not just the client",
      "⭐ New: favorite any note with the star button, view all your saved notes from the toolbar",
      "🎮 Maintenance screen now has a bubble-pop mini-game while you wait",
      "📌 Drag is now smarter — short clicks no longer get treated as drags, so popovers/dialogs work cleanly",
    ],
  },
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
