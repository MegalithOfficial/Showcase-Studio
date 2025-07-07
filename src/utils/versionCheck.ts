import { invoke } from '@tauri-apps/api/core';

export interface VersionInfo {
  version: string;
  branch: undefined | "Beta" | "Hot Fix" | "Release" | "Unknown";
  shouldUpdate: boolean;
};

export interface SimpleVersionInfo {
  version: string;
  branch: string;
};

export async function checkForUpdates(currentVersion: string): Promise<VersionInfo> {
  return invoke('check_for_updates', { currentVersion });
};

export async function getVersionInfo(currentVersion: string): Promise<SimpleVersionInfo> {
  return invoke('get_version_info', { currentVersion });
};

export async function getCurrentVersion(): Promise<SimpleVersionInfo> {
  return invoke('get_current_version');
};

export async function getUpdateGithubLink(): Promise<string> {
  return invoke('get_update_github_link');
}

export const getBranchBadgeStyles = (branch: VersionInfo["branch"]) => {
  switch (branch) {
    case 'Beta':
      return 'bg-purple-600/20 text-purple-400 border border-purple-500/30';
    case 'Hot Fix':
      return 'bg-orange-600/20 text-orange-400 border border-orange-500/30';
    case 'Release':
      return 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30';
    default:
      return 'bg-blue-600/20 text-blue-400 border border-blue-500/30'; // Unknown
  }
};