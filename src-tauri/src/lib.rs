use keyring::Entry;
use rusqlite::params;
use std::{
    fs,
    sync::{Arc, Mutex},
};
use tauri::State;

use serde_json;

mod discord;
mod models;
mod showcase_manager;
mod sqlite_manager;

use discord::{fetch_discord_guilds, get_discord_channels, start_initial_indexing};
use showcase_manager::{
    create_showcase, delete_showcase, get_selected_messages, get_showcase, list_showcases,
    open_showcase_pptx, save_selected_messages, save_showcase_pptx, sort_showcase_images,
    update_showcase, update_showcase_phase, upload_showcase_image, check_showcase_pptx_exists,
};
use sqlite_manager::{
    get_cached_image_data, get_indexed_messages, get_storage_usage, retrieve_config, DbConnection,
};

pub const KEYRING_SERVICE_NAME: &str = "com.megalith.showcase_app";

#[tauri::command]
async fn save_secret(key_name: String, secret: String) -> Result<(), String> {
    println!("Attempting to save secret for key: {}", key_name);
    let entry = Entry::new(KEYRING_SERVICE_NAME, &key_name)
        .map_err(|e| format!("Failed to create keyring entry for {}: {}", key_name, e))?;

    match entry.set_password(&secret) {
        Ok(_) => {
            println!("Successfully saved secret for key: {}", key_name);
            Ok(())
        }
        Err(e) => {
            eprintln!("Error saving secret for {}: {}", key_name, e);

            Err(format!(
                "Could not save secret for '{}'. Error: {}",
                key_name, e
            ))
        }
    }
}

#[tauri::command]
async fn get_secret(key_name: String) -> Result<Option<String>, String> {
    println!("Attempting to get secret for key: {}", key_name);
    let entry = Entry::new(KEYRING_SERVICE_NAME, &key_name)
        .map_err(|e| format!("Failed to create keyring entry for {}: {}", key_name, e))?;

    match entry.get_password() {
        Ok(secret) => {
            println!("Successfully retrieved secret for key: {}", key_name);
            Ok(Some(secret))
        }
        Err(keyring::Error::NoEntry) => {
            println!("No secret found for key: {}", key_name);
            Ok(None)
        }
        Err(e) => {
            eprintln!("Error retrieving secret for {}: {}", key_name, e);
            Err(format!(
                "Could not retrieve secret for '{}'. Error: {}",
                key_name, e
            ))
        }
    }
}

#[tauri::command]
async fn delete_secret(key_name: String) -> Result<(), String> {
    println!("Attempting to delete secret for key: {}", key_name);
    let entry = Entry::new(KEYRING_SERVICE_NAME, &key_name)
        .map_err(|e| format!("Failed to create keyring entry for {}: {}", key_name, e))?;

    match entry.delete_credential() {
        Ok(_) => {
            println!("Successfully deleted secret for key: {}", key_name);
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            println!("No secret to delete for key: {}", key_name);
            Ok(())
        }
        Err(e) => {
            eprintln!("Error deleting secret for {}: {}", key_name, e);
            Err(format!(
                "Could not delete secret for '{}'. Error: {}",
                key_name, e
            ))
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Default)]
struct AppConfig {
    selected_server_id: Option<String>,
    selected_channel_ids: Vec<String>,
    is_setup_complete: bool,
}

#[tauri::command]
async fn set_configuration(
    server_id: Option<String>,
    channel_ids: Vec<String>,
    is_setup_complete: bool,
    db_state: State<'_, DbConnection>,
) -> Result<(), String> {
    println!(
        "Saving configuration: server={:?}, channels={:?}, setup_complete={}",
        server_id, channel_ids, is_setup_complete
    );

    let mut conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let channels_json = serde_json::to_string(&channel_ids)
        .map_err(|e| format!("Failed to serialize channel IDs: {}", e))?;

    let tx = conn_guard
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let insert_sql = "INSERT OR REPLACE INTO config (key, value) VALUES (?1, ?2);";

    if let Some(id) = &server_id {
        tx.execute(insert_sql, params!["selected_server_id", id])
            .map_err(|e| format!("Failed to save server_id: {}", e))?;
    } else {
        tx.execute("DELETE FROM config WHERE key = 'selected_server_id';", [])
            .map_err(|e| format!("Failed to delete server_id: {}", e))?;
    }

    tx.execute(insert_sql, params!["selected_channel_ids", &channels_json])
        .map_err(|e| format!("Failed to save channel_ids: {}", e))?;

    tx.execute(
        insert_sql,
        params![
            "is_setup_complete",
            if is_setup_complete { "true" } else { "false" }
        ],
    )
    .map_err(|e| format!("Failed to save setup_complete: {}", e))?;

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    println!("Configuration saved successfully to DB.");
    Ok(())
}

#[tauri::command]
async fn get_configuration(db_state: State<'_, DbConnection>) -> Result<AppConfig, String> {
    println!("Command get_configuration called.");
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error in get_configuration command: {}", e))?;
    retrieve_config(&conn_guard)
}

#[tauri::command]
async fn is_setup_complete(db_state: State<'_, DbConnection>) -> Result<bool, String> {
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn_guard
        .prepare("SELECT key, value FROM config;")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let mut rows = stmt
        .query([])
        .map_err(|e| format!("Failed to query configuration: {}", e))?;

    let mut config = AppConfig::default();

    while let Some(row) = rows
        .next()
        .map_err(|e| format!("Failed to read row: {}", e))?
    {
        let key: String = row
            .get(0)
            .map_err(|e| format!("Failed to get key: {}", e))?;
        let value: String = row
            .get(1)
            .map_err(|e| format!("Failed to get value: {}", e))?;
        if key == "is_setup_complete" {
            config.is_setup_complete = value == "true";
        }
    }

    Ok(config.is_setup_complete)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;

            println!("Setting up database connection...");
            let connection_raw = sqlite_manager::initialize_database(app.handle())
                .map_err(|e| format!("FATAL: Database initialization failed: {}", e))?;

            println!("Database initialized successfully.");
            let db_arc = Arc::new(Mutex::new(connection_raw));

            println!("Managing state of type DbConnection.");
            app.manage(DbConnection(db_arc));

            println!("Ensuring image directories exist...");
            match app.path().app_data_dir() {
                Ok(app_data_dir) => {
                    let image_base_dir = app_data_dir.join("images");
                    let cached_image_dir = image_base_dir.join("cached");

                    if let Err(e) = fs::create_dir_all(&image_base_dir) {
                        eprintln!(
                            "Failed to create base image directory '{}': {}",
                            image_base_dir.display(),
                            e
                        );
                    } else {
                        println!(
                            "Base image directory checked/created: {}",
                            image_base_dir.display()
                        );
                    }

                    if let Err(e) = fs::create_dir_all(&cached_image_dir) {
                        eprintln!(
                            "Failed to create cached image directory '{}': {}",
                            cached_image_dir.display(),
                            e
                        );
                    } else {
                        println!(
                            "Cached image directory checked/created: {}",
                            cached_image_dir.display()
                        );
                    }
                }
                Err(e) => {
                    eprintln!("CRITICAL: Could not resolve app data directory: {}", e);
                    return Err(format!("Could not resolve app data directory: {}", e).into());
                }
            }

            println!("Setup complete.");
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
            get_storage_usage,
            save_showcase_pptx,
            open_showcase_pptx,
            check_showcase_pptx_exists,
            // Database/Other Commands (sqlite_manager.rs)
            get_indexed_messages,
            get_cached_image_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
