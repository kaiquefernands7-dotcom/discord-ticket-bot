const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const dbPath = path.join(__dirname, '../../database.json');

const defaultDb = {
  configs: {},
  tickets: {}
};

function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      writeDb(defaultDb);
      return defaultDb;
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Erro ao ler banco de dados JSON, reiniciando com valores padrão:', error);
    return defaultDb;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    logger.error('Erro ao salvar banco de dados JSON:', error);
  }
}

const db = {
  // Configs
  getConfig(guildId, key) {
    const data = readDb();
    if (!data.configs[guildId]) return null;
    return data.configs[guildId][key];
  },
  
  setConfig(guildId, key, value) {
    const data = readDb();
    if (!data.configs[guildId]) data.configs[guildId] = {};
    data.configs[guildId][key] = value;
    writeDb(data);
  },

  getAllConfigs(guildId) {
    const data = readDb();
    return data.configs[guildId] || {};
  },

  // Tickets
  createTicket(channelId, userId, guildId) {
    const data = readDb();
    data.tickets[channelId] = {
      guildId,
      userId,
      status: 'open',
      claimedBy: null,
      createdAt: Date.now()
    };
    writeDb(data);
  },

  getTicket(channelId) {
    const data = readDb();
    return data.tickets[channelId];
  },

  updateTicket(channelId, key, value) {
    const data = readDb();
    if (data.tickets[channelId]) {
      data.tickets[channelId][key] = value;
      writeDb(data);
    }
  },

  deleteTicket(channelId) {
    const data = readDb();
    if (data.tickets[channelId]) {
      delete data.tickets[channelId];
      writeDb(data);
    }
  }
};

module.exports = db;
