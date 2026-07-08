const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { SECRET_WORDS } = require("./secretWords.cjs");

const SYSTEMS = [
  { textId: "1482452202537619660", voiceId: "1482453245896167464", label: "Spy System 1" },
  { textId: "1520857347700822267", voiceId: "1506978122460037261", label: "Spy System 2" },
];

const GAME_ROLE_ID = "1470099883150020841";
const WINNER_CHANNEL_ID = "1505735793396813994";
const DISCUSSION_SECONDS = 90;
const COUNTDOWN_SECONDS = 10;

const CUSTOM_IDS = {
  JOIN: "sg_join",
  LEAVE: "sg_leave",
  START: "sg_start",
  VOTE: "sg_vote",
  GUESS: "sg_guess",
  GUESS_MODAL: "sg_guess_modal",
  GUESS_SUBMIT: "sg_guess_submit",
};

const spyWins = {};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWord() {
  return SECRET_WORDS[Math.floor(Math.random() * SECRET_WORDS.length)];
}

async function getGuild(client) {
  const id = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID;
  return client.guilds.cache.get(id) || null;
}

// ────── Permission Helpers ──────

async function applyMemberPerms(guild, memberId, voiceId) {
  const sys = Object.values(systems).find((s) => s.voiceId === voiceId);
  if (!sys) return;
  const otherSys = Object.values(systems).find((s) => s.voiceId !== voiceId);
  const chs = [
    { id: sys.textId, allow: true, connect: false },
    { id: sys.voiceId, allow: true, connect: true },
  ];
  if (otherSys) {
    chs.push({ id: otherSys.textId, allow: false, connect: false });
    chs.push({ id: otherSys.voiceId, allow: false, connect: false });
  }
  for (const { id, allow, connect } of chs) {
    const ch = guild.channels.cache.get(id);
    if (!ch) continue;
    await ch.permissionOverwrites.create(memberId, {
      ViewChannel: allow,
      Connect: connect,
    }).catch(() => null);
  }
}

async function removeMemberPerms(guild, memberId) {
  const allIds = SYSTEMS.flatMap((s) => [s.textId, s.voiceId]);
  for (const id of allIds) {
    const ch = guild.channels.cache.get(id);
    if (!ch) continue;
    await ch.permissionOverwrites.delete(memberId).catch(() => null);
  }
}

// ────── Game System Class ──────

class GameSystem {
  constructor(config) {
    this.textId = config.textId;
    this.voiceId = config.voiceId;
    this.label = config.label;
    this.panelMsgId = null;
    this.players = [];
    this.hostId = null;
    this.phase = "lobby";
    this.spyId = null;
    this.secretWord = null;
    this.timer = null;
    this.timeLeft = 0;
    this.votes = {};
    this.guessTimeout = null;
  }

