import { Collection, SlashCommandBuilder } from "discord.js";
import { readdirSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Command } from "../types/Command.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands(): Promise<Collection<string, Command>> {
  const commands = new Collection<string, Command>();
  const commandsPath = join(__dirname, "../commands");

  const files = readdirSync(commandsPath).filter(
    (file) => extname(file) === ".ts" || extname(file) === ".js"
  );

  for (const file of files) {
    const filePath = join(commandsPath, file);
    const command = await import(`file:///${filePath.replace(/\\/g, "/")}`);
    commands.set(command.default.data.name, command.default);
  }

  return commands;
}

export const baseCommandBuilder = new SlashCommandBuilder()
  .setName("mumu")
  .setDescription("Mumu Server Management Bot");
