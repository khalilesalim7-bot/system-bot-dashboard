const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const GIRLS_CONFESSION_CHANNEL_ID = '1523051575638098051';
const ALLOWED_USER_ID = '1084793381491834890';
const COUNT_FILE = path.join(__dirname, '../data/girlsConfessionCount.json');

module.exports = {
  name: 'setgirlsconf',
  description: '**Send the girls confession panel (owner only)**',
  async execute(message, args) {
    if (message.author.id !== ALLOWED_USER_ID) return;
    await sendGirlsPanel(message.client, message.channel);
    message.reply('Girls confession panel sent.');
  }
};

async function sendGirlsPanel(client, replyChannel) {
  const channel = client.channels.cache.get(GIRLS_CONFESSION_CHANNEL_ID);
  if (!channel) {
    if (replyChannel) replyChannel.send('Girls confession channel not found.');
    return;
  }

  let bannerUrl = process.env.GIRLS_CONFESSION_BANNER_URL || '';

  let countData = { count: 0, lastMessageId: null };
  try { countData = JSON.parse(fs.readFileSync(COUNT_FILE, 'utf8')); } catch {}

  const embed = new EmbedBuilder()
    .setTitle('<a:15831lovenote:1469294524500021334> Girls Confessions')
    .setDescription('Click the button below to submit an anonymous confession.')
    .setColor(0xffffff)
    .setTimestamp();

  if (bannerUrl) embed.setImage(bannerUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('girls_confession_btn')
      .setLabel('Submit a Confession')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('<a:arewws:1516459068519223326>')
  );

  if (countData.lastMessageId) {
    const existing = await channel.messages.fetch(countData.lastMessageId).catch(() => null);
    if (existing) {
      await existing.edit({ embeds: [embed], components: [row] }).catch(() => {});
      return;
    }
  }

  const sent = await channel.send({ embeds: [embed], components: [row] });
  countData.lastMessageId = sent.id;
  await fs.promises.writeFile(COUNT_FILE, JSON.stringify(countData, null, 2));
}

module.exports.sendGirlsPanel = sendGirlsPanel;