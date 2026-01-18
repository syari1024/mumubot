import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/Command";
import { BackupManager } from "../utils/backupManager";

const containerName = process.env.CONTAINER_NAME || "minecraft-bedrock";
const backupDir = process.env.BACKUP_DIR || "./backups";

export default {
  data: new SlashCommandBuilder()
    .setName("backup")
    .setDescription("Create a backup of the server world"),
  execute: async (interaction) => {
    await interaction.deferReply();

    try {
      const backupManager = new BackupManager(containerName, backupDir);

      await interaction.editReply({
        content: "⏳ Creating backup... This may take a while.",
      });

      const backup = await backupManager.createBackup();

      await interaction.editReply({
        content: `✅ Backup created successfully!\n\n**Filename**: ${backup.filename}\n**Size**: ${backup.size}`,
      });
    } catch (error: any) {
      console.error("Error creating backup:", error);
      await interaction.editReply({
        content: `❌ Failed to create backup: ${error.message}`,
      });
    }
  },
} satisfies Command;
