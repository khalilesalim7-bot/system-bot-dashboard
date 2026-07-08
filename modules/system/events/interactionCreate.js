module.exports = {
    name: "inviteCreate",

    async execute(invite) {
        const client = invite.client;

        if (!client.invitesCache) client.invitesCache = new Map();
        if (!invite.guild) return;

        let guildInvites = client.invitesCache.get(invite.guild.id);

        if (!guildInvites) {
            guildInvites = new Map();
            client.invitesCache.set(invite.guild.id, guildInvites);
        }

        guildInvites.set(invite.code, invite.uses ?? 0);
    }
};