"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.run=exports.permission=exports.options=void 0;const builders_1=require("@discordjs/builders");exports.options=(new builders_1.SlashCommandBuilder).setName("volume").setDescription("Установить громкость плеера.").addIntegerOption((e=>e.setName("volume").setDescription("Новая громкость плеера.").setRequired(!0).setMinValue(1).setMaxValue(200))).toJSON(),exports.permission=0;const Util_1=__importDefault(require("../util/Util")),run=async e=>{const t=e.member,i=e.options.getInteger("volume");if(!t.voice.channel)return await e.reply({content:"❌ Вы должны находится в голосовом канале.",ephemeral:!0});if(e.guild.me.voice.channel&&t.voice.channel.id!==e.guild.me.voice.channel.id)return await e.reply({content:"❌ Вы должны находится в том же голосовом канале, что и я.",ephemeral:!0});const r=Util_1.default.lava.get(e.guildId);if(!r)return await e.reply({content:"❌ На этом сервере ничего не играет.",ephemeral:!0});await e.reply(`Новая громкость - \`${i}%\``).then((()=>r.setVolume(i)))};exports.run=run;