import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
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

      const isRunning = await dockerManager.isRunning();
      if (isRunning) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("Yellow")
              .setTitle("⚠️ サーバー起動")
              .setDescription("サーバーは既に稼働しています。"),
          ],
        });
        return;
      }

      await dockerManager.start();
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ サーバー起動")
            .setDescription("サーバーが起動しました")
            .addFields(
              { name: "サーバーIP", value: "mumu.canyon-mc.com" },
              { name: "ポート番号", value: "19132" },
              { name: "注意", value: "このサーバーはホワイトリスト制です" },
            )
            .setFooter({ text: "Mumu-Server" }),
        ],
      });
    } catch (error: any) {
      console.error("Error starting server:", error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("❌ サーバー起動失敗")
            .setDescription(error.message),
        ],
      });
    }
  },
} satisfies Command;
