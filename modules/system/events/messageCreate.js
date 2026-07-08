const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const prefix = '.';
const PANEL_CHANNEL_ID = '1467900695452582082';
const CLEAR_ROLE_ID = '1417802492187512932';

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    const blockedChannels = [
      '1417802769535864842',
      '1418908137552875551'
    ];

    if (blockedChannels.includes(message.channel.id)) {
      if (message.attachments.size === 0 && message.content) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send(
          `**<:298685ex:1467929031617020009> ${message.author}, you can send only pics & vids in this channel.**`
        ).catch(() => {});
        setTimeout(() => {
          warnMsg?.delete().catch(() => {});
        }, 4000);
        return;
      }
    }

    const reactionChannels = {
      '1417802727156748381': ['<a:5620blueflame:1469260991819939840>', '<:97833general:1468920956016791572>', '<a:3685yellowsparklingstars:1467927818548678850>', '<a:74780diamond:1467937461014368297>', '<a:76419gummydragonmicrophone:1468933510881349703>', '<:69009wingblue1:1469265452931874861>'],
      '1417802769535864842': ['<:312392heartshape:1467936324052062449>', '<a:74780diamond:1467937461014368297>', '<a:DVwings:1417989070667255859>', '<a:9868rosegarden:1467936855835017502>', '<a:13768angelwing:1467942675255656468>', '<a:51132shyhands:1468012354464645120>'],
      '1418908137552875551': ['<a:DVswq:1417886992913666078>', '<a:571294pinkpaw:1467937914817347846>', '<a:81003cat:1469265527624175728>', '<a:t_laugh:1363819165361766562>', '<:4853catcute:1468012311317843978>', '<:hmmm:1417867877503209523>'],
      '1422879830306717706': ['<a:69070loveletter:1469265577888579748>', '<a:redddds:1425925777668702439>'],
      '1426321593990381618': ['<a:10173pinkpixelheart:1467936951045849291>', '<a:81003cat:1469265527624175728>', '<a:571294pinkpaw:1467937914817347846>', '<a:46605rosebloom:1467937240595566744>', '<a:604354heartpop:1467938010476580956>', '<a:9823balloonheartsstars:1467936837828873>'],
      '1425954121537683610': ['<:674881pinkletterwings:1469265477183344751>', '<a:10173pinkpixelheart:1467936951045849291>'],
      '1472988452177055920': ['<a:110055blue:1467937690686324830>', '<a:46605rosebloom:1467937240595566744>', '<a:DravenRoseHeart:1467577501181284363> ']
    };

    const emojis = reactionChannels[message.channel.id];
    if (emojis) {
      for (const emoji of emojis) {
        await message.react(emoji).catch(() => {});
      }
    }

    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const member = message.member;

    if (commandName === 'clear') {
      if (
        !member.permissions.has('Administrator') &&
        !member.roles.cache.has(CLEAR_ROLE_ID)
      ) return;

      const amount = parseInt(args[0]);
      if (!amount || amount <= 0) return;

      message.channel.bulkDelete(amount + 1, true)
        .then(deleted => {
          message.channel.send(`**<a:DVwings:1417989070667255859> Successfully deleted ${deleted.size - 1} messages.**`)
            .then(msg => setTimeout(() => msg.delete(), 5000));
        })
        .catch(() => {});
      return;
    }

    if (commandName === 'among') {
      const channel = client.channels.cache.get(PANEL_CHANNEL_ID);
      if (!channel) return message.reply('Panel channel not found.');

      const embed = new EmbedBuilder()
        .setDescription(`## <a:26926ventamongus:1467949338201296897> AMONG US CONTROL PANEL
**<a:DravenImposterRunning:1469339123989876897> You need to be in Voice 1 or Voice 2 to mute.**
**<a:DravenImposterRunning:1469339123989876897> Use responsibly.**`)
        .setThumbnail('https://i.postimg.cc/T334JMgs/Screenshot-2026-02-02-190656.png')
        .setImage('https://image2url.com/r2/default/gifs/1770551710753-72e287cc-c52e-4673-8921-892edc38640b.gif')
        .setColor(0x000000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mute_all')
          .setLabel('Mute All')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('<:mutee:1470025455741571111>'),
        new ButtonBuilder()
          .setCustomId('unmute_all')
          .setLabel('Unmute All')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('<:micrr:1470025440318980156>'),
        new ButtonBuilder()
          .setCustomId('among_blacklist')
          .setLabel('Blacklist')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('<:92042no:1470786991451930735>'),
        new ButtonBuilder()
          .setCustomId('among_unblacklist')
          .setLabel('Unblacklist')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('<:1144silververify:1468928751000621136>')
      );

      const botMsgs = await channel.messages.fetch({ limit: 20 }).catch(() => null);
      const existing = botMsgs?.find(m =>
        m.author.id === client.user.id &&
        m.embeds[0]?.description?.includes('AMONG US CONTROL PANEL')
      );

      if (existing) {
        await existing.edit({ embeds: [embed], components: [row] }).catch(() => {});
        await message.reply('Among Us panel updated.').catch(() => {});
      } else {
        await channel.send({ embeds: [embed], components: [row] }).catch(() => {});
        await message.reply('Among Us panel sent.').catch(() => {});
      }
      return;
    }

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      command.execute(message, args, client);
    } catch (error) {
      console.error(error);
      message.reply('Something went wrong.');
    }
  }
};