  cleanup() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.guessTimeout) { clearTimeout(this.guessTimeout); this.guessTimeout = null; }
  }

  reset() {
    this.cleanup();
    this.players = [];
    this.hostId = null;
    this.phase = "lobby";
    this.spyId = null;
    this.secretWord = null;
    this.timeLeft = 0;
    this.votes = {};
  }

  // ── Embeds ──

  lobbyEmbed() {
    const list = this.players.length ? this.players.map((id) => `<@${id}>`).join("\n") : "No players yet.";
    return new EmbedBuilder()
      .setColor(0xaeaeae)
      .setTitle(`<:89e2149301585757e00437bb336fe8b2:1508751320515874906> ${this.label}`)
      .setDescription("Press **Join Game** to enter the lobby.\nPress **Leave Game** to exit.\nOnly the **Host** can start.\n\nYou must be in a voice channel to join.")
      .addFields(
        { name: "**<:player_dwwd:1520898102444294264> Players**", value: `${this.players.length}`, inline: true },
        { name: "**<:41620sergeant:1468919838369124445> Host**", value: this.hostId ? `<@${this.hostId}>` : "None", inline: true },
        { name: "**<:6137auditlogmobile:1468928757820559431> Player List**", value: list, inline: false },
      )
      .setFooter({ text: "Waiting for players..." })
      .setTimestamp();
  }

  lobbyRows() {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.JOIN + ":" + this.textId).setLabel("Join Game").setStyle(ButtonStyle.Secondary).setEmoji("<:586735checkmark:1472282353337368587>"),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.LEAVE + ":" + this.textId).setLabel("Leave Game").setStyle(ButtonStyle.Danger).setEmoji("<:298685ex:1467929031617020009>"),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.START + ":" + this.textId).setLabel("Start Game").setStyle(ButtonStyle.Secondary).setEmoji("<:42920arrowrightalt:1474946022953189486>")
          .setDisabled(!this.hostId || this.players.length < 3),
      ),
    ];
  }

  discussionEmbed() {
    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`<:89e2149301585757e00437bb336fe8b2:1508751320515874906 ${this.label}`)
      .setDescription("💬 Discussion phase! Talk and figure out who the spy is.")
      .addFields(
        { name: "**📌 Phase**", value: "💬 Discussion", inline: true },
        { name: "**<:529614vb:1468921406950473738>  Time Remaining**", value: `\`${this.timeLeft}s\``, inline: true },
        { name: "**<:player_dwwd:1520898102444294264> Players**", value: `${this.players.length}`, inline: true },
      )
      .setFooter({ text: "Voting starts when the timer ends." })
      .setTimestamp();
  }

  discussionRows() {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.GUESS + ":" + this.textId).setLabel("Spy? Guess the Word").setStyle(ButtonStyle.Secondary).setEmoji("🕵️"),
      ),
    ];
  }

  votingEmbed() {
    const voteCount = Object.keys(this.votes).length;
    return new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle(`<:89e2149301585757e00437bb336fe8b2:1508751320515874906 ${this.label}`)
      .setDescription("**<:6137auditlogmobile:1468928757820559431>  Time to vote! Select who you think the spy is from the dropdown below.**")
      .addFields(
        { name: "📌 Phase", value: "🗳️ Voting", inline: true },
        { name: "**<a:lottieflowcheckbox05fffffflinear:1516504402599346309> Votes Cast**", value: `${voteCount} / ${this.players.length}`, inline: true },
        { name: "**<:player_dwwd:1520898102444294264> Players**", value: `${this.players.length}`, inline: true },
      )
      .setFooter({ text: "Vote wisely! Each player votes once." })
      .setTimestamp();
  }

  async votingRows(guild) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.VOTE + ":" + this.textId)
      .setPlaceholder("Choose who you think is the spy");
    const opts = [];
    for (const pid of this.players) {
      let label = `Player ${pid.slice(-4)}`;
      try {
        const mem = guild ? (guild.members.cache.get(pid) || await guild.members.fetch(pid).catch(() => null)) : null;
        if (mem) label = mem.displayName.slice(0, 80) || mem.user.username.slice(0, 80);
      } catch {}
      opts.push({ label, value: pid, emoji: { name: "👤" } });
    }
    menu.addOptions(opts);
    return [new ActionRowBuilder().addComponents(menu)];
  }

  guessEmbed() {
    return new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`<:89e2149301585757e00437bb336fe8b2:1508751320515874906 ${this.label}`)
      .setDescription(`🔍 The team has voted for <@${this.spyId}> as the spy!\n\n**Spy**, check your DMs to guess the secret word.`)
      .addFields(
        { name: "📌 Phase", value: "🔍 Final Guess", inline: true },
        { name: "<:89e2149301585757e00437bb336fe8b2:1508751320515874906>  Spy", value: `<@${this.spyId}>`, inline: true },
      )
      .setFooter({ text: "The spy has 30 seconds to guess." })
      .setTimestamp();
  }

  finishedEmbed(winner, guessed) {
    const desc = guessed !== undefined
      ? (guessed ? "✅ The Spy guessed the word correctly!" : "❌ The Spy failed to guess the word.")
      : (winner === "spy" ? "🕵️ The Spy was not caught!" : "👥 The Spy was caught!");
    return new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(`<:22:1473011520970686658>  Game Over - ${this.label}`)
      .setDescription(desc)
      .addFields(
        { name: "**<a:DEv1:1468912308473430136>  Winner**", value: winner === "spy" ? "🕵️ Spy Wins" : "👥 Team Wins", inline: true },
        { name: "**<:89e2149301585757e00437bb336fe8b2:1508751320515874906> Spy**", value: this.spyId ? `<@${this.spyId}>` : "None", inline: true },
        { name: "**<:42920arrowrightalt:1474946022953189486>  Secret Word**", value: this.secretWord || "None", inline: true },
        { name: "**<:player_dwwd:1520898102444294264> Players**", value: this.players.map((id) => `<@${id}>`).join("\n") || "None", inline: false },
      )
      .setFooter({ text: "A new lobby has been created below!" })
      .setTimestamp();
  }

  // ── Panel ──

  async getChannel(client) {
    const g = await getGuild(client);
    if (!g) return null;
    return g.channels.cache.get(this.textId) || null;
  }

  async getMessage(client) {
    const ch = await this.getChannel(client);
    if (!ch || !this.panelMsgId) return null;
    try { return await ch.messages.fetch(this.panelMsgId); } catch { return null; }
  }

  async updatePanel(client, embed, rows) {
    const m = await this.getMessage(client);
    if (!m) {
      const ch = await this.getChannel(client);
      if (!ch) return;
      const sent = await ch.send({ embeds: [embed], components: rows || [] });
      this.panelMsgId = sent.id;
      return;
    }
    await m.edit({ embeds: [embed], components: rows || [] }).catch(() => null);
  }

  async sendNewPanel(client) {
    const ch = await this.getChannel(client);
    if (!ch) return;
    const existing = await ch.messages.fetch({ limit: 20 }).catch(() => null);
    const ourMsg = existing?.find(m =>
      m.author.id === client.user.id &&
      m.components?.some(r => r.components?.some(c => c.customId?.startsWith(CUSTOM_IDS.JOIN + ":")))
    );
    if (ourMsg) {
      this.panelMsgId = ourMsg.id;
      await ourMsg.edit({ embeds: [this.lobbyEmbed()], components: this.lobbyRows() }).catch(() => null);
      return;
    }
    const m = await ch.send({ embeds: [this.lobbyEmbed()], components: this.lobbyRows() });
    this.panelMsgId = m.id;
  }

  // ── Game Logic ──

  async startGame(client) {
    this.phase = "locked";
    await this.updatePanel(client, this.lobbyEmbed(), []);

    const shuffled = shuffle(this.players);
    this.spyId = shuffled[0];
    this.secretWord = pickWord();

    // Send DMs as embeds
    for (const pid of this.players) {
      const g = await getGuild(client);
      if (!g) break;
      const m = g.members.cache.get(pid) || await g.members.fetch(pid).catch(() => null);
      if (!m) continue;
      if (pid === this.spyId) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("<:89e2149301585757e00437bb336fe8b2:1508751320515874906>  You are the Spy!")
          .setDescription("You do not know the secret word.\nTry to blend in and figure out the word without being caught!")
          .setFooter({ text: this.label })
          .setTimestamp();
        await m.send({ embeds: [embed] }).catch(() => null);
      } else {
        const embed = new EmbedBuilder()
          .setColor(0xbdb7b7)
          .setTitle("<:586735checkmark:1472282353337368587> You are NOT the Spy")
          .setDescription(`**Secret Word:** \`${this.secretWord}\`\nFind the spy before they figure out the word!`)
          .setFooter({ text: this.label })
          .setTimestamp();
        await m.send({ embeds: [embed] }).catch(() => null);
      }
    }

    // Start discussion timer
    this.phase = "discussion";
    this.timeLeft = DISCUSSION_SECONDS;
    await this.updatePanel(client, this.discussionEmbed(), this.discussionRows());

    this.timer = setInterval(async () => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        this.phase = "voting";
        this.votes = {};
        const ch = await this.getChannel(client);
        if (ch) await ch.send("⏰ **Time is up!** Please vote now using the select menu below.").catch(() => null);
        const g = await getGuild(client);
        await this.updatePanel(client, this.votingEmbed(), await this.votingRows(g));
        return;
      }
      await this.updatePanel(client, this.discussionEmbed(), this.discussionRows());
    }, 1000);
  }

  async endVoting(client) {
    const tally = {};
    for (const v of Object.values(this.votes)) {
      tally[v] = (tally[v] || 0) + 1;
    }
    let max = 0, accused = null;
    for (const [pid, c] of Object.entries(tally)) {
      if (c > max) { max = c; accused = pid; }
    }

    if (accused === this.spyId) {
      this.phase = "guess";
      await this.updatePanel(client, this.guessEmbed(), []);

      const g = await getGuild(client);
      if (g) {
        const m = g.members.cache.get(this.spyId) || await g.members.fetch(this.spyId).catch(() => null);
        if (m) {
          try {
            const embed = new EmbedBuilder()
              .setColor(0xfee75c)
              .setTitle("🔍 Final Chance!")
              .setDescription("The team voted for you! You have **one chance** to guess the secret word.\nClick the button below to make your guess.")
              .setFooter({ text: this.label })
              .setTimestamp();
            await m.send({
              embeds: [embed],
              components: [
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder().setCustomId(CUSTOM_IDS.GUESS + ":" + this.textId).setLabel("Guess the Word").setStyle(ButtonStyle.Primary).setEmoji("🕵️"),
                ),
              ],
            });
          } catch {}
        }
      }

      this.guessTimeout = setTimeout(async () => {
        if (this.phase === "guess") {
          await this.showResults(client, false);
        }
      }, 30000);
    } else {
      await this.showResults(client);
    }
  }

  async handleGuess(interaction) {
    if (this.phase !== "guess") {
      await interaction.reply({ content: "No guess is needed right now.", ephemeral: true });
      return false;
    }
    if (interaction.user.id !== this.spyId) {
      await interaction.reply({ content: "You are not the spy.", ephemeral: true });
      return false;
    }
    return true;
  }

  async handleGuessSubmit(interaction) {
    if (this.phase !== "guess") {
      await interaction.reply({ content: "Too late!", ephemeral: true });
      return false;
    }
    if (interaction.user.id !== this.spyId) {
      await interaction.reply({ content: "You are not the spy.", ephemeral: true });
      return false;
    }
    return true;
  }

  async showResults(client, spyGuessedCorrectly) {
    if (this.phase === "results") return;
    this.phase = "results";

    const hadGuess = spyGuessedCorrectly !== undefined;
    const spyWon = hadGuess ? spyGuessedCorrectly : true;
    const winner = spyWon ? "spy" : "team";

    // Track spy wins
    if (spyWon && this.spyId) {
      spyWins[this.spyId] = (spyWins[this.spyId] || 0) + 1;
    }

    const finishEmbed = this.finishedEmbed(winner, hadGuess ? spyGuessedCorrectly : undefined);

    // Edit the existing panel to show finished
    const oldMsg = await this.getMessage(client);
    if (oldMsg) {
      await oldMsg.edit({ embeds: [finishEmbed], components: [] }).catch(() => null);
    }

    // Send winner embed to winner channel
    const g = await getGuild(client);
    if (g) {
      const wch = g.channels.cache.get(WINNER_CHANNEL_ID);
      if (wch) {
        const winCount = this.spyId ? (spyWins[this.spyId] || 0) : 0;
        const tagContent = winner === "spy"
          ? `<@${this.spyId}>`
          : this.players.map((id) => `<@${id}>`).join(" ");
        const winnerTitle = winner === "spy"
          ? "**<:89e2149301585757e00437bb336fe8b2:1508751320515874906> The Spy Wins!**"
          : "**<:player_dwwd:1520898102444294264> The Team Wins!**";
        const winnerColor = winner === "spy" ? 0xed4245 : 0x57f287;
        const winnerDescription = winner === "spy"
          ? `The spy <@${this.spyId}> successfully avoided being caught and wins the game!`
          : `The team successfully identified the spy <@${this.spyId}> and wins the game!`;

        const winnerEmbed = new EmbedBuilder()
          .setColor(winnerColor)
          .setTitle(`🏆 ${winnerTitle}`)
          .setDescription(`${winnerDescription}`)
          .addFields(
            { name: "**<:89e2149301585757e00437bb336fe8b2:1508751320515874906>  The Spy**", value: this.spyId ? `<@${this.spyId}>` : "None", inline: true },
            { name: "**<:42920arrowrightalt:1474946022953189486> Secret Word**", value: `\`${this.secretWord || "None"}\``, inline: true },
            { name: "**<:23:1473011496446464112> Spy Win Count**", value: `\`${winCount}\``, inline: true },
            { name: "**<:player_dwwd:1520898102444294264> All Players**", value: this.players.map((id) => `<@${id}>`).join("\n") || "None", inline: false },
            { name: "**<:6137auditlogmobile:1468928757820559431> Vote Results**", value: Object.keys(this.votes).length > 0
              ? Object.entries(this.votes).map(([voter, target]) => `<@${voter}> → <@${target}>`).join("\n")
              : "No votes were cast", inline: false },
          )
          .setFooter({ text: `Game ended — ${this.label}` })
          .setTimestamp();
        await wch.send({ content: `**🏆 Game Over — ${this.label}**\n${tagContent}`, embeds: [winnerEmbed] });
      }
    }

    this.reset();

    // Send a brand new lobby panel
    await this.sendNewPanel(client);
  }
}

