import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface DockerCommandResult {
  stdout: string;
  stderr: string;
}

/**
 * Docker コンテナ管理ユーティリティ
 */
export class DockerManager {
  private containerName: string;

  constructor(containerName: string) {
    this.containerName = containerName;
  }

  /**
   * コンテナが稼働しているか確認
   */
  async isRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker ps --filter "name=${this.containerName}" --filter "status=running" --quiet`
      );
      return stdout.trim().length > 0;
    } catch (error) {
      console.error("Error checking if container is running:", error);
      return false;
    }
  }

  /**
   * コンテナを起動
   */
  async start(): Promise<DockerCommandResult> {
    try {
      const { stdout, stderr } = await execAsync(
        `docker start ${this.containerName}`
      );
      return { stdout, stderr };
    } catch (error: any) {
      throw new Error(`Failed to start container: ${error.message}`);
    }
  }

  /**
   * コンテナを停止（graceful shutdown）
   */
  async stop(): Promise<DockerCommandResult> {
    try {
      // Minecraft サーバーに stop コマンドを送信
      await execAsync(`docker exec ${this.containerName} send-command stop`);

      // サーバーのシャットダウンを待つ（最大 30 秒）
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const { stdout, stderr } = await execAsync(
        `docker stop ${this.containerName}`
      );
      return { stdout, stderr };
    } catch (error: any) {
      throw new Error(`Failed to stop container: ${error.message}`);
    }
  }

  /**
   * サーバーコマンドを実行
   */
  async executeServerCommand(command: string): Promise<DockerCommandResult> {
    try {
      const { stdout, stderr } = await execAsync(
        `docker exec ${this.containerName} send-command ${command}`
      );
      return { stdout, stderr };
    } catch (error: any) {
      throw new Error(`Failed to execute server command: ${error.message}`);
    }
  }

  /**
   * コンテナのログを取得（直近 N 行）
   */
  async getLogs(lines: number = 100): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `docker logs --tail=${lines} ${this.containerName}`
      );
      return stdout;
    } catch (error: any) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }
  }

  /**
   * コンテナのログをリアルタイムで取得（直近 N 行から follow）
   */
  async getLogsFollowing(lines: number = 50): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `docker logs --tail=${lines} ${this.containerName}`
      );
      return stdout;
    } catch (error: any) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }
  }

  /**
   * コンテナ内のファイルをホストにコピー
   */
  async copyFromContainer(
    containerPath: string,
    hostPath: string
  ): Promise<DockerCommandResult> {
    try {
      const { stdout, stderr } = await execAsync(
        `docker cp ${this.containerName}:${containerPath} ${hostPath}`
      );
      return { stdout, stderr };
    } catch (error: any) {
      throw new Error(`Failed to copy from container: ${error.message}`);
    }
  }

  /**
   * ホストのファイルをコンテナにコピー
   */
  async copyToContainer(
    hostPath: string,
    containerPath: string
  ): Promise<DockerCommandResult> {
    try {
      const { stdout, stderr } = await execAsync(
        `docker cp ${hostPath} ${this.containerName}:${containerPath}`
      );
      return { stdout, stderr };
    } catch (error: any) {
      throw new Error(`Failed to copy to container: ${error.message}`);
    }
  }

  /**
   * コンテナ内でコマンドを実行
   */
  async execCommand(command: string): Promise<DockerCommandResult> {
    try {
      const { stdout, stderr } = await execAsync(
        `docker exec ${this.containerName} ${command}`
      );
      return { stdout, stderr };
    } catch (error: any) {
      throw new Error(`Failed to execute command: ${error.message}`);
    }
  }
}
