const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Bot conectado como ${client.user.tag}!`);

    // Carrega os comandos slash na coleção do client
    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');
    
    const loadCommands = (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.lstatSync(filePath);
        if (stat.isDirectory()) {
          loadCommands(filePath);
        } else if (file.endsWith('.js')) {
          try {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
              client.commands.set(command.data.name, command);
              commands.push(command.data.toJSON());
            } else {
              logger.warn(`O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
            }
          } catch (error) {
            logger.error(`Erro ao carregar o comando ${filePath}:`, error);
          }
        }
      }
    };

    loadCommands(commandsPath);

    // Registra os comandos com a API do Discord
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      logger.info(`Iniciando atualização de ${commands.length} comandos Slash (/).`);

      const guildId = process.env.GUILD_ID;
      const clientId = process.env.CLIENT_ID || client.user.id;

      if (guildId && guildId.trim() !== "" && guildId !== "COLOQUE_O_ID_DO_SEU_SERVIDOR_AQUI") {
        logger.info(`Registrando comandos para o servidor de testes: ${guildId}`);
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands }
        );
      } else {
        logger.info(`Registrando comandos globalmente.`);
        await rest.put(
          Routes.applicationCommands(clientId),
          { body: commands }
        );
      }

      logger.success('Comandos Slash (/) registrados com sucesso!');
    } catch (error) {
      logger.error('Erro ao registrar os comandos slash:', error);
    }
  }
};
