import { AutocompleteInteraction } from "discord.js";
import { getGuildDocument } from "../../database";
import i18next from "i18next";

export = async (interaction: AutocompleteInteraction) => {
    const document = await getGuildDocument(interaction.guildId);
    const t = i18next.getFixedT(document.locale, null, null);

    if (
        interaction.commandName === "serverstats"
        && interaction.options.getSubcommand() === "delete"
    ) {
        const response = [];

        for (const [channelId, text] of document.statschannels) {
            response.push({
                name: `${channelId} | ${text}`,
                value: channelId
            });
        };

        return interaction.respond(response);
    } else if (interaction.commandName === "warn" && interaction.options.getSubcommand() === "remove") {
        const response: { name: string; value: string; }[] = [];

        for (const [id, { userId, reason }] of document.warns) {
            if (!id.startsWith(interaction.options.getString("id"))) continue;

            const formattedReason = reason
                ? reason.length > 64
                    ? reason.substring(0, 64) + "..."
                    : reason
                : t("commands.warn.list.notspecified");
            const userTag = await interaction.client.users.fetch(userId).then((u) => u.tag).catch(() => "Unknown#0000");

            response.push({
                name: `${id} | ${userTag} - ${formattedReason}`,
                value: id
            });
        };

        return interaction.respond(response);
    } else if (interaction.commandName === "buttonroles" && interaction.options.getSubcommand() === "delete") {
        const response: { name: string; value: string; }[] = [];

        for (const [id, roleId] of document.brs) {
            if (!id.startsWith(interaction.options.getString("id"))) continue;

            const channelId = document.brcs.get(id);

            const role = interaction.guild.roles.cache.get(roleId);
            const channel = interaction.guild.channels.cache.get(channelId);

            response.push({
                name: `${id} | @${role?.name ?? "Unknown role"} - #${channel?.name ?? "Unknown channel"}`,
                value: id
            });
        };

        return interaction.respond(response);
    };
};