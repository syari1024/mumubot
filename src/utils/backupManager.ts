import { execSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { DockerManager } from "./dockerManager";
import { GoogleDriveManager } from "./googleDriveManager";

interface BackupInfo {
  filename: string;
  timestamp: string;
  size: string;
  googleDriveId?: string;
  googleDriveLink?: string;
}

/**
 * バックアップ管理ユーティリティ
 */
export class BackupManager {
  private dockerManager: DockerManager;
  private backupDir: string;
  private containerDataPath: string;
  private googleDriveManager?: GoogleDriveManager;

  constructor(
    containerName: string,
    backupDir: string,
    containerDataPath: string = "/data",
  ) {
    this.dockerManager = new DockerManager(containerName);
    this.backupDir = backupDir;
    this.containerDataPath = containerDataPath;

    // バックアップディレクトリが存在しなければ作成
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }

    // Google Drive マネージャーを初期化（環境変数がある場合）
    const credentialsPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (credentialsPath && folderId) {
      try {
        this.googleDriveManager = new GoogleDriveManager(
          credentialsPath,
          folderId,
        );
      } catch (error: any) {
        console.warn(`⚠️ Google Drive is not available: ${error.message}`);
      }
    }
  }

  /**
   * タイムスタンプを生成（YYYY-MM-DD_HH-mm-ss）
   */
  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  }

  /**
   * バックアップを作成（ローカル + Google Drive）
   */
  async createBackup(): Promise<BackupInfo> {
    try {
      const timestamp = this.generateTimestamp();
      const backupFilename = `backup-${timestamp}.tar.gz`;
      const backupPath = join(this.backupDir, backupFilename);

      // サーバーのログを確認してゲームを保存
      await this.dockerManager.executeServerCommand("save-all");

      // 保存完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // ホストのマウントパスからバックアップを作成
      const dataPath = process.env.DATA_MOUNT_PATH || "/minecraft-data";

      // tar コマンドでバックアップを作成
      execSync(`tar -czf "${backupPath}" -C "${dataPath}" .`, {
        stdio: "inherit",
      });

      // ファイルサイズを取得
      const stats = statSync(backupPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      const backupInfo: BackupInfo = {
        filename: backupFilename,
        timestamp: timestamp,
        size: `${sizeInMB} MB`,
      };

      // Google Drive にアップロード
      if (this.googleDriveManager) {
        try {
          console.log(`📤 Uploading to Google Drive: ${backupFilename}`);
          const fileId = await this.googleDriveManager.uploadFile(
            backupPath,
            backupFilename,
          );
          backupInfo.googleDriveId = fileId;
          backupInfo.googleDriveLink = `https://drive.google.com/file/d/${fileId}/view`;
        } catch (error: any) {
          console.warn(`⚠️ Failed to upload to Google Drive: ${error.message}`);
          // Google Drive のアップロードに失敗しても、ローカルバックアップは成功と見なす
        }
      }

      return backupInfo;
    } catch (error: any) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * バックアップを復元
   */
  async restoreBackup(backupFilename: string): Promise<void> {
    try {
      const backupPath = join(this.backupDir, backupFilename);

      // ファイルが存在するか確認
      if (!existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFilename}`);
      }
      // サーバーを停止
      const isRunning = await this.dockerManager.isRunning();
      if (isRunning) {
        await this.dockerManager.stop();
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      // ホストのマウントパスのデータをリセット
      const dataPath = process.env.DATA_MOUNT_PATH || "/minecraft-data";

      // バックアップを復元
      execSync(`tar -xzf "${backupPath}" -C "${dataPath}"`, {
        stdio: "inherit",
      });

      // サーバーを起動
      await this.dockerManager.start();
    } catch (error: any) {
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  /**
   * バックアップ一覧を取得
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      const files = readdirSync(this.backupDir).filter((f) =>
        f.startsWith("backup-"),
      );

      const backups: BackupInfo[] = files
        .map((filename) => {
          const filepath = join(this.backupDir, filename);
          const stats = statSync(filepath);
          const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

          // ファイル名からタイムスタンプを抽出
          const match = filename.match(/backup-(.+?)\.tar\.gz/);
          const timestamp = match ? match[1] : "unknown";

          return {
            filename,
            timestamp,
            size: `${sizeInMB} MB`,
          };
        })
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // 新しい順

      return backups;
    } catch (error: any) {
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  /**
   * バックアップを削除
   */
  async deleteBackup(backupFilename: string): Promise<void> {
    try {
      const backupPath = join(this.backupDir, backupFilename);

      if (!existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFilename}`);
      }

      execSync(`rm "${backupPath}"`);

      console.log(`✅ Deleted local backup: ${backupFilename}`);
    } catch (error: any) {
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  }
}
