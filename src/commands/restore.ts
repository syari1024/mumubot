import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../types/Command.js";
import { BackupManager } from "../utils/backupManager.js";

const containerName = process.env.CONTAINER_NAME || "minecraft-bedrock";
const backupDir = process.env.BACKUP_DIR || "./backups";

export default {
  data: new SlashCommandBuilder()
    .setName("restore")
    .setDescription("Restore the server world from a backup")
    .addStringOption((option) =>
      option
        .setName("backup")
        .setDescription("Backup filename to restore")
        .setRequired(true),
    ),
  execute: async (interaction) => {
    await interaction.deferReply();

    try {
      const backupFilename = interaction.options.getString("backup");

      if (!backupFilename) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("❌ エラー")
              .setDescription("バックアップファイル名が必要です"),
          ],
        });
        return;
      }

      const backupManager = new BackupManager(containerName, backupDir);
      const backups = await backupManager.listBackups();
      const backup = backups.find((b) => b.filename === backupFilename);

      if (!backup) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("❌ バックアップが見つかりません")
              .setDescription(`バックアップ: ${backupFilename}`),
          ],
        });
        return;
      }

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("⏳ 復元中")
            .setDescription(
              `バックアップ **${backupFilename}** を復元しています。少々お待ちください。`,
            ),
        ],
      });

      await backupManager.restoreBackup(backupFilename);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ 復元成功")
            .addFields(
              { name: "ファイル名", value: backupFilename },
              { name: "サイズ", value: backup.size },
            ),
        ],
      });
    } catch (error: any) {
      console.error("Error restoring backup:", error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("❌ 復元失敗")
            .setDescription(error.message),
        ],
      });
    }
  },
} satisfies Command;
