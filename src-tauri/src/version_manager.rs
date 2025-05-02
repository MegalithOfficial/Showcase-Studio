use reqwest;
use serde::{Deserialize, Serialize};
use semver::{Version};
use std::error::Error;
use chrono::DateTime;

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    published_at: String,
}

#[derive(Debug, Serialize)]
pub struct VersionInfo {
    version: String,
    branch: String,
    should_update: bool,
}

#[derive(Debug, Serialize)]
pub struct SimpleVersionInfo {
    version: String,
    branch: String,
}

pub const CURRENT_VERSION: &str = "0.1.3-beta";

async fn fetch_releases() -> Result<Vec<GitHubRelease>, Box<dyn Error + Send + Sync>> {
    let client = reqwest::Client::new();
    let releases = client
        .get("https://api.github.com/repos/MegalithOfficial/Showcase-Studio/releases")
        .header("User-Agent", "Showcase-Studio-App")
        .send()
        .await?
        .json::<Vec<GitHubRelease>>()
        .await?;
    
    Ok(releases)
}

fn find_latest_release(releases: &[GitHubRelease]) -> Option<&GitHubRelease> {
    releases.iter().max_by(|a, b| {
        let date_a = DateTime::parse_from_rfc3339(&a.published_at).unwrap_or_default();
        let date_b = DateTime::parse_from_rfc3339(&b.published_at).unwrap_or_default();
        date_a.cmp(&date_b)
    })
}

fn parse_version_info(tag_name: &str) -> (String, String) {
    let version_str = if tag_name.starts_with('v') {
        &tag_name[1..]
    } else {
        tag_name
    };
    
    let parts: Vec<&str> = version_str.split('-').collect();
    let version = parts[0].to_string();
    
    let branch = if parts.len() > 1 {
        match parts[1].to_lowercase().as_str() {
            "beta" => "Beta",
            "release" => "Release",
            "hotfix" => "Hot Fix",
            _ => "Unknown",
        }
    } else {
        "Stable"
    };
    
    (version, branch.to_string())
}

fn should_update(current_version: &str, latest_version: &str) -> bool {
    match (Version::parse(current_version), Version::parse(latest_version)) {
        (Ok(current), Ok(latest)) => latest > current,
        _ => false, 
    }
}

#[tauri::command]
pub async fn check_for_updates(current_version: String) -> Result<VersionInfo, String> {
    let releases = fetch_releases().await.map_err(|e| e.to_string())?;
    
    if let Some(latest_release) = find_latest_release(&releases) {
        let (latest_version, branch) = parse_version_info(&latest_release.tag_name);
        let update_available = should_update(&current_version, &latest_version);
        
        Ok(VersionInfo {
            version: latest_version,
            branch,
            should_update: update_available,
        })
    } else {
        Err("No releases found".to_string())
    }
}

#[tauri::command]
pub fn get_version_info(current_version: String) -> SimpleVersionInfo {
    let parts: Vec<&str> = current_version.split('-').collect();
    let version = parts[0].to_string();
    
    let branch = if parts.len() > 1 {
        match parts[1].to_lowercase().as_str() {
            "beta" => "Beta",
            "release" => "Release",
            "hotfix" => "Hot Fix",
            _ => "Unknown",
        }
    } else {
        "Stable"
    };
    
    SimpleVersionInfo {
        version,
        branch: branch.to_string(),
    }
}

#[tauri::command]
pub fn get_current_version() -> SimpleVersionInfo {
    get_version_info(CURRENT_VERSION.to_string())
}

#[tauri::command]
pub async fn get_update_github_link() -> Result<String, String> {
    let releases = fetch_releases().await.map_err(|e| e.to_string())?;
    
    if let Some(latest_release) = find_latest_release(&releases) {
        let tag_name = &latest_release.tag_name;
        let github_url = format!("https://github.com/MegalithOfficial/Showcase-Studio/releases/tag/{}", tag_name);
        Ok(github_url)
    } else {
        Err("No releases found".to_string())
    }
}