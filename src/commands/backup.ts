import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../types/Command.js";
import { BackupManager } from "../utils/backupManager.js";
import { DockerManager } from "../utils/dockerManager.js";

const containerName = process.env.CONTAINER_NAME || "minecraft-bedrock";
const backupDir = process.env.BACKUP_DIR || "./backups";

export default {
  data: new SlashCommandBuilder()
    .setName("backup")
    .setDescription("Create a backup of the server world"),
  execute: async (interaction) => {
    await interaction.deferReply();

    try {
      const dockerManager = new DockerManager(containerName);

      // サーバーが起動しているか確認
      const isRunning = await dockerManager.isRunning();
      if (!isRunning) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("❌ バックアップ作成失敗")
              .setDescription(
                "サーバーが起動していません。サーバーを起動してからバックアップを作成してください。",
              ),
          ],
        });
        return;
      }

      const backupManager = new BackupManager(containerName, backupDir);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("⏳ バックアップ作成中")
            .setDescription(
              "バックアップを作成しています。少々お待ちください。",
            ),
        ],
      });

      const backup = await backupManager.createBackup();

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ バックアップ作成成功")
            .addFields(
              { name: "ファイル名", value: backup.filename },
              { name: "サイズ", value: backup.size },
            ),
        ],
      });
    } catch (error: any) {
      console.error("Error creating backup:", error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("❌ バックアップ作成失敗")
            .setDescription(error.message),
        ],
      });
    }
  },
} satisfies Command;
