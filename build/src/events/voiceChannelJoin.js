"use strict";var __importDefault=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.run=void 0;const Util_1=__importDefault(require("../util/Util"));async function run(t,e){const i=await Util_1.default.database.settings(t.guild.id),{voices:a}=i.get();if(!a.enabled||a.lobby!==e.id)return;const n=await Util_1.default.database.guild(t.guild.id);await t.guild.channels.create("Комната "+t.user.tag,{type:"GUILD_VOICE",parent:e.parentId,permissionOverwrites:[{id:t.user.id,allow:["MANAGE_CHANNELS","PRIORITY_SPEAKER","STREAM","CONNECT","SPEAK"]}]}).then((async e=>await t.voice.setChannel(e.id).then((()=>n.setOnObject("voices",e.id,t.user.id))).catch((()=>e.delete().catch((()=>null)))))).catch((()=>null))}exports.run=run;