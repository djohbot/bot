import { SlashCommandBuilder } from "@discordjs/builders";

export const options = new SlashCommandBuilder()
    .setName("eval")
    .setDescription("Evaluate JavaScript.")
    .addStringOption((o) => o.setName("script").setDescription("Script that'd be ran.").setRequired(true))
    .toJSON();
export const permission = 4;

import { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";

export const run = async (interaction: CommandInteraction): Promise<any> => {
    await interaction.deferReply();

    try {
        let evaled = await eval(interaction.options.getString("script"));
        if (typeof evaled != "string") evaled = require("util").inspect(evaled);

        if (evaled.length >= 2000) return await interaction.editReply("✅");

        return await interaction.editReply({
            content: `\`\`\`js\n${evaled}\n\`\`\``,
            components: [
                new MessageActionRow().setComponents([
                    new MessageButton().setCustomId("reply:delete").setStyle("DANGER").setEmoji("🗑")
                ])]
        });
    } catch (e) {
        let err;
        if (typeof e == "string") err = e.replace(/`/g, "`" + String.fromCharCode(8203));
        else err = e;

        return await interaction.editReply({
            content: `\`\`\`fix\n${err}\n\`\`\``
        });
    };
};