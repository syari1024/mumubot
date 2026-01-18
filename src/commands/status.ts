import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../types/Command";
import { DockerManager } from "../utils/dockerManager";

const containerName = process.env.CONTAINER_NAME || "minecraft-bedrock";

function parseOnlinePlayers(logs: string): string[] {
  // Minecraft Bedrock のログフォーマット対応
  // [YYYY-MM-DD HH:MM:SS:mmm INFO] Player connected: <name>, xuid: <xuid>
  // [YYYY-MM-DD HH:MM:SS:mmm INFO] Player disconnected: <name>, xuid: <xuid>, pfid: <pfid>

  const joinPattern = /Player connected:\s+(\w+),\s+xuid:/gi;
  const leavePattern = /Player disconnected:\s+(\w+),\s+xuid:/gi;

  const onlinePlayers = new Set<string>();

  // 接続ログをパース
  let match;
  while ((match = joinPattern.exec(logs)) !== null) {
    const player = match[1].trim();
    if (player && player.length > 0) {
      onlinePlayers.add(player);
    }
  }

  // 切断ログをパース
  while ((match = leavePattern.exec(logs)) !== null) {
    const player = match[1].trim();
    if (player && player.length > 0) {
      onlinePlayers.delete(player);
    }
  }

  return Array.from(onlinePlayers);
}

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
