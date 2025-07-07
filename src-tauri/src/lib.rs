use keyring::Entry;
use rusqlite::params;
use serde_json;
use std::{
    fs,
    sync::{Arc, Mutex},
};
use tauri::State;

mod discord;
mod logging;
mod models;
mod showcase_manager;
mod sqlite_manager;
mod version_manager;

use discord::{fetch_discord_guilds, get_discord_channels, start_initial_indexing};
use log::{error, info};
// Ensure models::AppConfig is usable, along with other necessary models
use models::{AppConfig, FirstSlideSettings, OverlaySettings};
use showcase_manager::{
    check_showcase_pptx_exists, create_showcase, delete_showcase, get_selected_messages,
    get_showcase, get_showcase_images, list_showcases, open_showcase_pptx, save_selected_messages,
    save_showcase_pptx, sort_showcase_images, update_showcase, update_showcase_phase,
    upload_showcase_image,
};
use sqlite_manager::{
    clean_old_data, delete_all_application_data, get_cached_image_data, get_indexed_messages,
    get_storage_usage, retrieve_config, DbConnection,
};

use version_manager::{
    check_for_updates, get_current_version, get_update_github_link, get_version_info,
};

pub const KEYRING_SERVICE_NAME: &str = "com.megalith.showcase-app";

#[tauri::command]
async fn save_secret(key_name: String, secret: String) -> Result<(), String> {
    info!("Attempting to save secret for key: {}", key_name);
    let entry = Entry::new(KEYRING_SERVICE_NAME, &key_name)
        .map_err(|e| format!("Failed to create keyring entry for {}: {}", key_name, e))?;

    match entry.set_password(&secret) {
        Ok(_) => {
            info!("Successfully saved secret for key: {}", key_name);
            Ok(())
        }
        Err(e) => {
            error!("Error saving secret for {}: {}", key_name, e);

            Err(format!(
                "Could not save secret for '{}'. Error: {}",
                key_name, e
            ))
        }
    }
}

#[tauri::command]
async fn get_secret(key_name: String) -> Result<Option<String>, String> {
    info!("Attempting to get secret for key: {}", key_name);
    let entry = Entry::new(KEYRING_SERVICE_NAME, &key_name)
        .map_err(|e| format!("Failed to create keyring entry for {}: {}", key_name, e))?;

    match entry.get_password() {
        Ok(secret) => {
            info!("Successfully retrieved secret for key: {}", key_name);
            Ok(Some(secret))
        }
        Err(keyring::Error::NoEntry) => {
            info!("No secret found for key: {}", key_name);
            Ok(None)
        }
        Err(e) => {
            error!("Error retrieving secret for {}: {}", key_name, e);
            Err(format!(
                "Could not retrieve secret for '{}'. Error: {}",
                key_name, e
            ))
        }
    }
}

#[tauri::command]
async fn delete_secret(key_name: String) -> Result<(), String> {
    info!("Attempting to delete secret for key: {}", key_name);
    let entry = Entry::new(KEYRING_SERVICE_NAME, &key_name)
        .map_err(|e| format!("Failed to create keyring entry for {}: {}", key_name, e))?;

    match entry.delete_credential() {
        Ok(_) => {
            info!("Successfully deleted secret for key: {}", key_name);
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            error!("No secret to delete for key: {}", key_name);
            Ok(())
        }
        Err(e) => {
            error!("Error deleting secret for {}: {}", key_name, e);
            Err(format!(
                "Could not delete secret for '{}'. Error: {}",
                key_name, e
            ))
        }
    }
}

// Local AppConfig struct removed, will use models::AppConfig

