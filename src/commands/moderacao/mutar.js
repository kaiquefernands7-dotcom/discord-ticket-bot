const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mutar')
    .setDescription('Muta um membro no servidor aplicando o cargo de Mutado.')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('O usuário a ser mutado')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('motivo')
        .setDescription('O motivo do mute')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction) {
    const userToMute = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo') || 'Nenhum motivo fornecido';
    const guild = interaction.guild;
    const memberToMute = await guild.members.fetch(userToMute.id).catch(() => null);

    if (!memberToMute) {
      return interaction.reply({ content: 'Usuário não encontrado no servidor.', ephemeral: true });
    }

    // Busca ou cria o cargo "Mutado"
    let muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'mutado');
    if (!muteRole) {
      try {
        await interaction.reply({ content: 'Carregando... Criando o cargo "Mutado" pois ele não existe no servidor.', ephemeral: true });
        
        muteRole = await guild.roles.create({
          name: 'Mutado',
          color: '#7f8c8d',
          reason: 'Setup automático do comando /mutar'
        });

        // Configura permissão de não enviar mensagem em todos os canais de texto
        guild.channels.cache.forEach(channel => {
          if (channel.isTextBased()) {
            channel.permissionOverwrites.create(muteRole, {
              SendMessages: false,
              AddReactions: false,
              CreatePublicThreads: false,
              CreatePrivateThreads: false
            }).catch(e => logger.warn(`Não foi possível definir permissões no canal ${channel.name}: ${e.message}`));
          }
        });
      } catch (error) {
        logger.error('Erro ao criar cargo Mutado:', error);
        return interaction.editReply({ content: 'Houve um erro ao criar o cargo "Mutado". Verifique as minhas permissões.' });
      }
    }

    if (memberToMute.roles.cache.has(muteRole.id)) {
      // Se já estiver mutado, vamos desmutar!
      await memberToMute.roles.remove(muteRole.id, `Desmutado por ${interaction.user.tag}`);
      const unmuteEmbed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🔊 Usuário Desmutado')
        .setDescription(`O usuário **${userToMute.tag}** foi desmutado com sucesso!`)
        .addFields({ name: 'Moderador', value: `${interaction.user}`, inline: true })
        .setTimestamp();

      const replyContent = { embeds: [unmuteEmbed] };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(replyContent);
      } else {
        await interaction.reply(replyContent);
      }

      // Envia log
      const logChannelId = db.getConfig(guild.id, 'logChannelId');
      if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) await logChannel.send({ embeds: [unmuteEmbed] });
      }
      return;
    }

    // Aplica o mute
    try {
      await memberToMute.roles.add(muteRole.id, `${interaction.user.tag}: ${reason}`);
      
      const muteEmbed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🔇 Usuário Mutado')
        .setDescription(`O usuário **${userToMute.tag}** foi mutado com sucesso!`)
        .addFields(
          { name: 'Moderador', value: `${interaction.user}`, inline: true },
          { name: 'Motivo', value: reason, inline: true }
        )
        .setTimestamp();

      const replyContent = { embeds: [muteEmbed] };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(replyContent);
      } else {
        await interaction.reply(replyContent);
      }

      // Envia log
      const logChannelId = db.getConfig(guild.id, 'logChannelId');
      if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) await logChannel.send({ embeds: [muteEmbed] });
      }
    } catch (error) {
      logger.error('Erro ao mutar usuário:', error);
      const replyContent = { content: 'Não consegui mutar este usuário. Verifique minhas permissões e cargos.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(replyContent);
      } else {
        await interaction.reply(replyContent);
      }
    }
  }
};
