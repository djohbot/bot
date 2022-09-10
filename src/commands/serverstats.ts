import { ChannelType, SlashCommandBuilder } from "discord.js";

export const options = new SlashCommandBuilder()
    .setName("serverstats")
    .setDescription("Управлять каналами статистики.")
    .setDefaultMemberPermissions(8)
    .setDMPermission(false)
    .addSubcommand(c =>
        c
            .setName("set")
            .setDescription("Установить канал статистики.")
            .addChannelOption(o =>
                o
                    .setName("channel")
                    .setDescription("Канал.")
                    .addChannelTypes(
                        ChannelType.GuildCategory,
                        ChannelType.GuildText,
                        ChannelType.GuildVoice,
                        ChannelType.GuildNews,
                        ChannelType.GuildStageVoice
                    )
                    .setRequired(true)
            )
            .addStringOption(o =>
                o
                    .setName("text")
                    .setDescription("Шаблонизатор. Ссылка на гайд в команде /docs")
                    .setRequired(true)
            )
    )
    .addSubcommand(c =>
        c
            .setName("delete")
            .setDescription("Удалить канал статистики.")
            .addStringOption(o =>
                o
                    .setName("channel")
                    .setDescription("Айди канала. Доступно автозаполнение.")
                    .setAutocomplete(true)
                    .setRequired(true)
            )
    )
    .addSubcommand(c =>
        c
            .setName("list")
            .setDescription("Список каналов статистики.")
    )
    .toJSON();

import { ChatInputCommandInteraction } from "discord.js";
import Util from "../util/Util";

export const run = async (interaction: ChatInputCommandInteraction) => {
    const gdb = await Util.database.guild(interaction.guild.id);

    switch (interaction.options.getSubcommand()) {
        case "set":
            const channel = interaction.options.getChannel("channel");
            const text = interaction.options.getString("text").replace(/\`/g, "");

            if (Object.keys(gdb.get().statschannels).length === 5)
                return interaction.reply("Вы не можете установить больше 5 каналов статистики.");
            if (text.length > 64)
                return interaction.reply("Длина шаблона должна быть не длиннее 64 символов.");

            gdb.setOnObject("statschannels", channel.id, text);

            return interaction.reply([
                `Канал статистики установлен: ${channel}`,
                `Шаблон: \`${text}\``
            ].join("\n"));
        case "delete":
            const channelId = interaction.options.getString("channel");
            gdb.removeFromObject("statschannels", channelId);
            return interaction.reply(`Канал статистики удален: <#${channelId}>`);
        case "list":
            const { statschannels } = gdb.get();
            const result: string[] = [];

            for (const [channelId, text] of Object.entries(statschannels)) {
                result.push([
                    `> <#${channelId}> (\`${channelId}\`)`,
                    `\`${text.replace(/\`/g, "")}\``
                ].join("\n"));
            };

            return interaction.reply({
                embeds: [{
                    title: "Каналы статистики",
                    description: result.join("\n\n") || "Тут пусто."
                }]
            });
    };
};