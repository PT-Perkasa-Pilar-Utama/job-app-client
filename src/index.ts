import { Client, Events, GatewayIntentBits } from "discord.js";

import env from "../env";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.on(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.channelId == env.CHANNEL_ID) {
    message.reply("okelah");
  }
});

client.login(env.TOKEN);
