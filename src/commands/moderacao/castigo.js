const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('castigo')
    .setDescription('Aplica um castigo (Timeout nativo do Discord) em um membro.')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('O usuário a ser castigado')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('duracao')
        .setDescription('Duração do castigo em minutos')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('motivo')
        .setDescription('O motivo do castigo')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction) {
    const userToTimeout = interaction.options.getUser('usuario');
    const minutes = interaction.options.getInteger('duracao');
    const reason = interaction.options.getString('motivo') || 'Nenhum motivo fornecido';
    const guild = interaction.guild;
    const memberToTimeout = await guild.members.fetch(userToTimeout.id).catch(() => null);

    if (!memberToTimeout) {
      return interaction.reply({ content: 'Usuário não encontrado no servidor.', ephemeral: true });
    }

    if (minutes <= 0) {
      return interaction.reply({ content: 'A duração deve ser maior que 0 minutos.', ephemeral: true });
    }

    const durationMs = minutes * 60 * 1000;

    try {
      await memberToTimeout.timeout(durationMs, `${interaction.user.tag}: ${reason}`);

      const timeoutEmbed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('⏳ Castigo Aplicado')
        .setDescription(`O usuário **${userToTimeout.tag}** foi colocado em castigo (timeout) com sucesso!`)
        .addFields(
          { name: 'Moderador', value: `${interaction.user}`, inline: true },
          { name: 'Duração', value: `${minutes} minutos`, inline: true },
          { name: 'Motivo', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [timeoutEmbed] });

      // Envia log
      const logChannelId = db.getConfig(guild.id, 'logChannelId');
      if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) await logChannel.send({ embeds: [timeoutEmbed] });
      }
    } catch (error) {
      logger.error('Erro ao castigar usuário:', error);
      await interaction.reply({ content: 'Não consegui aplicar o castigo a este usuário. Verifique minhas permissões e cargos.', ephemeral: true });
    }
  }
};
