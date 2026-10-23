import { User } from '../types';

export interface SavedAccount {
  user: User;
  accessToken: string;
  refreshToken: string;
  isPrimary: boolean;
  savedAt: number;
}

const VAULT_STORAGE_KEY = 'echo_device_trust_vault_v1';
const ACTIVE_ACCOUNT_KEY = 'echo_active_user_id';
const HARDWARE_ID_KEY = 'echo_hardware_id';

class DeviceTrustVault {
  private accounts: SavedAccount[] = [];
  private hardwareId: string = '';

  constructor() {
    this.loadVault();
  }

  private loadVault() {
    try {
      const raw = localStorage.getItem(VAULT_STORAGE_KEY);
      if (raw) {
        this.accounts = JSON.parse(raw);
      }
      this.hardwareId = localStorage.getItem(HARDWARE_ID_KEY) || '';
    } catch {
      this.accounts = [];
    }
  }

  private persistVault() {
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(this.accounts));
    } catch (e) {
      console.error('Error saving vault:', e);
    }
  }

  public setHardwareId(hwid: string) {
    this.hardwareId = hwid;
    localStorage.setItem(HARDWARE_ID_KEY, hwid);
  }

  public getHardwareId(): string {
    if (!this.hardwareId) {
      this.hardwareId = localStorage.getItem(HARDWARE_ID_KEY) || `WEB-UUID-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
      localStorage.setItem(HARDWARE_ID_KEY, this.hardwareId);
    }
    return this.hardwareId;
  }

  public saveAccount(user: User, accessToken: string, refreshToken: string, isPrimary: boolean = false) {
    // If setting as primary, unset other primary accounts
    if (isPrimary) {
      this.accounts.forEach((acc) => (acc.isPrimary = false));
    }

    const existingIndex = this.accounts.findIndex((acc) => acc.user.UserID === user.UserID);
    const newEntry: SavedAccount = {
      user,
      accessToken,
      refreshToken,
      isPrimary: isPrimary || (existingIndex >= 0 ? this.accounts[existingIndex].isPrimary : this.accounts.length === 0),
      savedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      this.accounts[existingIndex] = newEntry;
    } else {
      this.accounts.push(newEntry);
    }

    this.persistVault();
    this.setActiveUserId(user.UserID);
  }

  public removeAccount(userId: number) {
    this.accounts = this.accounts.filter((acc) => acc.user.UserID !== userId);
    this.persistVault();
    if (this.getActiveUserId() === userId) {
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
  }

  public getPrimaryAccount(): SavedAccount | null {
    return this.accounts.find((acc) => acc.isPrimary) || (this.accounts.length > 0 ? this.accounts[0] : null);
  }

  public getSavedAccounts(): SavedAccount[] {
    return [...this.accounts];
  }

  public setActiveUserId(userId: number) {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, userId.toString());
  }

  public getActiveUserId(): number | null {
    const raw = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    return raw ? parseInt(raw, 10) : null;
  }

  public getActiveAccount(): SavedAccount | null {
    const activeId = this.getActiveUserId();
    if (activeId) {
      const found = this.accounts.find((acc) => acc.user.UserID === activeId);
      if (found) return found;
    }
    return this.getPrimaryAccount();
  }

  public clearVault() {
    this.accounts = [];
    localStorage.removeItem(VAULT_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  }
}

export const vault = new DeviceTrustVault();
