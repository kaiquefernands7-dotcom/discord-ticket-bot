const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('limpar')
    .setDescription('Apaga mensagens em massa de um canal.')
    .addIntegerOption(option => 
      option.setName('quantidade')
        .setDescription('Número de mensagens a apagar (1 a 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction) {
    const amount = interaction.options.getInteger('quantidade');
    const channel = interaction.channel;

    try {
      const deleted = await channel.bulkDelete(amount, true);

      const clearEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setDescription(`🧹 Limpeza concluída! Foram apagadas **${deleted.size}** mensagens.`)
        .setTimestamp();

      await interaction.reply({ embeds: [clearEmbed], ephemeral: true });

      // Envia log
      const logChannelId = db.getConfig(interaction.guild.id, 'logChannelId');
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🧹 Canal Limpo')
            .setDescription(`Mensagens limpas por **${interaction.user.tag}** no canal ${channel}.`)
            .addFields(
              { name: 'Solicitado', value: `${amount}`, inline: true },
              { name: 'Apagado', value: `${deleted.size}`, inline: true }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    } catch (error) {
      logger.error('Erro ao limpar mensagens:', error);
      await interaction.reply({ content: 'Houve um erro ao tentar apagar mensagens neste canal. Nota: Mensagens com mais de 14 dias não podem ser apagadas pelo Discord.', ephemeral: true });
    }
  }
};