// ────── Create systems ──────
const systems = {};
for (const cfg of SYSTEMS) {
  systems[cfg.textId] = new GameSystem(cfg);
}

function getSystemByTextId(textId) {
  return systems[textId] || null;
}

function getSystemByCustomId(customId) {
  const parts = customId.split(":");
  const textId = parts[1];
  return getSystemByTextId(textId);
}

// ────── Interaction Handlers ──────

async function onJoin(interaction) {
  const sys = getSystemByCustomId(interaction.customId);
  if (!sys) { await interaction.reply({ content: "Unknown system.", ephemeral: true }); return; }
  if (sys.phase !== "lobby") {
    await interaction.reply({ content: "A game is already in progress in this system.", ephemeral: true });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.voice.channelId) {
    await interaction.reply({ content: "**You must be in a Spy voice channel to join the game.**", ephemeral: true });
    return;
  }

  const allowedVoices = SYSTEMS.map(s => s.voiceId);
  if (!allowedVoices.includes(member.voice.channelId)) {
    await interaction.reply({ content: "**You must be in <#1482453245896167464> or <#1506978122460037261> to join the game.**", ephemeral: true });
    return;
  }

  const uid = interaction.user.id;
  if (sys.players.includes(uid)) {
    await interaction.reply({ content: "**You are already in this lobby.**", ephemeral: true });
    return;
  }
  sys.players.push(uid);
  if (!sys.hostId) sys.hostId = uid;
  await sys.updatePanel(interaction.client, sys.lobbyEmbed(), sys.lobbyRows());
  await interaction.reply({ content: "You joined the game!", ephemeral: true });
}

