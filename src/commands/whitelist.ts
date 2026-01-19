import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../types/Command";
import { WhitelistManager } from "../utils/whitelistManager.js";
import { DockerManager } from "../utils/dockerManager.js";

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
    const whitelistManager = new WhitelistManager(containerName, allowlistPath);
    await whitelistManager.addPlayer(mcid);

    const dockerManager = new DockerManager(containerName);
    const isRunning = await dockerManager.isRunning();

    if (isRunning) {
      await dockerManager.executeServerCommand("allowlist reload");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const logs = await dockerManager.getLogs(50);
      const reloadSuccess = logs.includes("Allowlist reloaded from file");

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(reloadSuccess ? "Green" : "Yellow")
            .setTitle(
              reloadSuccess
                ? "✅ ホワイトリスト追加成功"
                : "⚠️ ホワイトリスト追加完了",
            )
            .setDescription(`プレイヤー: **${mcid}**`)
            .setFooter({
              text: reloadSuccess
                ? "ホワイトリストが反映されました"
                : "リロードに失敗しました。サーバーを再起動してください",
            }),
        ],
      });
    } else {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ ホワイトリスト追加成功")
            .setDescription(`プレイヤー: **${mcid}**`)
            .setFooter({
              text: "サーバーは停止中です。次回起動時に反映されます。",
            }),
        ],
      });
    }
  } catch (error: any) {
    console.error("Error adding player:", error);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("❌ プレイヤー追加失敗")
          .setDescription(error.message),
      ],
    });
  }
}

async function handleRemove(interaction: any) {
  await interaction.deferReply();

  const mcid = interaction.options.getString("mcid");

  try {
    const whitelistManager = new WhitelistManager(containerName, allowlistPath);
    await whitelistManager.removePlayer(mcid);

    const dockerManager = new DockerManager(containerName);
    const isRunning = await dockerManager.isRunning();

    if (isRunning) {
      await dockerManager.executeServerCommand("allowlist reload");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const logs = await dockerManager.getLogs(50);
      const reloadSuccess = logs.includes("Allowlist reloaded from file");

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(reloadSuccess ? "Green" : "Yellow")
            .setTitle(
              reloadSuccess
                ? "✅ ホワイトリスト削除成功"
                : "⚠️ ホワイトリスト削除完了",
            )
            .setDescription(`プレイヤー: **${mcid}**`)
            .setFooter({
              text: reloadSuccess
                ? "ホワイトリストが反映されました"
                : "リロードに失敗しました。サーバーを再起動してください",
            }),
        ],
      });
    } else {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ ホワイトリスト削除成功")
            .setDescription(`プレイヤー: **${mcid}**`)
            .setFooter({
              text: "サーバーは停止中です。次回起動時に反映されます。",
            }),
        ],
      });
    }
  } catch (error: any) {
    console.error("Error removing player:", error);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("❌ プレイヤー削除失敗")
          .setDescription(error.message),
      ],
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
        embeds: [
          new EmbedBuilder()
            .setColor("Blue")
            .setTitle("📋 ホワイトリスト")
            .setDescription("ホワイトリストにプレイヤーがいません"),
        ],
      });
      return;
    }

    const playerList = players
      .map((p) => `• ${p.name}${p.xuid ? ` (XUID: ${p.xuid})` : " (保留中)"}`)
      .join("\n");

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("Blue")
          .setTitle("📋 ホワイトリスト")
          .setDescription(`**${players.length}** 人のプレイヤー`)
          .addFields({ name: "プレイヤー一覧", value: playerList }),
      ],
    });
  } catch (error: any) {
    console.error("Error listing players:", error);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("❌ プレイヤー一覧取得失敗")
          .setDescription(error.message),
      ],
    });
  }
}
