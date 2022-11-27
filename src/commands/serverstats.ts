import { ChannelType, SlashCommandBuilder } from "discord.js";

export const options = new SlashCommandBuilder()
    .setName("serverstats")
    .setDescription("Manage stats channels.")
    .setDefaultMemberPermissions(8)
    .setDMPermission(false)
    .addSubcommand(c =>
        c
            .setName("set")
            .setDescription("Set a stats channel.")
            .addChannelOption(o =>
                o
                    .setName("channel")
                    .setDescription("Channel.")
                    .addChannelTypes(
                        ChannelType.GuildCategory,
                        ChannelType.GuildText,
                        ChannelType.GuildVoice,
                        ChannelType.GuildAnnouncement,
                        ChannelType.GuildStageVoice
                    )
                    .setRequired(true)
            )
            .addStringOption(o =>
                o
                    .setName("text")
                    .setDescription("Template. For placehoolders check /docs")
                    .setRequired(true)
            )
    )
    .addSubcommand(c =>
        c
            .setName("delete")
            .setDescription("Delete a stats channel.")
            .addStringOption(o =>
                o
                    .setName("channel")
                    .setDescription("Channel ID.")
                    .setAutocomplete(true)
                    .setRequired(true)
            )
    )
    .addSubcommand(c =>
        c
            .setName("list")
            .setDescription("List all stats channels.")
    )
    .toJSON();

import { ChatInputCommandInteraction, escapeMarkdown } from "discord.js";
import { getGuildDocument } from "../database";
import i18next from "i18next";

export const run = async (interaction: ChatInputCommandInteraction) => {
    const document = await getGuildDocument(interaction.guild.id);
    const t = i18next.getFixedT(document.locale, null, "commands.serverstats");

    switch (interaction.options.getSubcommand()) {
        case "set":
            const channel = interaction.options.getChannel("channel");
            const text = interaction.options.getString("text");

            const limit = 5;

            if (document.statschannels.size >= limit)
                return interaction.reply(t("set.limit", { count: limit }));
            if (text.length > 64)
                return interaction.reply(t("set.template", { count: 64 }));

            document.statschannels.set(channel.id, { template: text });
            document.safeSave();

            return interaction.reply(t("set.done", { channel: `${channel}`, template: escapeMarkdown(text) }));
        case "delete":
            const channelId = interaction.options.getString("channel");

            document.statschannels.delete(channelId);
            document.safeSave();

            return interaction.reply(t("delete.done"));
        case "list":
            const list = Array.from(document.statschannels).map(([channelId, { template }]) => [
                `> <#${channelId}> (\`${channelId}\`)`,
                `\`${escapeMarkdown(template)}\``
            ].join("\n"));

            return interaction.reply({
                embeds: [{
                    title: t("list.title"),
                    description: list.join("\n\n") || t("list.empty")
                }]
            });
    };
};