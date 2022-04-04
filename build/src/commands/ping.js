"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.permission = exports.options = void 0;
const builders_1 = require("@discordjs/builders");
const pretty_ms_1 = __importDefault(require("pretty-ms"));
const mongoose_1 = require("mongoose");
exports.options = new builders_1.SlashCommandBuilder()
    .setName("ping")
    .setDescription("Посмотреть задержку бота.")
    .toJSON();
exports.permission = 0;
const run = async (interaction) => {
    const server = Date.now() - interaction.createdTimestamp;
    const uptime = (0, pretty_ms_1.default)(interaction.client.uptime);
    const api = interaction.guild.shard.ping;
    let a = Date.now();
    await (0, mongoose_1.model)("Guild").find();
    const dbping = Date.now() - a;
    await interaction.reply({
        embeds: [{
                title: "🏓 Понг!",
                description: [
                    "```",
                    `Сервер   :: ${server}ms`,
                    `API      :: ${api}ms`,
                    `DB       :: ${dbping}ms`,
                    `Аптайм   :: ${uptime}`,
                    "```"
                ].join("\n")
            }]
    });
};
exports.run = run;
