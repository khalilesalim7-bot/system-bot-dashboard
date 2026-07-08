module.exports = {
    name: "inviteDelete",

    async execute(invite) {
        const client = invite.client;

        if (!client.invitesCache) return;
        if (!invite.guild) return;

        const guildInvites = client.invitesCache.get(invite.guild.id);
        if (!guildInvites) return;

        guildInvites.delete(invite.code);
    }
};