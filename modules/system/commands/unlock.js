const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'unlock',
  description: 'Unlock the channel for a specific role',
  async execute(interaction) {
    // تأكد من أن المستخدم عنده صلاحية الأدمن
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '**<:298685ex:1467929031617020009> muah.**', flags: 64 });
    }

    const channel = interaction.channel;
    const roleId = '1417802580645380176'; // Role ID لي باغي ترجّع ليه الإذن

    try {
      await channel.permissionOverwrites.edit(roleId, { SendMessages: true });
      interaction.reply({ content: '**<:685116unlock:1468983371769184266> Channel unlocked.**', ephemeral: false });
    } catch (error) {
      console.error(error);
      interaction.reply({ content: '**<:298685ex:1467929031617020009> error.**', flags: 64 });
    }
  },
};
