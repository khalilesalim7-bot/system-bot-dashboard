const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const WELCOME_CHANNEL_ID = "1469015523596439612";
const VERIFY_VOICES = ["1417802664200110201", "1417802666754441369", "1417802667744428113"];
const VERIFY_CATEGORY = "1417802603512729601";

const welcomeMessages = {};

function registerWelcome(client) {
  client.on("guildMemberAdd", async (member) => {
    if (member.user.bot) return;
    try {
      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
      if (!channel) return;

      const voiceLinks = VERIFY_VOICES.map((id) => `https://discord.com/channels/${member.guild.id}/${id}`).join("\n");

      const embed = new EmbedBuilder()
        .setColor(0xa9a9a9)
        .setTitle("<:23:1473011496446464112> Welcome to Our Server!")
        .setDescription(`Hey ${member}, welcome to **${member.guild.name}**<a:2751whitesparklingstars:1467936611152171320> \n\n**To get access, please join one of the verification voice channels below and wait for a staff member.**`)
        .addFields(
          { name: "<a:7392sound:1470045120475959479> Verification Voice Channels", value: voiceLinks || "None", inline: false },
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: "Click the button below to join verification." })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("welcome_verify:" + member.id)
          .setLabel("Get Verified")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:586735checkmark:1472282353337368587>"),
      );

      const msg = await channel.send({ content: `${member}`, embeds: [embed], components: [row] });
      welcomeMessages[member.id] = msg.id;
    } catch (err) {
      console.error("Welcome error (join):", err);
    }
  });

  client.on("guildMemberRemove", async (member) => {
    if (member.user.bot) return;
    try {
      const msgId = welcomeMessages[member.id];
      if (!msgId) return;
      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
      if (!channel) return;
      const msg = await channel.messages.fetch(msgId).catch(() => null);
      if (msg) await msg.delete().catch(() => null);
      delete welcomeMessages[member.id];
    } catch (err) {
      console.error("Welcome error (remove):", err);
    }
  });

  client.on("interactionCreate", async (interaction) => {
    try {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith("welcome_verify:")) return;

      const targetId = interaction.customId.split(":")[1];
      if (interaction.user.id !== targetId) {
        await interaction.reply({ content: "This button is only for the new member.", ephemeral: true });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const voiceChannels = VERIFY_VOICES.map((id) => interaction.guild.channels.cache.get(id)).filter(Boolean);
      if (voiceChannels.length === 0) {
        await interaction.reply({ content: "No verification voice channels available.", ephemeral: true });
        return;
      }

      const targetVc = voiceChannels[Math.floor(Math.random() * voiceChannels.length)];
      await member.voice.setChannel(targetVc).catch(() => null);
      await interaction.reply({ content: `You have been moved to ${targetVc}! Please wait for a staff member.`, ephemeral: true });
    } catch (err) {
      console.error("Welcome error (button):", err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "An error occurred.", ephemeral: true }).catch(() => null);
      }
    }
  });

  console.log("Welcome module loaded.");
}

module.exports = { registerWelcome };
