const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'lock',
  description: 'Lock the channel for a specific role',
  async execute(interaction) {
    // تأكد من أن المستخدم عنده صلاحية الأدمن
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '**<:298685ex:1467929031617020009> roh tr9od hbb.**', flags: 64 });
    }

    const channel = interaction.channel;
    const roleId = '1417802580645380176'; // Role ID لي باغي تمنع عليه الإرسال

    try {
      await channel.permissionOverwrites.edit(roleId, { SendMessages: false });
      interaction.reply({ content: '**<:414779lock:1468983363670114415> Channel locked.**', ephemeral: false });
    } catch (error) {
      console.error(error);
      interaction.reply({ content: '**<:298685ex:1467929031617020009> Error.**', flags: 64 });
    }
  },
};
