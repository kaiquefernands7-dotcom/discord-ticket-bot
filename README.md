# 🎫 Bot de Ticket e Moderação do Discord

Um bot do Discord profissional e completo desenvolvido em JavaScript com **Discord.js (v14)**, projetado para gerenciar atendimentos via sistema de tickets (usando botões interativos e transcrição automática) e fornecer comandos essenciais de moderação rápida.

---

## ✨ Funcionalidades

### 🎫 Sistema de Tickets (Premium)
* **Painel de Setup (`/ticket-setup`)**: Envia um painel com botão integrado para abertura de tickets.
* **Canais Privados**: Ao clicar no botão, cria-se um canal visível apenas para o usuário e a equipe de suporte.
* **Sistema de Reivindicação (`Assumir Ticket`)**: Membros da equipe de suporte podem clicar para assumir o atendimento.
* **Transcrição e Fechamento (`Fechar Ticket`)**: Ao fechar o ticket, o bot gera uma transcrição completa em formato de texto (`.txt`) com o histórico de até 100 mensagens (com timestamps, autores e links de anexos) e envia para o canal de logs configurado antes de excluir o canal do ticket.

### 🔨 Comandos de Moderação (Slash Commands `/`)
* `/banir [usuario] (motivo)`: Bane um membro do servidor.
* `/kickar [usuario] (motivo)`: Expulsa um membro do servidor.
* `/mutar [usuario] (motivo)`: Aplica/remove o cargo "Mutado" de um membro. O cargo é criado e configurado automaticamente nos canais se não existir.
* `/castigo [usuario] [duracao_minutos] (motivo)`: Aplica um timeout nativo do Discord ao membro.
* `/limpar [quantidade]`: Apaga de 1 a 100 mensagens em massa em um canal.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 16.9.0 ou superior)
* Uma aplicação de bot criada no [Discord Developer Portal](https://discord.com/developers/applications)

### Instalação

1. Clone ou extraia os arquivos do bot em sua máquina.
2. Copie o arquivo `.env.example` e renomeie para `.env`:
   ```bash
   cp .env.example .env
   ```
3. Preencha as configurações necessárias no arquivo `.env`:
   * `DISCORD_TOKEN`: Token do seu bot.
   * `CLIENT_ID`: ID da aplicação do seu bot.
   * `GUILD_ID`: ID do servidor onde o bot vai rodar (usado para registrar os comandos slash instantaneamente).
   * `SUPPORT_ROLE_ID`: ID do cargo de suporte que terá acesso aos tickets.
   * `TICKET_CATEGORY_ID`: ID da categoria sob a qual os canais de ticket serão criados.
   * `LOG_CHANNEL_ID`: ID do canal onde os logs de moderação e as transcrições serão salvos.

4. Instale as dependências do projeto:
   ```bash
   npm install
   ```

5. Inicie o bot:
   ```bash
   npm start
   ```

---

## 📁 Estrutura de Pastas

```text
discord-ticket-bot/
├── src/
│   ├── commands/
│   │   ├── moderacao/
│   │   │   ├── banir.js
│   │   │   ├── castigo.js
│   │   │   ├── kickar.js
│   │   │   ├── limpar.js
│   │   │   └── mutar.js
│   │   └── ticket/
│   │       └── ticket-setup.js
│   ├── events/
│   │   ├── ready.js
│   │   └── interactionCreate.js
│   ├── utils/
│   │   ├── db.js
│   │   └── logger.js
│   └── index.js
├── database.json
├── package.json
└── README.md
```

---

## 🛠️ Tecnologias Utilizadas
* **Node.js**
* **Discord.js (v14)**
* **Dotenv**
* **Local JSON Database** (Banco de dados leve e eficiente em arquivo plano)
