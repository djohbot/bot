"use strict";var __importDefault=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.run=void 0;const Util_1=__importDefault(require("../util/Util"));async function run(t,e){const i=await Util_1.default.database.guild(t.guild.id);i.get().voices[e.id]===t.user.id&&(await e.delete().catch((()=>null)),i.removeFromObject("voices",e.id))}exports.run=run;