"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.run=exports.permission=exports.options=void 0;const builders_1=require("@discordjs/builders");exports.options=(new builders_1.SlashCommandBuilder).setName("skip").setDescription("Пропустить текущий трек.").toJSON(),exports.permission=0;const Util_1=__importDefault(require("../util/Util")),run=async e=>{const t=e.member;if(!t.voice.channel)return await e.reply({content:"❌ Вы должны находится в голосовом канале.",ephemeral:!0});if(e.guild.me.voice.channel&&t.voice.channel.id!==e.guild.me.voice.channel.id)return await e.reply({content:"❌ Вы должны находится в том же голосовом канале, что и я.",ephemeral:!0});const i=Util_1.default.lava.get(e.guildId);if(!i)return await e.reply({content:"❌ На этом сервере ничего не играет.",ephemeral:!0});await e.reply("Пропускаю текущий трек.").then((()=>i.stop())),setTimeout((async()=>await e.deleteReply().catch((()=>{}))),3e4)};exports.run=run;