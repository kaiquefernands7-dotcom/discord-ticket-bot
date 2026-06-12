const colors = {
  reset: "\x1b[0m",
  fgRed: "\x1b[31m",
  fgGreen: "\x1b[32m",
  fgYellow: "\x1b[33m",
  fgBlue: "\x1b[34m",
  fgCyan: "\x1b[36m"
};

const logger = {
  info(message) {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`${colors.fgBlue}[INFO] [${timestamp}] ${message}${colors.reset}`);
  },
  success(message) {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`${colors.fgGreen}[SUCESSO] [${timestamp}] ${message}${colors.reset}`);
  },
  warn(message) {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`${colors.fgYellow}[AVISO] [${timestamp}] ${message}${colors.reset}`);
  },
  error(message, error = '') {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.error(`${colors.fgRed}[ERRO] [${timestamp}] ${message}${colors.reset}`, error);
  }
};

module.exports = logger;
