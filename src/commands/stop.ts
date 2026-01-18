import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/Command";
import { DockerManager } from "../utils/dockerManager";

const containerName = process.env.CONTAINER_NAME || "minecraft-bedrock";

export default {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop the Minecraft server"),
  execute: async (interaction) => {
    await interaction.deferReply();

    try {
      const dockerManager = new DockerManager(containerName);

      // サーバーが起動しているか確認
      const isRunning = await dockerManager.isRunning();
      if (!isRunning) {
        await interaction.editReply({
          content: "❌ The server is not running.",
        });
        return;
      }

      // サーバーを停止（graceful shutdown）
      await dockerManager.stop();
      await interaction.editReply({
        content: "✅ Server stopped successfully!",
      });
    } catch (error: any) {
      console.error("Error stopping server:", error);
      await interaction.editReply({
        content: `❌ Failed to stop server: ${error.message}`,
      });
    }
  },
} satisfies Command;