async function onLeave(interaction) {
  const sys = getSystemByCustomId(interaction.customId);
  if (!sys) { await interaction.reply({ content: "Unknown system.", ephemeral: true }); return; }
  const uid = interaction.user.id;
  const idx = sys.players.indexOf(uid);
  if (idx === -1) {
    await interaction.reply({ content: "You are not in this lobby.", ephemeral: true });
    return;
  }
  sys.players.splice(idx, 1);
  if (sys.hostId === uid) sys.hostId = sys.players.length > 0 ? sys.players[0] : null;
  await sys.updatePanel(interaction.client, sys.lobbyEmbed(), sys.lobbyRows());
  await interaction.reply({ content: "You left the game.", ephemeral: true });
}

async function onStart(interaction) {
  const sys = getSystemByCustomId(interaction.customId);
  if (!sys) { await interaction.reply({ content: "Unknown system.", ephemeral: true }); return; }
  if (sys.phase !== "lobby") {
    await interaction.reply({ content: "A game is already in progress in this system.", ephemeral: true });
    return;
  }
  if (interaction.user.id !== sys.hostId) {
    await interaction.reply({ content: "Only the host can start the game.", ephemeral: true });
    return;
  }
  if (sys.players.length < 3) {
    await interaction.reply({ content: "Need at least 3 players to start.", ephemeral: true });
    return;
  }
  await interaction.reply({ content: "Game starting...", ephemeral: true });

  // Countdown with role tag
  let announce = await interaction.channel.send({
    content: `<@&${GAME_ROLE_ID}> <:89e2149301585757e00437bb336fe8b2:1508751320515874906> **The Spy Game is about to start!**\n⏳ Starting in **10** seconds...`,
  });

  for (let i = COUNTDOWN_SECONDS; i >= 0; i--) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      if (i === 0) {
        await announce.edit({ content: `<@&${GAME_ROLE_ID}> <:586735checkmark:1472282353337368587> **Game Started!**` });
      } else {
        await announce.edit({ content: `<@&${GAME_ROLE_ID}> <:89e2149301585757e00437bb336fe8b2:1508751320515874906> **The Spy Game is about to start!**\n⏳ Starting in **${i}** seconds...` });
      }
    } catch {}
  }

  await sys.startGame(interaction.client);
}

