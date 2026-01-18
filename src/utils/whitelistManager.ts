import { readFileSync, writeFileSync, existsSync } from "fs";
import { DockerManager } from "./dockerManager";

interface WhitelistEntry {
  ignoresPlayerLimit: boolean;
  name: string;
  xuid?: string;
}

/**
 * ホワイトリスト管理ユーティリティ
 */
export class WhitelistManager {
  private dockerManager: DockerManager;
  private containerPath: string;
  private localAllowlistPath: string;

  constructor(
    containerName: string,
    localAllowlistPath: string = "./allowlist.json",
  ) {
    this.dockerManager = new DockerManager(containerName);
    this.containerPath = "/data/allowlist.json";
    this.localAllowlistPath = localAllowlistPath;
  }

  /**
   * コンテナから allowlist.json をダウンロード
   */
  async syncFromContainer(): Promise<void> {
    try {
      await this.dockerManager.copyFromContainer(
        this.containerPath,
        this.localAllowlistPath,
      );
    } catch (error) {
      console.warn("Failed to sync from container, using local copy if exists");
    }
  }

  /**
   * コンテナに allowlist.json をアップロード
   */
  async syncToContainer(): Promise<void> {
    try {
      await this.dockerManager.copyToContainer(
        this.localAllowlistPath,
        this.containerPath,
      );
    } catch (error: any) {
      throw new Error(`Failed to sync to container: ${error.message}`);
    }
  }

  /**
   * ホワイトリストを読み込む
   */
  private loadWhitelist(): WhitelistEntry[] {
    try {
      if (!existsSync(this.localAllowlistPath)) {
        return [];
      }

      const content = readFileSync(this.localAllowlistPath, "utf-8");
      return JSON.parse(content) as WhitelistEntry[];
    } catch (error) {
      console.error("Error loading whitelist:", error);
      return [];
    }
  }

  /**
   * ホワイトリストを保存
   */
  private saveWhitelist(entries: WhitelistEntry[]): void {
    try {
      writeFileSync(
        this.localAllowlistPath,
        JSON.stringify(entries, null, 2),
        "utf-8",
      );
    } catch (error: any) {
      throw new Error(`Failed to save whitelist: ${error.message}`);
    }
  }

  /**
   * プレイヤーを追加
   */
  async addPlayer(mcid: string, xuid?: string): Promise<void> {
    const entries = this.loadWhitelist();

    // 既に存在するか確認
    if (entries.some((e) => e.name === mcid)) {
      throw new Error(`Player ${mcid} is already in the whitelist`);
    }

    // 新規エントリを追加
    entries.push({
      ignoresPlayerLimit: false,
      name: mcid,
      ...(xuid && { xuid }),
    });

    this.saveWhitelist(entries);
    await this.syncToContainer();
  }

  /**
   * プレイヤーを削除
   */
  async removePlayer(mcid: string): Promise<void> {
    const entries = this.loadWhitelist();
    const filtered = entries.filter((e) => e.name !== mcid);

    if (filtered.length === entries.length) {
      throw new Error(`Player ${mcid} not found in whitelist`);
    }

    this.saveWhitelist(filtered);
    await this.syncToContainer();
  }

  /**
   * ホワイトリスト一覧を取得
   */
  async listPlayers(): Promise<WhitelistEntry[]> {
    await this.syncFromContainer();
    return this.loadWhitelist();
  }

  /**
   * ホワイトリストをクリア
   */
  async clearWhitelist(): Promise<void> {
    this.saveWhitelist([]);
    await this.syncToContainer();
  }
}
