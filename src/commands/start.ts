import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/Command";
import { DockerManager } from "../utils/dockerManager";

const containerName = process.env.CONTAINER_NAME || "minecraft-bedrock";

export default {
  data: new SlashCommandBuilder()
    .setName("start")
    .setDescription("Start the Minecraft server"),
  execute: async (interaction) => {
    await interaction.deferReply();

    try {
      const dockerManager = new DockerManager(containerName);

      // サーバーが既に起動しているか確認
      const isRunning = await dockerManager.isRunning();
      if (isRunning) {
        await interaction.editReply({
          content: "❌ The server is already running.",
        });
        return;
      }

      // サーバーを起動
      await dockerManager.start();
      await interaction.editReply({
        content: "✅ Server started successfully!",
      });
    } catch (error: any) {
      console.error("Error starting server:", error);
      await interaction.editReply({
        content: `❌ Failed to start server: ${error.message}`,
      });
    }
  },
} satisfies Command;
