import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/Command";
import { WhitelistManager } from "../utils/whitelistManager";
import { DockerManager } from "../utils/dockerManager";

const containerName = process.env.CONTAINER_NAME || "minecraft-bedrock";
const allowlistPath = process.env.ALLOWLIST_PATH || "./allowlist.json";

export default {
  data: new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Manage the server whitelist")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a player to the whitelist")
        .addStringOption((option) =>
          option
            .setName("mcid")
            .setDescription("Minecraft ID of the player")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a player from the whitelist")
        .addStringOption((option) =>
          option
            .setName("mcid")
            .setDescription("Minecraft ID of the player")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all whitelisted players"),
    ) as any,
  execute: async (interaction) => {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      await handleAdd(interaction);
    } else if (subcommand === "remove") {
      await handleRemove(interaction);
    } else if (subcommand === "list") {
      await handleList(interaction);
    }
  },
} satisfies Command;

async function handleAdd(interaction: any) {
  await interaction.deferReply();

  const mcid = interaction.options.getString("mcid");

  try {
    // ホワイトリストに追加（XUID はプレイヤーログイン時に自動で埋まる）
    const whitelistManager = new WhitelistManager(containerName, allowlistPath);
    await whitelistManager.addPlayer(mcid);

    // サーバーが起動しているか確認
    const dockerManager = new DockerManager(containerName);
    const isRunning = await dockerManager.isRunning();

    if (isRunning) {
      // allowlist reload を実行
      await dockerManager.executeServerCommand("allowlist reload");

      // リロード完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // ログを確認して成功判定
      const logs = await dockerManager.getLogs(50);
      const reloadSuccess = logs.includes("Allowlist reloaded from file");

      if (reloadSuccess) {
        await interaction.editReply({
          content: `✅ Player **${mcid}** added to whitelist and reloaded!`,
        });
      } else {
        await interaction.editReply({
          content: `✅ Player **${mcid}** added to whitelist, but reload failed. Please restart the server.`,
        });
      }
    } else {
      await interaction.editReply({
        content: `✅ Player **${mcid}** added to whitelist! (Server is offline, changes will take effect on next start)`,
      });
    }
  } catch (error: any) {
    console.error("Error adding player:", error);
    await interaction.editReply({
      content: `❌ Failed to add player: ${error.message}`,
    });
  }
}

async function handleRemove(interaction: any) {
  await interaction.deferReply();

  const mcid = interaction.options.getString("mcid");

  try {
    const whitelistManager = new WhitelistManager(containerName, allowlistPath);
    await whitelistManager.removePlayer(mcid);

    // サーバーが起動しているか確認
    const dockerManager = new DockerManager(containerName);
    const isRunning = await dockerManager.isRunning();

    if (isRunning) {
      // allowlist reload を実行
      await dockerManager.executeServerCommand("allowlist reload");

      // リロード完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // ログを確認して成功判定
      const logs = await dockerManager.getLogs(50);
      const reloadSuccess = logs.includes("Allowlist reloaded from file");

      if (reloadSuccess) {
        await interaction.editReply({
          content: `✅ Player **${mcid}** removed from whitelist and reloaded!`,
        });
      } else {
        await interaction.editReply({
          content: `✅ Player **${mcid}** removed from whitelist, but reload failed. Please restart the server.`,
        });
      }
    } else {
      await interaction.editReply({
        content: `✅ Player **${mcid}** removed from whitelist! (Server is offline, changes will take effect on next start)`,
      });
    }
  } catch (error: any) {
    console.error("Error removing player:", error);
    await interaction.editReply({
      content: `❌ Failed to remove player: ${error.message}`,
    });
  }
}

async function handleList(interaction: any) {
  await interaction.deferReply();

  try {
    const whitelistManager = new WhitelistManager(containerName, allowlistPath);
    const players = await whitelistManager.listPlayers();

    if (players.length === 0) {
      await interaction.editReply({
        content: "📋 **Whitelist**\nNo players in whitelist",
      });
      return;
    }

    const playerList = players
      .map((p) => `• ${p.name}${p.xuid ? ` (XUID: ${p.xuid})` : " (pending)"}`)
      .join("\n");

    await interaction.editReply({
      content: `📋 **Whitelist** (${players.length} players)\n\n${playerList}`,
    });
  } catch (error: any) {
    console.error("Error listing players:", error);
    await interaction.editReply({
      content: `❌ Failed to list players: ${error.message}`,
    });
  }
}