#[tauri::command]
async fn set_configuration(
    config: models::AppConfig, // Changed to use models::AppConfig
    db_state: State<'_, DbConnection>,
) -> Result<(), String> {
    info!("Saving full configuration: {:?}", config);

    let mut conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let tx = conn_guard
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let insert_sql = "INSERT OR REPLACE INTO config (key, value) VALUES (?1, ?2);";

    // selected_server_id
    if let Some(id) = &config.selected_server_id {
        tx.execute(insert_sql, params!["selected_server_id", id])
            .map_err(|e| format!("Failed to save selected_server_id: {}", e))?;
    } else {
        tx.execute("DELETE FROM config WHERE key = 'selected_server_id';", [])
            .map_err(|e| format!("Failed to delete selected_server_id: {}", e))?;
    }

    // selected_channel_ids
    let channels_json = serde_json::to_string(&config.selected_channel_ids)
        .map_err(|e| format!("Failed to serialize selected_channel_ids: {}", e))?;
    tx.execute(insert_sql, params!["selected_channel_ids", &channels_json])
        .map_err(|e| format!("Failed to save selected_channel_ids: {}", e))?;

    // is_setup_complete
    tx.execute(
        insert_sql,
        params![
            "is_setup_complete",
            if config.is_setup_complete { "true" } else { "false" }
        ],
    )
    .map_err(|e| format!("Failed to save is_setup_complete: {}", e))?;

    // overlay_settings
    if let Some(settings) = &config.overlay_settings {
        let json_val = serde_json::to_string(settings)
            .map_err(|e| format!("Failed to serialize overlay_settings: {}", e))?;
        tx.execute(insert_sql, params!["overlay_settings_json", json_val])
            .map_err(|e| format!("Failed to save overlay_settings_json: {}", e))?;
    } else {
        tx.execute("DELETE FROM config WHERE key = 'overlay_settings_json';", [])
            .map_err(|e| format!("Failed to delete overlay_settings_json: {}", e))?;
    }

    // first_slide_settings
    if let Some(settings) = &config.first_slide_settings {
        let json_val = serde_json::to_string(settings)
            .map_err(|e| format!("Failed to serialize first_slide_settings: {}", e))?;
        tx.execute(insert_sql, params!["first_slide_settings_json", json_val])
            .map_err(|e| format!("Failed to save first_slide_settings_json: {}", e))?;
    } else {
        tx.execute("DELETE FROM config WHERE key = 'first_slide_settings_json';", [])
            .map_err(|e| format!("Failed to delete first_slide_settings_json: {}", e))?;
    }

    // auto_update_enabled
    if let Some(enabled) = config.auto_update_enabled {
        tx.execute(insert_sql, params!["auto_update_enabled", if enabled { "true" } else { "false" }])
            .map_err(|e| format!("Failed to save auto_update_enabled: {}", e))?;
    } else {
        tx.execute("DELETE FROM config WHERE key = 'auto_update_enabled';", [])
            .map_err(|e| format!("Failed to delete auto_update_enabled: {}", e))?;
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    info!("Full configuration saved successfully to DB.");
    Ok(())
}

#[tauri::command]
async fn get_configuration(db_state: State<'_, DbConnection>) -> Result<models::AppConfig, String> { // Return type changed
    info!("Command get_configuration called.");
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error in get_configuration command: {}", e))?;
    // retrieve_config is already expected to return models::AppConfig from sqlite_manager modifications
    sqlite_manager::retrieve_config(&conn_guard)
}

#[tauri::command]
async fn is_setup_complete(db_state: State<'_, DbConnection>) -> Result<bool, String> {
    info!("Command is_setup_complete called.");
    // Re-use get_configuration to simplify and ensure consistency
    let config = get_configuration(db_state).await?;
    Ok(config.is_setup_complete)
}

#[tauri::command]
async fn log_frontend_info(message: String) -> Result<(), String> {
    crate::log_info!("Frontend Info: {}", message);
    Ok(())
}

#[tauri::command]
async fn log_frontend_warn(message: String) -> Result<(), String> {
    crate::log_warn!("Frontend Warn: {}", message);
    Ok(())
}

#[tauri::command]
async fn log_frontend_error(message: String, error_details: Option<String>) -> Result<(), String> {
    if let Some(details) = error_details {
        crate::log_error!("Frontend Error: {} - Details: {}", message, details);
    } else {
        crate::log_error!("Frontend Error: {}", message);
    }
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, Default)]
struct CustomizationSettingsPayload {
    #[serde(rename = "overlaySettings", skip_serializing_if = "Option::is_none")]
    overlay_settings: Option<models::OverlaySettings>,
    #[serde(rename = "firstSlideSettings", skip_serializing_if = "Option::is_none")]
    first_slide_settings: Option<models::FirstSlideSettings>,
    #[serde(rename = "autoUpdateEnabled", skip_serializing_if = "Option::is_none")]
    auto_update_enabled: Option<bool>,
}

