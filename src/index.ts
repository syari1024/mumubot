import {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";
import dotenv from "dotenv";
import { loadCommands } from "./utils/commandLoader.js";
import { Command } from "./types/Command.js";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

let commands: Collection<string, Command>;

client.once("ready", async () => {
  console.log(`✅ ボットがログインしました: ${client.user?.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "このコマンドの実行中にエラーが発生しました",
      ephemeral: true,
    });
  }
});

(async () => {
  commands = await loadCommands();

  const commandsData = Array.from(commands.values()).map((cmd: any) =>
    cmd.data.toJSON()
  );

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

  try {
    console.log("スラッシュコマンドを登録中...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.GUILD_ID!
      ),
      { body: commandsData }
    );
    console.log("✅ スラッシュコマンドを登録しました");
  } catch (error) {
    console.error("コマンド登録エラー:", error);
  }

  client.login(process.env.DISCORD_TOKEN);
})();
