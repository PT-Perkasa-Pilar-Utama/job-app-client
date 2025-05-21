import { Client, Events, GatewayIntentBits } from "discord.js";

import env from "../env";
import { MCPClient } from "./mcp-client";
export const session = {
  user: "",
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const mcpClient = new MCPClient();

client.on(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channelId != env.CHANNEL_ID) return;

  const msg = message.content;
  const authorId = message.author.id;

  try {
    if (!session.user) {
      if (!msg.startsWith("start")) {
        console.log("msg", msg);
        return message.reply(
          "Silakan mulai sesi job-app-client MCP dengan command `start`"
        );
      }

      session.user = authorId;
      return message.reply("Berhasil memulai sesi sesi job-app-client MCP");
    }

    if (msg.startsWith("start")) {
      return message.reply(
        "Sudah terdapat sesi, silakan hentikan sesi saat ini dengan perintah `stop`"
      );
    }

    if (msg.startsWith("stop")) {
      await mcpClient.cleanup();
      session.user = "";
      return message.reply("Sesi job-app-client MCP telah dihentikan");
    }

    const msgReply = await message.channel.send("Memproses...");
    if (!mcpClient.isInited) {
      await mcpClient.connectToServer();
    }

    mcpClient.processQuery(msg, msgReply);
  } catch (error) {
    message.reply("Mohon maaf, terjadi kesalahan! Silakan hubungi admin");
    console.log(error);
  }
});

client.login(env.TOKEN);
