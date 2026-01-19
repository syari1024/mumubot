import { google } from "googleapis";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Google Drive バックアップアップロード管理
 */
export class GoogleDriveManager {
  private drive: any;
  private folderId: string;

  constructor(credentialsPath: string, folderId: string) {
    this.folderId = folderId;

    try {
      // サービスアカウントキーを読み込み
      const credentials = JSON.parse(readFileSync(credentialsPath, "utf-8"));

      // Google Drive API 認証
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });

      this.drive = google.drive({ version: "v3", auth });
    } catch (error: any) {
      throw new Error(`Failed to initialize Google Drive: ${error.message}`);
    }
  }

  /**
   * ファイルを Google Drive にアップロード
   */
  async uploadFile(filePath: string, fileName: string): Promise<string> {
    try {
      const fileStream = require("fs").createReadStream(filePath);

      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [this.folderId],
        },
        media: {
          body: fileStream,
        },
        fields: "id, webViewLink",
      });

      const fileId = response.data.id;
      const webLink = response.data.webViewLink;

      console.log(`✅ Uploaded to Google Drive: ${fileName} (ID: ${fileId})`);

      return fileId;
    } catch (error: any) {
      throw new Error(`Failed to upload to Google Drive: ${error.message}`);
    }
  }

  /**
   * Google Drive のファイル一覧を取得
   */
  async listFiles(): Promise<any[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${this.folderId}' in parents and trashed=false`,
        spaces: "drive",
        fields: "files(id, name, createdTime, size)",
        orderBy: "createdTime desc",
      });

      return response.data.files || [];
    } catch (error: any) {
      throw new Error(`Failed to list files in Google Drive: ${error.message}`);
    }
  }

  /**
   * Google Drive のファイルを削除
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId,
      });

      console.log(`✅ Deleted from Google Drive: ${fileId}`);
    } catch (error: any) {
      throw new Error(
        `Failed to delete file from Google Drive: ${error.message}`,
      );
    }
  }
}
