import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/Command";
import { DockerManager } from "../utils/dockerManager";

const containerName = process.env.CONTAINER_NAME || "minecraft-bedrock";

/**
 * ログからオンラインプレイヤーを検出
 */
function parseOnlinePlayers(logs: string): string[] {
  // ログからプレイヤー参加・退出メッセージを抽出
  // 例: "[INFO] Player1 joined the game"
  // 例: "[INFO] Player1 left the game"

  const joinPattern = /\[.*?\]\s+(.+?)\s+joined\s+the\s+game/gi;
  const leavePattern = /\[.*?\]\s+(.+?)\s+left\s+the\s+game/gi;

  const onlinePlayers = new Set<string>();

  // 参加ログから参加者を抽出
  let match;
  while ((match = joinPattern.exec(logs)) !== null) {
    onlinePlayers.add(match[1].trim());
  }

  // 退出ログから退出者を削除
  while ((match = leavePattern.exec(logs)) !== null) {
    onlinePlayers.delete(match[1].trim());
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

      // サーバーの稼働状況を確認
      const isRunning = await dockerManager.isRunning();

      if (!isRunning) {
        await interaction.editReply({
          content: "🔴 **Server Status**\nStatus: **Stopped**",
        });
        return;
      }

      // ログからオンラインプレイヤーを取得
      const logs = await dockerManager.getLogs(500);
      const onlinePlayers = parseOnlinePlayers(logs);

      const statusMessage = `
🟢 **Server Status**
Status: **Running**
Online Players: **${onlinePlayers.length}**
${
  onlinePlayers.length > 0
    ? `\nPlayers:\n${onlinePlayers.map((p) => `  • ${p}`).join("\n")}`
    : "No players online"
}
      `.trim();

      await interaction.editReply({
        content: statusMessage,
      });
    } catch (error: any) {
      console.error("Error getting server status:", error);
      await interaction.editReply({
        content: `❌ Failed to get server status: ${error.message}`,
      });
    }
  },
} satisfies Command;
