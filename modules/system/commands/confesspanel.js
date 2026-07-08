const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFESSION_CHANNEL_ID = '1422879830306717706';
const ALLOWED_USER_ID = '1084793381491834890';
const COUNT_FILE = path.join(__dirname, '../data/confessionCount.json');

module.exports = {
  name: 'setconf',
  description: '**Send the confession panel (owner only)**',
  async execute(message, args) {
    if (message.author.id !== ALLOWED_USER_ID) return;

    const channel = message.client.channels.cache.get(CONFESSION_CHANNEL_ID);
    if (!channel) return message.reply('Confession channel not found.');

    let bannerUrl = process.env.CONFESSION_BANNER_URL || '';
    if (message.attachments.size > 0) {
      bannerUrl = message.attachments.first().url;
    } else if (args.length > 0 && args[0].startsWith('http')) {
      bannerUrl = args[0];
    }

    await sendConfessionPanel(message.client, bannerUrl);
    message.reply('Confession panel sent.');
  }
};

async function sendConfessionPanel(client, bannerUrl) {
  const channel = client.channels.cache.get(CONFESSION_CHANNEL_ID);
  if (!channel) return;

  bannerUrl = bannerUrl || process.env.CONFESSION_BANNER_URL || '';

  let countData = { count: 0, lastMessageId: null };
  try { countData = JSON.parse(fs.readFileSync(COUNT_FILE, 'utf8')); } catch {}

  const embed = new EmbedBuilder()
    .setTitle('<a:15831lovenote:1469294524500021334> Confessions')
    .setDescription('Click the button below to submit an anonymous confession.')
    .setColor(0xffffff)
    .setTimestamp();

  if (bannerUrl) embed.setImage(bannerUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confession_btn')
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

module.exports.sendConfessionPanel = sendConfessionPanel;
