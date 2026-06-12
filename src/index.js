require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Verifica a existência do token no .env
if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN.trim() === "" || process.env.DISCORD_TOKEN === "COLOQUE_SEU_TOKEN_AQUI") {
  logger.error("ERRO CRÍTICO: O token do Discord não foi configurado no arquivo .env");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

client.commands = new Collection();

// Carrega os eventos
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

// Prevenção de crashes globais (mantém o bot online mesmo em caso de erro não tratado)
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Rejeição de promessa não tratada:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Exceção não capturada lançada:', error);
});

client.login(process.env.DISCORD_TOKEN)
  .then(() => logger.success("Login efetuado com sucesso no Discord."))
  .catch(err => logger.error("Erro ao autenticar com o token do Discord:", err));
