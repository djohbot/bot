const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    options: new SlashCommandBuilder()
        .setName("flows")
        .setDescription("Настройки потоков.")
        .addSubcommand((c) => c.setName("create").setDescription("Создать новый поток."))
        .addSubcommand((c) => c.setName("list").setDescription("Посмотреть список созданных на этом сервере потоков."))
        .addSubcommand((c) =>
            c.setName("delete").setDescription("Удалить ранее созданный поток.")
                .addStringOption((o) => o.setName("id").setDescription("Id потока, который нужно удалить. (/flows list)").setRequired(true))
        )
        .toJSON(),
    permission: 2
};

const db = require("../database/")();
const { CommandInteraction } = require("discord.js");
const { flowWalkthrough, formatExplanation, limitTriggers, limitActions, limitFlows, generateID } = require("../constants/");

module.exports.run = async (interaction) => {
    if (!(interaction instanceof CommandInteraction)) return;

    const gdb = await db.guild(interaction.guild.id);
    const cmd = interaction.options.getSubcommand();
    const { flows } = gdb.get();
    if (cmd == "create") {
        if (Object.keys(flows).length >= limitFlows) return interaction.reply({
            content: `❌ Вы можете иметь только ${limitFlows} потоков.`,
            ephemeral: true
        });

        if (!interaction.guild.me.permissions.has("MANAGE_CHANNELS"))
            return interaction.reply({
                content: "❌ У бота нету прав на создание каналов.",
                ephemeral: true
            });

        const flowId = generateID();
        const channel = await interaction.guild.channels.create("dob-flow-editor", {
            permissionOverwrites: [{
                id: interaction.client.user.id,
                allow: [
                    "VIEW_CHANNEL",
                    "SEND_MESSAGES",
                    "MANAGE_MESSAGES",
                    "EMBED_LINKS",
                    "READ_MESSAGE_HISTORY"
                ]
            },
            {
                id: interaction.user.id,
                allow: [
                    "VIEW_CHANNEL",
                    "SEND_MESSAGES",
                    "READ_MESSAGE_HISTORY"
                ]
            },
            {
                id: interaction.guild.roles.everyone,
                deny: [
                    "VIEW_CHANNEL"
                ]
            }]
        });
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
            },
            {
                name: "Действия",
                value: cutFieldValue(await Promise.all(
                    newFlow.actions.map(async (action, index) =>
                        `${index + 1} - ${action ? `${await formatExplanation(action)}` : "**Пусто**"}`
                    )
                )),
                inline: true
            },
            {
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

        await pinned.pin();
        const success = await flowWalkthrough(interaction.guild, interaction.user, channel, newFlow, generateEmbed, pinned);

        channel.delete();
        if (success) {
            gdb.setOnObject("flows", flowId, newFlow);
            db.global.addToArray("generatedIds", flowId);

            return await interaction.editReply("✅ Поток был успешно создан.");
        } else return await interaction.editReply("❌ Создание потока было отменено.");
    } else if (cmd === "delete") {
        const flowId = interaction.options.getString("id");
        if (!flows[flowId])
            return interaction.reply({ content: "❌ Этот поток не существует.", ephemeral: true });

        gdb.removeFromObject("flows", flowId);
        db.global.removeFromArray("generatedIds", flowId);

        return interaction.reply({
            content: `✅ Поток \`${flowId}\` был удалён.`,
            ephemeral: (gdb.get().channel == interaction.channel.id)
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
                components: [{
                    type: 1,
                    components: [{
                        type: 2,
                        emoji: {
                            name: "🗑"
                        },
                        style: 4,
                        custom_id: "reply:delete"
                    }]
                }]
            });
        } else return interaction.reply({ content: "❌ На этом сервере нету настроенных потоков.", ephemeral: true });
    };
};

function cutFieldValue(value) {
    if (typeof value == "object") value = value.join("\n");
    if (value.length > 1024) return value.slice(0, 1014) + " **[...]**";
    else return value;
};

async function formatTriggers(flow) {
    const formatted = await Promise.all(flow.triggers.slice(0, limitTriggers).filter((t) => t).map(async (trigger) => `• ${await formatExplanation(trigger)}`));
    return formatted.join("\n");
};

async function formatActions(flow) {
    const formatted = await Promise.all(flow.actions.slice(0, limitActions).filter((a) => a).map(async (action) => `• ${await formatExplanation(action)}`));
    return formatted.join("\n");
};