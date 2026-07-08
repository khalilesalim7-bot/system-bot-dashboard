const allowedVoiceChannels = [
    '1417802712422154393',
    '1417802715408371732'
];

async function handlePanelButtons(interaction) {
    if (!interaction.guild) return;

    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    // لازم يكون فـ voice
    if (!voiceChannel) {
        return interaction.reply({
            content: '**<a:DVloodl:1418252713296396432> you have to be in the voice chat to be able to use the panle**',
            flags: 64
        });
    }

    // لازم يكون فـ voice 1 ولا 2
    if (!allowedVoiceChannels.includes(voiceChannel.id)) {
        return interaction.reply({
            content: '(**9owed hbb**)',
            flags: 64
        });
    }

    try {
        await interaction.deferReply({ flags: 64 });

        const actions = [];

        for (const [, m] of voiceChannel.members) {
            if (interaction.customId === 'mute_all' && !m.voice.serverMute) {
                actions.push(m.voice.setMute(true, 'Mute all panel'));
            }

            if (interaction.customId === 'unmute_all' && m.voice.serverMute) {
                actions.push(m.voice.setMute(false, 'Unmute all panel'));
            }
        }

        await Promise.all(actions);

        await interaction.editReply(
            interaction.customId === 'mute_all'
                ? `**<:1144silververify:1468928751000621136> All users has been muted**.  **${voiceChannel.name}**`
                : `**<:1144silververify:1468928751000621136> All users has been unmuted**. **${voiceChannel.name}**`
        );

    } catch (err) {
        console.error(err);
        if (interaction.deferred) {
            await interaction.editReply('**something wrong**');
        }
    }
}

module.exports = { handlePanelButtons };
