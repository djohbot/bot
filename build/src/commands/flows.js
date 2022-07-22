"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.permission = exports.options = void 0;
const builders_1 = require("@discordjs/builders");
exports.options = new builders_1.SlashCommandBuilder()
    .setName("flows")
    .setDescription("Настройки потоков.")
    .addSubcommand((c) => c.setName("create").setDescription("Создать новый поток."))
    .addSubcommand((c) => c.setName("list").setDescription("Посмотреть список созданных на этом сервере потоков."))
    .addSubcommand((c) => c.setName("delete").setDescription("Удалить ранее созданный поток.")
    .addStringOption((o) => o.setName("id").setDescription("Id потока, который нужно удалить. (/flows list)").setRequired(true)))
    .toJSON();
exports.permission = 2;
const discord_js_1 = require("discord.js");
const constants_1 = require("../constants/");
const walkthrough_1 = require("../constants/flows/walkthrough");
const flows_1 = __importDefault(require("../constants/flows/"));
const Util_1 = __importDefault(require("../util/Util"));
const { limitFlows, limitTriggers, limitActions } = flows_1.default;
const run = async (interaction) => {
    const gdb = await Util_1.default.database.guild(interaction.guild.id);
    const global = await Util_1.default.database.global();
    const cmd = interaction.options.getSubcommand();
    const { flows } = gdb.get();
    if (cmd == "create") {
        if (Object.keys(flows).length >= limitFlows)
            return await interaction.reply({
                content: `❌ Вы можете иметь только ${limitFlows} потоков.`,
                ephemeral: true
            });
        if (!interaction.guild.me.permissions.has("MANAGE_CHANNELS"))
            return await interaction.reply({
                content: "❌ У бота нету прав на создание каналов.",
                ephemeral: true
            });
        const flowId = (0, constants_1.generateID)();
        let channel;
        try {
            channel = await interaction.guild.channels.create("dob-flow-editor", {
                permissionOverwrites: [{
                        id: interaction.client.user.id,
                        allow: [
                            "VIEW_CHANNEL",
                            "SEND_MESSAGES",
                            "MANAGE_MESSAGES",
                            "EMBED_LINKS",
                            "READ_MESSAGE_HISTORY"
                        ]
                    }, {
                        id: interaction.user.id,
                        allow: [
                            "VIEW_CHANNEL",
                            "SEND_MESSAGES",
                            "READ_MESSAGE_HISTORY"
                        ]
                    }, {
                        id: interaction.guild.roles.everyone,
                        deny: [
                            "VIEW_CHANNEL"
                        ]
                    }]
            });
        }
        catch {
            return await interaction.reply("❌ Не удалось создать канал для создания потока.");
        }
        ;
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
                    value: cutFieldValue(await Promise.all(newFlow.actions.map(async (action, index) => `${index + 1} - ${action ? `${await (0, walkthrough_1.formatExplanation)(action)}` : "**Пусто**"}`))),
                    inline: true
                }, {
                    name: "Триггеры",
                    value: cutFieldValue(await Promise.all(newFlow.triggers.map(async (trigger, index) => `${index + 1} - ${trigger ? `${await (0, walkthrough_1.formatExplanation)(trigger)}` : "**Пусто**"}`))),
                    inline: true
                }]
        });
        const pinned = await channel.send("Загрузка...");
        await pinned.pin();
        const success = await (0, walkthrough_1.flowWalkthrough)(interaction.guild, interaction.user, channel, newFlow, generateEmbed, pinned);
        channel.delete();
        if (success) {
            gdb.setOnObject("flows", flowId, newFlow);
            global.addToArray("generatedIds", flowId);
            await interaction.editReply("✅ Поток был успешно создан.");
        }
        else
            await interaction.editReply("❌ Создание потока было отменено.");
    }
    else if (cmd === "delete") {
        const flowId = interaction.options.getString("id");
        if (!flows[flowId])
            return await interaction.reply({ content: "❌ Этот поток не существует.", ephemeral: true });
        gdb.removeFromObject("flows", flowId);
        global.removeFromArray("generatedIds", flowId);
        await interaction.reply({
            content: `✅ Поток \`${flowId}\` был удалён.`
        });
    }
    else if (cmd === "list") {
        const flowIds = Object.keys(flows).slice(0, limitFlows);
        if (flowIds.length) {
            await interaction.reply({
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
                    new discord_js_1.MessageActionRow().setComponents([
                        new discord_js_1.MessageButton().setCustomId("reply:delete").setStyle("DANGER").setEmoji("🗑")
                    ])
                ]
            });
        }
        else
            await interaction.reply({ content: "❌ На этом сервере нету настроенных потоков.", ephemeral: true });
    }
    ;
};
exports.run = run;
const cutFieldValue = (value) => {
    if (Array.isArray(value))
        value = value.join("\n");
    if (value.length > 1024)
        return value.slice(0, 1014) + " **[...]**";
    else
        return value;
};
const formatTriggers = async (flow) => {
    const formatted = await Promise.all(flow.triggers.slice(0, limitTriggers).filter((t) => t).map(async (trigger) => `• ${await (0, walkthrough_1.formatExplanation)(trigger)}`));
    return formatted.join("\n");
};
const formatActions = async (flow) => {
    const formatted = await Promise.all(flow.actions.slice(0, limitActions).filter((a) => a).map(async (action) => `• ${await (0, walkthrough_1.formatExplanation)(action)}`));
    return formatted.join("\n");
};
