import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../types/Command.js";
import { DockerManager } from "../utils/dockerManager.js";

const containerName = process.env.CONTAINER_NAME || "minecraft-bedrock";

export default {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop the Minecraft server"),
  execute: async (interaction) => {
    await interaction.deferReply();

    try {
      const dockerManager = new DockerManager(containerName);

      const isRunning = await dockerManager.isRunning();
      if (!isRunning) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("Yellow")
              .setTitle("⚠️ サーバー停止")
              .setDescription("サーバーは既に停止しています。"),
          ],
        });
        return;
      }

      await dockerManager.stop();
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("🛑 サーバー停止")
            .setDescription("サーバーが無事に停止しました")
            .setFooter({ text: "Mumu-Server" }),
        ],
      });
    } catch (error: any) {
      console.error("Error stopping server:", error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("❌ サーバー停止失敗")
            .setDescription(error.message),
        ],
      });
    }
  },
} satisfies Command;
