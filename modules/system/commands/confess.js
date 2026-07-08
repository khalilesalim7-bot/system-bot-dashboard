const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const CONFESSION_CHANNEL_ID = '1422879830306717706';
const LOG_CHANNEL_ID = '1422888371008700438';
const APPROVE_ROLE_ID = '1417802492187512932';

const { pendingConfessions, buildConfessionEmbed } = require('../events/modalSubmit.js');

module.exports = {
  name: 'confess',
  description: '**Send an anonymous confession with text & image**',
  async execute(message, args) {
    if (!args.length && message.attachments.size === 0) {
      return message.reply({
        embeds: [new EmbedBuilder().setTitle('Error').setDescription('**Write text or attach an image after .confess**').setColor('Red')]
      });
    }

    const confession = args.join(' ') || 'No text';
    const imageUrl = message.attachments.first()?.url || null;

    const logChannel = message.client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return message.reply('Log channel not found.');

    const reviewEmbed = new EmbedBuilder()
      .setTitle('⏳ Pending Confession')
      .setDescription(confession)
      .addFields(
        { name: 'Submitted by', value: `${message.author.tag} (<@${message.author.id}>)`, inline: false }
      )
      .setColor(0xf1c40f)
      .setTimestamp();

    if (imageUrl) reviewEmbed.setImage(imageUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confess_approve')
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('confess_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );

    const logMsg = await logChannel.send({ embeds: [reviewEmbed], components: [row] });

    if (typeof pendingConfessions.set === 'function') {
      pendingConfessions.set(logMsg.id, {
        confession,
        imageUrl,
        userId: message.author.id,
        userTag: message.author.tag
      });
    }

    message.reply({ embeds: [new EmbedBuilder().setTitle('Sent').setDescription('Your confession has been submitted for review.').setColor(0x00ff00)] });
  }
};
