import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);
  private readonly vaultAddr: string;
  private readonly vaultToken: string;
  private readonly useMock: boolean;
  private readonly mockStorage = new Map<string, any>();

  constructor(private configService: ConfigService) {
    this.vaultAddr = this.configService.get<string>('VAULT_ADDR') || '';
    this.vaultToken = this.configService.get<string>('VAULT_TOKEN') || '';
    this.useMock = !this.vaultAddr || !this.vaultToken;

    if (this.useMock) {
      this.logger.warn('VAULT_ADDR or VAULT_TOKEN not configured. Using high-performance in-memory mock vault engine.');
    } else {
      this.logger.log(`Vault active-transit engine integrated at: ${this.vaultAddr}`);
    }
  }

  async getSecret(path: string): Promise<any> {
    if (this.useMock) {
      return this.mockStorage.get(path) || null;
    }

    try {
      const url = `${this.vaultAddr}/v1/secret/data/${path}`;
      const response = await axios.get(url, {
        headers: {
          'X-Vault-Token': this.vaultToken,
        },
      });
      return response.data?.data?.data || null;
    } catch (err) {
      this.logger.error(`Failed to fetch secret from Vault path "${path}": ${err.message}`);
      return null;
    }
  }

  async setSecret(path: string, data: any): Promise<void> {
    if (this.useMock) {
      this.mockStorage.set(path, data);
      return;
    }

    try {
      const url = `${this.vaultAddr}/v1/secret/data/${path}`;
      await axios.post(
        url,
        { data },
        {
          headers: {
            'X-Vault-Token': this.vaultToken,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`Successfully stored secret to Vault path: ${path}`);
    } catch (err) {
      this.logger.error(`Failed to store secret to Vault path "${path}": ${err.message}`);
      throw new Error(`Vault operations failed: ${err.message}`);
    }
  }

  async deleteSecret(path: string): Promise<void> {
    if (this.useMock) {
      this.mockStorage.delete(path);
      return;
    }

    try {
      const url = `${this.vaultAddr}/v1/secret/data/${path}`;
      await axios.delete(url, {
        headers: {
          'X-Vault-Token': this.vaultToken,
        },
      });
      this.logger.log(`Successfully deleted secret at Vault path: ${path}`);
    } catch (err) {
      this.logger.error(`Failed to delete secret at Vault path "${path}": ${err.message}`);
    }
  }

  /**
   * Performs dynamic 90-day automatic webhook secret rotation (Story 2.2).
   */
  async rotateWebhookSecret(projectId: string, organizationId: string): Promise<string> {
    const newSecret = crypto.randomBytes(32).toString('hex');
    const path = `org_${organizationId}/proj_${projectId}`;
    
    const existing = await this.getSecret(path) || {};
    existing.webhookSecret = newSecret;
    await this.setSecret(path, existing);

    this.logger.log(`Rotated webhook secret in Vault for project ${projectId}`);
    return newSecret;
  }
}
