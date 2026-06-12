const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kickar')
    .setDescription('Expulsa (kick) um membro do servidor.')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('O usuário a ser expulso')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('motivo')
        .setDescription('O motivo da expulsão')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  
  async execute(interaction) {
    const userToKick = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo') || 'Nenhum motivo fornecido';
    const memberToKick = await interaction.guild.members.fetch(userToKick.id).catch(() => null);

    if (!memberToKick) {
      return interaction.reply({ content: 'Usuário não encontrado no servidor.', ephemeral: true });
    }

    if (!memberToKick.kickable) {
      return interaction.reply({ content: 'Eu não posso expulsar este usuário. Ele pode ter um cargo mais alto que o meu.', ephemeral: true });
    }

    await memberToKick.kick(`${interaction.user.tag}: ${reason}`);

    const kickEmbed = new EmbedBuilder()
      .setColor('#f39c12')
      .setTitle('🚪 Usuário Expulso')
      .setDescription(`O usuário **${userToKick.tag}** foi expulso do servidor!`)
      .addFields(
        { name: 'Moderador', value: `${interaction.user}`, inline: true },
        { name: 'Motivo', value: reason, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [kickEmbed] });

    // Envia log
    const logChannelId = db.getConfig(interaction.guild.id, 'logChannelId');
    if (logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        await logChannel.send({ embeds: [kickEmbed] });
      }
    }
  }
};