#[tauri::command]
async fn get_customization_settings(db_state: State<'_, DbConnection>) -> Result<CustomizationSettingsPayload, String> {
    info!("Fetching customization settings...");
    let config = get_configuration(db_state).await?;
    Ok(CustomizationSettingsPayload {
        overlay_settings: config.overlay_settings,
        first_slide_settings: config.first_slide_settings,
        auto_update_enabled: config.auto_update_enabled,
    })
}

#[tauri::command]
async fn save_customization_settings(
    payload: CustomizationSettingsPayload,
    db_state: State<'_, DbConnection>,
) -> Result<(), String> {
    info!("Saving customization settings: {:?}", payload);
    let mut current_config = get_configuration(db_state.clone()).await?; // Clone db_state for multiple uses
    
    current_config.overlay_settings = payload.overlay_settings;
    current_config.first_slide_settings = payload.first_slide_settings;
    current_config.auto_update_enabled = payload.auto_update_enabled;
    
    set_configuration(current_config, db_state).await
}

#[tauri::command]
async fn get_auto_update_setting(db_state: State<'_, DbConnection>) -> Result<Option<bool>, String> {
    info!("Fetching auto_update_setting...");
    let config = get_configuration(db_state).await?;
    Ok(config.auto_update_enabled)
}

#[tauri::command]
async fn set_auto_update_setting(
    enabled: bool,
    db_state: State<'_, DbConnection>,
) -> Result<(), String> {
    info!("Setting auto_update_setting to: {}", enabled);
    let mut current_config = get_configuration(db_state.clone()).await?;
    current_config.auto_update_enabled = Some(enabled);
    set_configuration(current_config, db_state).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;

            let log_path = logging::init_logging(&app.handle())?;
            info!("Application starting...");
            info!("Log file: {}", log_path.display());

            info!("Setting up database connection...");
            let connection_raw = sqlite_manager::initialize_database(app.handle())
                .map_err(|e| format!("FATAL: Database initialization failed: {}", e))?;

            info!("Database initialized successfully.");
            let db_arc = Arc::new(Mutex::new(connection_raw));

            info!("Managing state of type DbConnection.");
            app.manage(DbConnection(db_arc));

            info!("Ensuring image directories exist...");
            match app.path().app_data_dir() {
                Ok(app_data_dir) => {
                    let image_base_dir = app_data_dir.join("images");
                    let cached_image_dir = image_base_dir.join("cached");

                    if let Err(e) = fs::create_dir_all(&image_base_dir) {
                        error!(
                            "Failed to create base image directory '{}': {}",
                            image_base_dir.display(),
                            e
                        );
                    } else {
                        info!(
                            "Base image directory checked/created: {}",
                            image_base_dir.display()
                        );
                    }

                    if let Err(e) = fs::create_dir_all(&cached_image_dir) {
                        error!(
                            "Failed to create cached image directory '{}': {}",
                            cached_image_dir.display(),
                            e
                        );
                    } else {
                        info!(
                            "Cached image directory checked/created: {}",
                            cached_image_dir.display()
                        );
                    }
                }
                Err(e) => {
                    error!("CRITICAL: Could not resolve app data directory: {}", e);
                    return Err(format!("Could not resolve app data directory: {}", e).into());
                }
            }

            info!("Setup complete.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Keyring Commands (keyring.rs)
            save_secret,
            get_secret,
            delete_secret,
            // Discord Commands (discord.rs)
            fetch_discord_guilds,
            get_discord_channels,
            set_configuration,
            get_configuration,
            is_setup_complete,
            start_initial_indexing,
            // Showcase Commands (showcase_manager.rs)
            create_showcase,
            get_showcase,
            list_showcases,
            delete_showcase,
            update_showcase,
            update_showcase_phase,
            save_selected_messages,
            get_selected_messages,
            upload_showcase_image,
            sort_showcase_images,
            get_showcase_images,
            get_storage_usage,
            save_showcase_pptx,
            open_showcase_pptx,
            check_showcase_pptx_exists,
            // Database/Other Commands (sqlite_manager.rs)
            get_indexed_messages,
            get_cached_image_data,
            clean_old_data,
            delete_all_application_data,
            // Version Commands (version_manager.rs)
            check_for_updates,
            get_version_info,
            get_current_version,
            get_update_github_link,
            // New Customization Commands
            get_customization_settings,
            save_customization_settings,
            get_auto_update_setting,
            set_auto_update_setting,
            // Frontend Logging Commands
            log_frontend_info,
            log_frontend_warn,
            log_frontend_error
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
