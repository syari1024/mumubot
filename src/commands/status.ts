import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../types/Command";
import { DockerManager } from "../utils/dockerManager";

const containerName = process.env.CONTAINER_NAME || "minecraft-bedrock";

function parseOnlinePlayers(logs: string): string[] {
  const joinPattern = /\[.*?\]\s+(.+?)\s+joined\s+the\s+game/gi;
  const leavePattern = /\[.*?\]\s+(.+?)\s+left\s+the\s+game/gi;

  const onlinePlayers = new Set<string>();

  let match;
  while ((match = joinPattern.exec(logs)) !== null) {
    onlinePlayers.add(match[1].trim());
  }

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
      const isRunning = await dockerManager.isRunning();

      if (!isRunning) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("🔴 サーバーステータス")
              .addFields({ name: "ステータス", value: "**停止中**" }),
          ],
        });
        return;
      }

      const logs = await dockerManager.getLogs(500);
      const onlinePlayers = parseOnlinePlayers(logs);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🟢 サーバーステータス")
        .addFields(
          { name: "ステータス", value: "**稼働中**" },
          {
            name: "オンラインプレイヤー",
            value: `**${onlinePlayers.length}**`,
          },
        );

      if (onlinePlayers.length > 0) {
        embed.addFields({
          name: "プレイヤー一覧",
          value: onlinePlayers.map((p) => `• ${p}`).join("\n"),
        });
      } else {
        embed.addFields({
          name: "プレイヤー一覧",
          value: "オンラインプレイヤーなし",
        });
      }

      await interaction.editReply({
        embeds: [embed],
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
