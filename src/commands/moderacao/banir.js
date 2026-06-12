const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banir')
    .setDescription('Bane um membro do servidor.')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('O usuário a ser banido')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('motivo')
        .setDescription('O motivo do banimento')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  async execute(interaction) {
    const userToBan = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo') || 'Nenhum motivo fornecido';
    const memberToBan = await interaction.guild.members.fetch(userToBan.id).catch(() => null);

    if (!memberToBan) {
      return interaction.reply({ content: 'Usuário não encontrado no servidor.', ephemeral: true });
    }

    if (!memberToBan.bannable) {
      return interaction.reply({ content: 'Eu não posso banir este usuário. Ele pode ter um cargo mais alto que o meu.', ephemeral: true });
    }

    await memberToBan.ban({ reason: `${interaction.user.tag}: ${reason}` });

    const banEmbed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('🔨 Usuário Banido')
      .setDescription(`O usuário **${userToBan.tag}** foi banido com sucesso!`)
      .addFields(
        { name: 'Moderador', value: `${interaction.user}`, inline: true },
        { name: 'Motivo', value: reason, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [banEmbed] });

    // Envia log para o canal de logs se configurado
    const logChannelId = db.getConfig(interaction.guild.id, 'logChannelId');
    if (logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        await logChannel.send({ embeds: [banEmbed] });
      }
    }
  }
};