async function onVote(interaction) {
  const sys = getSystemByCustomId(interaction.customId);
  if (!sys) { await interaction.reply({ content: "Unknown system.", ephemeral: true }); return; }
  if (sys.phase !== "voting") {
    await interaction.reply({ content: "Voting is not open right now.", ephemeral: true });
    return;
  }
  const uid = interaction.user.id;
  if (!sys.players.includes(uid)) {
    await interaction.reply({ content: "You are not in this game.", ephemeral: true });
    return;
  }
  if (sys.votes[uid]) {
    await interaction.reply({ content: "You already voted.", ephemeral: true });
    return;
  }
  sys.votes[uid] = interaction.values[0];
  await interaction.reply({ content: "Your vote has been recorded.", ephemeral: true });
  const g = await getGuild(interaction.client);
  await sys.updatePanel(interaction.client, sys.votingEmbed(), await sys.votingRows(g));
  if (Object.keys(sys.votes).length >= sys.players.length) {
    await sys.endVoting(interaction.client);
  }
}

async function onGuess(interaction) {
  const sys = getSystemByCustomId(interaction.customId);
  if (!sys) { await interaction.reply({ content: "Unknown system.", ephemeral: true }); return; }
  const ok = await sys.handleGuess(interaction);
  if (!ok) return;

  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.GUESS_SUBMIT + ":" + sys.textId)
    .setTitle("Guess the Secret Word")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(CUSTOM_IDS.GUESS_MODAL)
          .setLabel("What is the secret word?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50),
      ),
    );
  await interaction.showModal(modal);
}

