import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../types/Command.js";
import { DockerManager } from "../utils/dockerManager.js";

const containerName = process.env.CONTAINER_NAME || "minecraft-bedrock";

export default {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check the Minecraft server status"),
  execute: async (interaction) => {
    await interaction.deferReply();

    try {
      const dockerManager = new DockerManager(containerName);
      const isRunning = await dockerManager.isRunning();

      if (!isRunning) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("🔴 サーバーステータス")
              .setDescription("**停止中**"),
          ],
        });
        return;
      }

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("🟢 サーバーステータス")
            .setDescription("**稼働中**"),
        ],
      });
    } catch (error: any) {
      console.error("Error getting server status:", error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("❌ ステータス取得失敗")
            .setDescription(error.message),
        ],
      });
    }
  },
} satisfies Command;
