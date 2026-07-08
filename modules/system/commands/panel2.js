// commands/panel.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'panel',
  description: 'Send clan panel with Get clan button',
  async execute(message, args, client) {

    const embed = new EmbedBuilder()
      .setTitle('Clan Panel')
      .setDescription('اضغط على الزر للحصول على معلومات الكلان')
      .setColor(0x2B2D31);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('get_clan')      // ID خاص بالزر
        .setLabel('Get clan')          // نص الزر
        .setStyle(ButtonStyle.Primary) // لون الزر (ازرق)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
};