async function onGuessSubmit(interaction) {
  const sys = getSystemByCustomId(interaction.customId);
  if (!sys) { await interaction.reply({ content: "Unknown system.", ephemeral: true }); return; }
  const ok = await sys.handleGuessSubmit(interaction);
  if (!ok) return;

  const guess = interaction.fields.getTextInputValue(CUSTOM_IDS.GUESS_MODAL);
  const isCorrect = guess.trim().toLowerCase() === sys.secretWord.trim().toLowerCase();
  await interaction.reply({ content: isCorrect ? "Correct! You win!" : "Wrong! The team wins.", ephemeral: true });
  await sys.showResults(interaction.client, isCorrect);
}

// ────── Voice State ──────

async function onVoiceStateUpdate(oldState, newState) {
  if (oldState.channelId === newState.channelId) return;
  const guild = oldState.guild;
  const memberId = newState.id || oldState.id;

  // Joined one of our voice channels
  if (newState.channelId) {
    const sys = Object.values(systems).find((s) => s.voiceId === newState.channelId);
    if (sys) {
      await applyMemberPerms(guild, memberId, newState.channelId);
    }
  }

  // Left one of our voice channels
  if (oldState.channelId) {
    const wasInSystem = Object.values(systems).find((s) => s.voiceId === oldState.channelId);
    if (wasInSystem) {
      // Only remove perms if they didn't just move to the other system's voice
      const joinedOtherSystem = newState.channelId && Object.values(systems).find((s) => s.voiceId === newState.channelId);
      if (!joinedOtherSystem) {
        await removeMemberPerms(guild, memberId);
      }
    }
  }
}

// ────── Register ──────

function registerSpyGame(client) {
  const sendAll = async () => {
    for (const sys of Object.values(systems)) {
      try { await sys.sendNewPanel(client); } catch (e) { console.error("Failed to send panel for " + sys.label, e); }
    }
    console.log("Spy Game module loaded.");
  };

  if (client.isReady()) {
    sendAll().catch(console.error);
  }
  client.once("ready", sendAll);

  client.on("interactionCreate", async (interaction) => {
    try {
      const cid = interaction.customId || "";
      const action = cid.split(":")[0];

      if (interaction.isButton()) {
        switch (action) {
          case CUSTOM_IDS.JOIN:
          case CUSTOM_IDS.LEAVE:
          case CUSTOM_IDS.START:
            if (!interaction.inGuild()) return;
            break;
        }
        switch (action) {
          case CUSTOM_IDS.JOIN: await onJoin(interaction); break;
          case CUSTOM_IDS.LEAVE: await onLeave(interaction); break;
          case CUSTOM_IDS.START: await onStart(interaction); break;
          case CUSTOM_IDS.GUESS: await onGuess(interaction); break;
        }
        return;
      }

      if (interaction.isStringSelectMenu()) {
        if (!interaction.inGuild()) return;
        if (action === CUSTOM_IDS.VOTE) {
          await onVote(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        if (action === CUSTOM_IDS.GUESS_SUBMIT) {
          await onGuessSubmit(interaction);
        }
        return;
      }
    } catch (err) {
      console.error("Spy Game error:", err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "An error occurred.", ephemeral: true }).catch(() => null);
      }
    }
  });

  client.on("voiceStateUpdate", onVoiceStateUpdate);
}

module.exports = { registerSpyGame };
