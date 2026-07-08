const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    Events
} = require('discord.js');

const PANEL_CHANNEL_ID = '1417802835067932744';
const PREFIX = '.among';

// ====== SEND PANEL ======
async function sendVoicePanel(client) {
    const channel = client.channels.cache.get(PANEL_CHANNEL_ID);
    if (!channel) return console.log('❌ Panel channel not found');

    const embed = new EmbedBuilder()
        .setDescription(`
## <a:26926ventamongus:1467949338201296897> AMONG US CONTROL PANEL

**<a:55607bluearrowspin:1467936124243673292> You need to be in the Voice 1 or Voice 2 to be able to mute.**
**<a:55607bluearrowspin:1467936124243673292> Please use it for the right thing.**`)
        .setThumbnail("https://i.postimg.cc/T334JMgs/Screenshot-2026-02-02-190656.png")
        .setImage("https://image2url.com/r2/default/gifs/1770551710753-72e287cc-c52e-4673-8921-892edc38640b.gif")
        .setColor(0x7b0e0e);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('mute_all')
            .setLabel('Mute All')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<:mutee:1470025455741571111>"),

        new ButtonBuilder()
            .setCustomId('unmute_all')
            .setLabel('Unmute All')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<:micrr:1470025440318980156>")
    );

    await channel.send({
        embeds: [embed],
        components: [row]
    });

    console.log('✅ Voice panel sent');
}

// ====== PREFIX HANDLER ======
function amongPrefix(client) {
    client.on(Events.MessageCreate, async message => {
        if (message.author.bot) return;

        // شرط للبريفكس
        if (!message.content.toLowerCase().startsWith(PREFIX.toLowerCase())) return;

        // شرط الصلاحيات: Admin أو عندو الرول 1417802492187512932
        const member = message.member;
        if (!member.permissions.has('Administrator') && !member.roles.cache.has('1417802492187512932')) {
            // لا رد أو إشعار
            return; // هنا ما غاديش يرد البوت
        }

        // إذا صالح، يرسل البانيل
        await sendVoicePanel(client);
        await message.reply('✅ **Among Us panel sent.**');
    });
}


module.exports = { amongPrefix };
