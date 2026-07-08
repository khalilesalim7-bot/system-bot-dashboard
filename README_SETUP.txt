NYXEN BOT - SETUP

1) Extract the ZIP.
2) Run:
   npm install

3) Copy .env.example to .env and put your real bot token:
   DISCORD_TOKEN=YOUR_TOKEN_HERE

4) Start the bot:
   npm start

IMPORTANT FIXES IN THIS VERSION:
- .invites card redesigned smaller + aligned + black/blue vibe.
- .invites now shows TOTAL / TODAY / LEAVES / REAL.
- Invite counts update from real join/leave events.
- Leaves now update even if leave-log channel is missing.
- inviteHistory.json added for TODAY invites.
- .verify works for Verification Team or Administrator and replies with a clean card.
- /leaderboard stays black vibe.
- Keep node_modules out of the ZIP. Always run npm install on your host.
