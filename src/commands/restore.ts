import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/Command";
import { BackupManager } from "../utils/backupManager";

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
          content: "❌ Backup filename is required",
        });
        return;
      }

      const backupManager = new BackupManager(containerName, backupDir);

      // バックアップファイルが存在するか確認
      const backups = await backupManager.listBackups();
      const backup = backups.find((b) => b.filename === backupFilename);

      if (!backup) {
        await interaction.editReply({
          content: `❌ Backup not found: ${backupFilename}`,
        });
        return;
      }

      await interaction.editReply({
        content: `⏳ Restoring backup **${backupFilename}**... This may take a while.`,
      });

      await backupManager.restoreBackup(backupFilename);

      await interaction.editReply({
        content: `✅ Backup restored successfully!\n\n**Filename**: ${backupFilename}\n**Size**: ${backup.size}`,
      });
    } catch (error: any) {
      console.error("Error restoring backup:", error);
      await interaction.editReply({
        content: `❌ Failed to restore backup: ${error.message}`,
      });
    }
  },
} satisfies Command;
