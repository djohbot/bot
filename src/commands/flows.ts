import { SlashCommandBuilder } from "discord.js";

export const options = new SlashCommandBuilder()
    .setName("flows")
    .setDescription("Настройки потоков.")
    .setDefaultMemberPermissions(8)
    .setDMPermission(false)
    .addSubcommand((c) => c.setName("create").setDescription("Создать новый поток."))
    .addSubcommand((c) => c.setName("list").setDescription("Посмотреть список созданных на этом сервере потоков."))
    .addSubcommand((c) =>
        c.setName("delete").setDescription("Удалить ранее созданный поток.")
            .addStringOption((o) => o.setName("id").setDescription("Id потока, который нужно удалить. (/flows list)").setRequired(true))
    )
    .toJSON();

import {
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    PermissionFlagsBits,
    TextChannel,
    ButtonStyle
} from "discord.js";
import { flowWalkthrough, formatExplanation } from "../constants/flows/walkthrough";
import { generateID } from "../constants/";
import limits from "../constants/flows/";
import Util from "../util/Util";
const { limitFlows, limitTriggers, limitActions } = limits;

export const run = async (interaction: ChatInputCommandInteraction) => {
    const gdb = await Util.database.guild(interaction.guild.id);
    const cmd = interaction.options.getSubcommand();
    const { flows } = gdb.get();

    if (cmd === "create") {
        if (Object.keys(flows).length >= limitFlows)
            return interaction.reply({
                content: `❌ Вы можете иметь только ${limitFlows} потоков.`,
                ephemeral: true
            });

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
            return interaction.reply({
                content: "❌ У бота нету прав на создание каналов.",
                ephemeral: true
            });

        const flowId = generateID();
        let channel: TextChannel | null = null;
        try {
            channel = await interaction.guild.channels.create({
                name: "dob-flow-editor",
                permissionOverwrites: [{
                    id: interaction.client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageMessages,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                }, {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                }, {
                    id: interaction.guild.roles.everyone,
                    deny: [
                        PermissionFlagsBits.ViewChannel
                    ]
                }]
            });
        } catch {
            return interaction.reply("❌ Не удалось создать канал для создания потока.").catch(() => 0);
        };
        await interaction.reply({
            content: `🌀 Перейдите в ${channel} для настройки нового потока.`,
            ephemeral: true
        });
        const newFlow = {
            triggers: Array(limitTriggers).fill(null),
            actions: Array(limitActions).fill(null)
        };
        const generateEmbed = async () => ({
            title: "🌀 Создание нового потока",
            description: [
                "Приветствую в менеджере потоков! Я помогу Вам в создании нового.",
                "Триггер - то, что задействует \"действие\". Действие, это то, что выполнится после задействования потока.",
                `Вы можете создать ${limitTriggers} триггеров и ${limitActions} действий на поток.`
            ].join("\n\n"),
            fields: [{
                name: "Команды",
                value: [
                    "• `edit <trigger или action> <слот>`: Изменить слот триггера или действия.",
                    "• `save`: Сохранить поток и удалить канал.",
                    "• `cancel`: Отменить создание потока и удалить канал."
                ].join("\n")
            }, {
                name: "Действия",
                value: cutFieldValue(await Promise.all(
                    newFlow.actions.map(async (action, index) =>
                        `${index + 1} - ${action ? `${await formatExplanation(action)}` : "**Пусто**"}`
                    )
                )),
                inline: true
            }, {
                name: "Триггеры",
                value: cutFieldValue(await Promise.all(
                    newFlow.triggers.map(async (trigger, index) =>
                        `${index + 1} - ${trigger ? `${await formatExplanation(trigger)}` : "**Пусто**"}`
                    )
                )),
                inline: true
            }]
        });
        const pinned = await channel.send("Загрузка...");

        await pinned.pin().catch(() => 0);
        const success = await flowWalkthrough(interaction.guild, interaction.user, channel, newFlow, generateEmbed, pinned);

        await channel.delete().catch(() => 0);
        if (success) {
            gdb.setOnObject("flows", flowId, newFlow);

            return interaction.editReply("✅ Поток был успешно создан.").catch(() => 0);
        } else return interaction.editReply("❌ Создание потока было отменено.").catch(() => 0);
    } else if (cmd === "delete") {
        const flowId = interaction.options.getString("id");
        if (!flows[flowId]) return interaction.reply({ content: "❌ Этот поток не существует.", ephemeral: true });

        gdb.removeFromObject("flows", flowId);

        return interaction.reply({
            content: `✅ Поток \`${flowId}\` был удалён.`
        });
    } else if (cmd === "list") {
        const flowIds = Object.keys(flows).slice(0, limitFlows);

        if (flowIds.length) {
            return interaction.reply({
                embeds: [{
                    title: "Список потоков",
                    description: `У Вас использовано ${flowIds.length} из ${limitFlows} потоков.`,
                    fields: await Promise.all(flowIds.map(async (flowId) => {
                        const val = ([
                            "**Триггеры:**",
                            await formatTriggers(flows[flowId]),
                            "**Действия:**",
                            await formatActions(flows[flowId])
                        ].join("\n").split("\n").map((l) => `> ${l}`).join("\n") + "\n** **");
                        return ({
                            name: `Поток \`${flowId}\``,
                            value: cutFieldValue(val),
                            inline: true
                        });
                    }))
                }],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().setComponents([
                        new ButtonBuilder().setCustomId("reply:delete").setStyle(ButtonStyle.Danger).setEmoji("🗑")
                    ])
                ]
            });
        } else return interaction.reply({ content: "❌ На этом сервере нету настроенных потоков.", ephemeral: true });
    };
};

const cutFieldValue = (value: string | string[]): string => {
    if (Array.isArray(value)) value = value.join("\n");
    if (value.length > 1024) return value.slice(0, 1014) + " **[...]**";
    else return value;
};
const formatTriggers = async (flow: any): Promise<string> => {
    const formatted: string[] = await Promise.all(
        flow.triggers.slice(0, limitTriggers).filter((t: any) => t).map(async (trigger: any) => `• ${await formatExplanation(trigger)}`)
    );
    return formatted.join("\n");
};
const formatActions = async (flow: any): Promise<string> => {
    const formatted: string[] = await Promise.all(
        flow.actions.slice(0, limitActions).filter((a: any) => a).map(async (action: any) => `• ${await formatExplanation(action)}`)
    );
    return formatted.join("\n");
};