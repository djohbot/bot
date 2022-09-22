import { SlashCommandBuilder } from "discord.js";

export const options = new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user.")
    .setDefaultMemberPermissions(8)
    .setDMPermission(false)
    .addUserOption((o) => o.setName("user").setDescription("User.").setRequired(true))
    .toJSON();

import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import Util from "../util/Util";

export const run = async (interaction: ChatInputCommandInteraction) => {
    const gdb = await Util.database.guild(interaction.guild.id);
    const _ = Util.i18n.getLocale(gdb.get().locale);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
        return interaction.reply({ content: _("commands.unban.noperm"), ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser("user");

    if (!(await interaction.guild.bans.fetch(user).catch(() => 0)))
        return interaction.editReply(_("commands.unban.noban"))
            .then(() => gdb.removeFromObject("bans", user.id));

    return interaction.guild.bans.remove(user.id).then(() => {
        gdb.removeFromObject("bans", user.id);
        return interaction.editReply(_("commands.unban.done"));
    });
};