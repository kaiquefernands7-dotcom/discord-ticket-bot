const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Configura o painel de tickets no canal atual.')
    .addRoleOption(option => 
      option.setName('cargo-suporte')
        .setDescription('Cargo que terá acesso aos tickets e será marcado.')
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('canal-logs')
        .setDescription('Canal onde serão enviadas as transcrições dos tickets fechados.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('categoria')
        .setDescription('Categoria onde os canais de ticket serão criados.')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false))
    .addStringOption(option => 
      option.setName('titulo')
        .setDescription('Título personalizado do painel')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('descricao')
        .setDescription('Descrição personalizada do painel')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    const supportRole = interaction.options.getRole('cargo-suporte');
    const logChannel = interaction.options.getChannel('canal-logs');
    const category = interaction.options.getChannel('categoria');
    const title = interaction.options.getString('titulo') || '🎟️ Central de Atendimento';
    const description = interaction.options.getString('descricao') || 'Precisa de suporte ou tem alguma dúvida?\nClique no botão abaixo para iniciar um atendimento privado com a nossa equipe.';

    const guildId = interaction.guild.id;

    // Salva as configurações no DB JSON
    db.setConfig(guildId, 'supportRoleId', supportRole.id);
    db.setConfig(guildId, 'logChannelId', logChannel.id);
    if (category) {
      db.setConfig(guildId, 'ticketCategoryId', category.id);
    } else {
      db.setConfig(guildId, 'ticketCategoryId', null);
    }

    const panelEmbed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: `${interaction.guild.name} • Sistema de Suporte`, iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('abrir_ticket')
        .setLabel('Abrir Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✉️')
    );

    // Envia o painel no canal atual
    await interaction.channel.send({
      embeds: [panelEmbed],
      components: [row]
    });

    await interaction.reply({
      content: '✅ Painel de tickets configurado e enviado com sucesso neste canal!',
      ephemeral: true
    });
  }
};
