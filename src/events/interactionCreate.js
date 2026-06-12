const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/db');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 1. Trata Comandos Slash
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        logger.error(`Erro ao executar comando ${interaction.commandName}:`, error);
        const errorReply = { content: 'Ocorreu um erro ao executar este comando!', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorReply);
        } else {
          await interaction.reply(errorReply);
        }
      }
      return;
    }

    // 2. Trata Interações de Componentes (Botões)
    if (interaction.isButton()) {
      const { customId, guild, member, channel, user } = interaction;

      // --- CRIAR TICKET ---
      if (customId === 'abrir_ticket') {
        await interaction.deferReply({ ephemeral: true });

        try {
          // Busca configurações do banco de dados
          const supportRoleId = db.getConfig(guild.id, 'supportRoleId');
          const categoryId = db.getConfig(guild.id, 'ticketCategoryId');

          // Verifica se já existe um ticket aberto para este usuário
          const openTicketChannel = guild.channels.cache.find(c => 
            c.name.startsWith(`ticket-${user.username.toLowerCase()}`) && 
            db.getTicket(c.id)?.status === 'open'
          );

          if (openTicketChannel) {
            return interaction.editReply({ content: `Você já possui um ticket aberto em ${openTicketChannel}.` });
          }

          // Define as permissões padrão para o novo canal de ticket
          const permissionOverwrites = [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory
              ]
            }
          ];

          // Se tiver cargo de suporte configurado, dá permissão
          if (supportRoleId && guild.roles.cache.has(supportRoleId)) {
            permissionOverwrites.push({
              id: supportRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory
              ]
            });
          }

          // Cria o canal
          const ticketChannel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            parent: categoryId && guild.channels.cache.has(categoryId) ? categoryId : null,
            permissionOverwrites,
            reason: `Ticket aberto por ${user.tag}`
          });

          // Registra no DB
          db.createTicket(ticketChannel.id, user.id, guild.id);

          // Envia mensagem de boas-vindas no canal do ticket
          const welcomeEmbed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle(`🎫 Ticket de ${user.username}`)
            .setDescription('Olá! Descreva o seu problema ou dúvida detalhadamente.\nA equipe de suporte foi notificada e irá atendê-lo em breve.')
            .addFields(
              { name: 'Criado por', value: `${user} (${user.tag})`, inline: true },
              { name: 'Status', value: '🟢 Aberto / Aguardando Suporte', inline: true }
            )
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('assumir_ticket')
              .setLabel('Assumir Ticket')
              .setStyle(ButtonStyle.Success)
              .setEmoji('🙋‍♂️'),
            new ButtonBuilder()
              .setCustomId('fechar_ticket')
              .setLabel('Fechar Ticket')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('🔒')
          );

          await ticketChannel.send({
            content: `${user} | <@&${supportRoleId || ''}>`,
            embeds: [welcomeEmbed],
            components: [row]
          });

          return interaction.editReply({ content: `Seu ticket foi criado com sucesso em ${ticketChannel}!` });
        } catch (error) {
          logger.error('Erro ao criar canal de ticket:', error);
          return interaction.editReply({ content: 'Não foi possível criar o seu ticket. Entre em contato com um administrador.' });
        }
      }

      // --- ASSUMIR TICKET ---
      if (customId === 'assumir_ticket') {
        const ticket = db.getTicket(channel.id);
        if (!ticket) {
          return interaction.reply({ content: 'Este canal não é um ticket registrado ou o registro expirou.', ephemeral: true });
        }

        if (ticket.claimedBy) {
          return interaction.reply({ content: `Este ticket já foi assumido por <@${ticket.claimedBy}>.`, ephemeral: true });
        }

        // Verifica se quem está clicando é do suporte
        const supportRoleId = db.getConfig(guild.id, 'supportRoleId');
        if (supportRoleId && !member.roles.cache.has(supportRoleId) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: 'Apenas a equipe de suporte pode assumir este ticket!', ephemeral: true });
        }

        await interaction.deferUpdate();

        try {
          db.updateTicket(channel.id, 'claimedBy', user.id);

          // Atualiza as permissões do canal para trancar para outros do suporte se necessário, ou apenas avisar
          // Vamos apenas atualizar a mensagem com o embed dizendo quem assumiu
          const messages = await channel.messages.fetch({ limit: 10 });
          const firstMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);

          if (firstMessage) {
            const oldEmbed = firstMessage.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed)
              .setFields(
                { name: 'Criado por', value: `<@${ticket.userId}>`, inline: true },
                { name: 'Assumido por', value: `${user} (${user.tag})`, inline: true }
              )
              .setColor('#2ecc71');

            const updatedRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('assumir_ticket')
                .setLabel('Assumido')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
                .setEmoji('✅'),
              new ButtonBuilder()
                .setCustomId('fechar_ticket')
                .setLabel('Fechar Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
            );

            await firstMessage.edit({ embeds: [updatedEmbed], components: [updatedRow] });
          }

          await channel.send({
            content: `🙋‍♂️ **O suporte ${user} assumiu o atendimento deste ticket.**`
          });
        } catch (error) {
          logger.error('Erro ao assumir ticket:', error);
        }
      }

      // --- FECHAR TICKET ---
      if (customId === 'fechar_ticket') {
        const ticket = db.getTicket(channel.id);
        if (!ticket) {
          return interaction.reply({ content: 'Este canal não é um ticket registrado.', ephemeral: true });
        }

        // Pergunta confirmação
        const confirmEmbed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🔒 Confirmar Fechamento')
          .setDescription('Você tem certeza de que deseja fechar este ticket? O canal será arquivado e excluído.');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirmar_fechamento')
            .setLabel('Confirmar')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancelar_fechamento')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [confirmEmbed], components: [row] });
      }

      // --- CANCELAR FECHAMENTO ---
      if (customId === 'cancelar_fechamento') {
        await interaction.message.delete().catch(() => {});
      }

      // --- CONFIRMAR FECHAMENTO ---
      if (customId === 'confirmar_fechamento') {
        const ticket = db.getTicket(channel.id);
        if (!ticket) {
          return interaction.reply({ content: 'Este canal não é um ticket registrado.', ephemeral: true });
        }

        await interaction.reply({ content: '📁 Transcrevendo e fechando ticket... O canal será excluído em 5 segundos.' });

        try {
          db.updateTicket(channel.id, 'status', 'closed');

          // Busca as últimas 100 mensagens para transcrição
          const fetchedMessages = await channel.messages.fetch({ limit: 100 });
          const sortedMessages = [...fetchedMessages.values()].reverse();

          let transcriptText = `=== TRANSCRIÇÃO DO TICKET: ${channel.name} ===\n`;
          transcriptText += `Criado por: ID ${ticket.userId}\n`;
          transcriptText += `Assumido por: ${ticket.claimedBy ? `ID ${ticket.claimedBy}` : 'Não assumido'}\n`;
          transcriptText += `Data de Fechamento: ${new Date().toLocaleString('pt-BR')}\n`;
          transcriptText += `==========================================\n\n`;

          for (const msg of sortedMessages) {
            const time = msg.createdAt.toLocaleString('pt-BR');
            transcriptText += `[${time}] ${msg.author.tag} (${msg.author.id}): ${msg.content}\n`;
            if (msg.attachments.size > 0) {
              msg.attachments.forEach(attachment => {
                transcriptText += `   [Anexo]: ${attachment.url}\n`;
              });
            }
          }

          // Cria o arquivo de transcrição temporário
          const tempDir = path.join(__dirname, '../../temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
          }
          const transcriptFileName = `transcript-${channel.name}.txt`;
          const transcriptFilePath = path.join(tempDir, transcriptFileName);
          fs.writeFileSync(transcriptFilePath, transcriptText, 'utf8');

          // Envia transcrição para o canal de logs
          const logChannelId = db.getConfig(guild.id, 'logChannelId');
          if (logChannelId) {
            const logChannel = guild.channels.cache.get(logChannelId);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('📁 Ticket Fechado (Transcrição)')
                .addFields(
                  { name: 'Canal', value: channel.name, inline: true },
                  { name: 'Criado por', value: `<@${ticket.userId}>`, inline: true },
                  { name: 'Atendido por', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Sem atendimento', inline: true }
                )
                .setTimestamp();

              await logChannel.send({
                embeds: [logEmbed],
                files: [transcriptFilePath]
              });
            }
          }

          // Limpa o arquivo temporário
          setTimeout(() => {
            try {
              if (fs.existsSync(transcriptFilePath)) {
                fs.unlinkSync(transcriptFilePath);
              }
            } catch (e) {
              logger.warn(`Erro ao excluir arquivo de transcrição temporário: ${e.message}`);
            }
          }, 10000);

          // Remove do banco e deleta o canal após 5 segundos
          db.deleteTicket(channel.id);
          setTimeout(() => {
            channel.delete().catch(err => logger.error('Erro ao deletar canal de ticket:', err));
          }, 5000);

        } catch (error) {
          logger.error('Erro ao fechar ticket:', error);
          await interaction.followUp({ content: 'Houve um erro ao fechar o ticket, mas a exclusão prosseguirá.', ephemeral: true });
          setTimeout(() => {
            channel.delete().catch(() => {});
          }, 5000);
        }
      }
    }
  }
};
