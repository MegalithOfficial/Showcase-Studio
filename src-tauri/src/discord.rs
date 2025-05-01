use keyring::Entry;
use rusqlite::params;
use serenity::all::MessagePagination;
use serenity::http::Http;
use serenity::model::guild::GuildInfo;

use serenity::model::channel::{ChannelType, GuildChannel};
use serenity::model::id::{ChannelId, GuildId, MessageId};

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::time::sleep;

use crate::sqlite_manager::{retrieve_config, DbConnection};
use crate::{log_error as error, log_info as info, log_warn as warn};
use crate::{AppConfig, KEYRING_SERVICE_NAME};

use chrono::{DateTime, Datelike, Months, NaiveDate, TimeZone, Utc};
use reqwest;
use std::path::Path;

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct AttachmentInfo {
    id: String,
    url: String,
    filename: String,
    content_type: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct SerializableGuild {
    id: String,
    name: String,
    icon: Option<String>,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct SerializableChannel {
    id: String,
    name: String,
    topic: Option<String>,
    position: u16,
    parent_id: Option<String>,
    parent_name: Option<String>,
}

#[tauri::command]
fn get_cached_image_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;
    Ok(app_data_dir.join("images").join("cached"))
}
#[tauri::command]
pub async fn get_discord_channels(
    guild_id_str: String,
) -> Result<Vec<SerializableChannel>, String> {
    info!(
        "Attempting to fetch channels for guild ID: {}",
        guild_id_str
    );

    let guild_id = match guild_id_str.parse::<u64>() {
        Ok(id) => GuildId::new(id),
        Err(_) => {
            return Err(format!(
                "Invalid Guild ID format provided: '{}'",
                guild_id_str
            ))
        }
    };

    let token_key_name = "discordBotToken";
    let token_entry = Entry::new(KEYRING_SERVICE_NAME, token_key_name)
        .map_err(|e| format!("Keyring error: {}", e))?;

    let token = match token_entry.get_password() {
        Ok(t) => t,
        Err(keyring::Error::NoEntry) => {
            return Err("Discord Bot Token not found. Please save it first.".to_string())
        }
        Err(e) => return Err(format!("Failed to retrieve token: {}", e)),
    };

    if token.is_empty() {
        return Err("Stored Discord Bot Token is empty.".to_string());
    }

    let http = Arc::new(Http::new(&token));

    match http.get_channels(guild_id).await {
        Ok(channels) => {
            info!(
                "Successfully fetched {} channels for guild {}",
                channels.len(),
                guild_id
            );

            let category_names: HashMap<ChannelId, String> = channels
                .iter()
                .filter(|ch| ch.kind == ChannelType::Category)
                .map(|cat| (cat.id, cat.name.clone()))
                .collect();

            let mut serializable_channels = channels
                .into_iter()
                .filter(|ch| ch.kind == ChannelType::Text)
                .map(|ch: GuildChannel| {
                    let parent_name = ch
                        .parent_id
                        .and_then(|pid| category_names.get(&pid).cloned());

                    SerializableChannel {
                        id: ch.id.to_string(),
                        name: ch.name,
                        topic: ch.topic,
                        position: ch.position,
                        parent_id: ch.parent_id.map(|pid| pid.to_string()),
                        parent_name,
                    }
                })
                .collect::<Vec<_>>();

            serializable_channels.sort_by_key(|c| c.position);
            Ok(serializable_channels)
        }
        Err(e) => {
            error!("Failed to fetch channels for guild {}: {}", guild_id, e);
            if let serenity::Error::Http(http_err) = &e {
                if let Some(status) = http_err.status_code() {
                    match status.as_u16() {
                        401 => {
                            return Err(
                                "Discord API Error: Invalid Token (Unauthorized).".to_string()
                            )
                        }
                        403 => {
                            return Err(format!(
                            "Discord API Error: Missing permissions to view channels in guild {}.",
                            guild_id_str
                        ))
                        }
                        404 => {
                            return Err(format!(
                                "Discord API Error: Guild not found (ID: {}).",
                                guild_id_str
                            ))
                        }
                        _ => {}
                    }
                }
            }
            Err(format!(
                "Failed to fetch channels for guild {}. Error: {}",
                guild_id_str, e
            ))
        }
    }
}

#[tauri::command]
pub async fn fetch_discord_guilds() -> Result<Vec<SerializableGuild>, String> {
    info!("Attempting to fetch Discord guilds (from discord module)...");

    let token_key_name = "discordBotToken";
    let token_entry = Entry::new(KEYRING_SERVICE_NAME, token_key_name)
        .map_err(|e| format!("Keyring error: {}", e))?;

    let token = match token_entry.get_password() {
        Ok(t) => t,
        Err(keyring::Error::NoEntry) => {
            return Err(
                "Discord Bot Token not found in keyring. Please save it first.".to_string(),
            );
        }
        Err(e) => {
            return Err(format!(
                "Failed to retrieve Discord Bot Token from keyring: {}",
                e
            ));
        }
    };

    if token.is_empty() {
        return Err("Stored Discord Bot Token is empty.".to_string());
    }

    let http = Arc::new(Http::new(&token));

    match http.get_guilds(None, None).await {
        Ok(guilds) => {
            info!("Successfully fetched {} guilds.", guilds.len());
            let serializable_guilds = guilds
                .into_iter()
                .map(|g: GuildInfo| SerializableGuild {
                    id: g.id.to_string(),
                    name: g.name,
                    icon: g.icon.map(|h| h.to_string()),
                })
                .collect();
            Ok(serializable_guilds)
        }
        Err(e) => {
            error!("Failed to fetch guilds from Discord API: {}", e);
            if let serenity::Error::Http(http_err) = &e {
                if let Some(status) = http_err.status_code() {
                    if status.as_u16() == 401 {
                        return Err("Discord API Error: Invalid Token (Unauthorized). Please check the saved token.".to_string());
                    }
                }
            }
            Err(format!("Failed to fetch guilds from Discord API. Check network connection and token permissions. Error: {}", e))
        }
    }
}

#[tauri::command]
pub async fn start_initial_indexing(
    app_handle: AppHandle,
    db_state: State<'_, DbConnection>,
) -> Result<(), String> {
    info!("Starting initial message indexing (downloading images to cache)...");

    let token_key_name = "discordBotToken";
    let token_entry = Entry::new(KEYRING_SERVICE_NAME, token_key_name)
        .map_err(|e| format!("Keyring error: {}", e))?;
    let token = match token_entry.get_password() {
        Ok(t) if !t.is_empty() => t,
        Ok(_) => return Err("Stored Discord Bot Token is empty.".to_string()),
        Err(keyring::Error::NoEntry) => {
            return Err("Discord Bot Token not found. Please save it first.".to_string())
        }
        Err(e) => return Err(format!("Failed to retrieve token: {}", e)),
    };
    let http_token = if token.starts_with("Bot ") {
        token.clone()
    } else {
        format!("Bot {}", token)
    };
    let http = Arc::new(Http::new(&http_token));

    let config: AppConfig = {
        let conn_guard = db_state
            .0
            .lock()
            .map_err(|e| format!("DB lock error for config: {}", e))?;
        retrieve_config(&conn_guard)?
    };
    if config.selected_channel_ids.is_empty() {
        app_handle
            .emit("indexing-status", "No channels selected")
            .unwrap_or_default();
        warn!("No channels selected, indexing aborted.");
        return Ok(());
    }
    let channel_ids = config.selected_channel_ids;
    info!("Channels to index: {:?}", channel_ids);

    let now = Utc::now();
    let first_day_current = NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap();
    let target_month_start = first_day_current
        .checked_sub_months(Months::new(1))
        .map(|d| NaiveDate::from_ymd_opt(d.year(), d.month(), 1).unwrap())
        .unwrap_or_else(|| NaiveDate::from_ymd_opt(now.year() - 1, 12, 1).unwrap());
    let start_utc: DateTime<Utc> =
        Utc.from_utc_datetime(&target_month_start.and_hms_opt(0, 0, 0).unwrap());
    let start_ts = start_utc.timestamp();
    info!(
        "Indexing messages since: {} (Timestamp: {})",
        start_utc, start_ts
    );

    let cache_base_dir = get_cached_image_dir(&app_handle)?;
    info!(
        "Cached images will be stored base: {}",
        cache_base_dir.display()
    );

    let http_clone = http.clone();
    let app_clone = app_handle.clone();
    let db_arc = db_state.0.clone();

    tokio::spawn(async move {
        info!("Background indexing task started (downloading).");
        let mut total_fetched_metadata = 0;
        let mut total_messages_processed_for_db = 0;
        let mut total_images_saved_or_found = 0;

        let download_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        for chan_str in channel_ids {
            let channel_id = match chan_str.parse::<u64>() {
                Ok(id) => ChannelId::new(id),
                Err(_) => {
                    error!("Invalid channel ID format: {}", chan_str);
                    app_clone
                        .emit(
                            "indexing-error",
                            format!("Invalid channel ID: {}", chan_str),
                        )
                        .unwrap_or_default();
                    continue;
                }
            };
            info!("Starting indexing for channel: {}", channel_id);
            app_clone
                .emit(
                    "indexing-status",
                    format!("Starting to fetch channel with id: {}", channel_id),
                )
                .unwrap_or_default();

            let mut before_id: Option<MessageId> = None;
            'message_loop: loop {
                let pagination = before_id.map(MessagePagination::Before);
                let messages_result = http_clone
                    .get_messages(channel_id, pagination, Some(100))
                    .await;

                match messages_result {
                    Ok(mut msgs) => {
                        if msgs.is_empty() {
                            warn!("No more messages found in channel {}", channel_id);
                            break 'message_loop;
                        }
                        total_fetched_metadata += msgs.len();
                        app_clone
                            .emit(
                                "indexing-progress",
                                format!(
                                    "Fetched {} message metadata total",
                                    total_fetched_metadata
                                ),
                            )
                            .unwrap_or_default();

                        msgs.sort_by_key(|m| m.timestamp);
                        if let Some(first) = msgs.first() {
                            before_id = Some(first.id);
                        }

                        let mut batch_data_for_db: Vec<(
                            serenity::model::channel::Message,
                            Vec<String>,
                        )> = Vec::new();
                        let mut reached_older_messages = false;

                        for msg in msgs {
                            if msg.timestamp.unix_timestamp() < start_ts {
                                reached_older_messages = true;
                                continue; // Skip older message
                            }

                            let message_id_str = msg.id.to_string();
                            let mut saved_filenames_for_msg: Vec<String> = Vec::new();
                            let mut attachment_processing_failed = false;
                            let mut attachment_count = 0;

                            for attachment_meta in msg.attachments.iter() {
                                attachment_count += 1;

                                let filename_lower = attachment_meta.filename.to_lowercase();
                                let ct = attachment_meta.content_type.as_deref();
                                let is_image = ct
                                    .map_or(false, |t| t.starts_with("image/") && t != "image/gif")
                                    || (!filename_lower.ends_with(".gif")
                                        && (filename_lower.ends_with(".png")
                                            || filename_lower.ends_with(".jpg")
                                            || filename_lower.ends_with(".jpeg")
                                            || filename_lower.ends_with(".webp")));

                                if !is_image {
                                    continue;
                                }

                                let attachment_id_str = attachment_meta.id.to_string();
                                let filename_base =
                                    format!("{}_{}", message_id_str, attachment_id_str);
                                let extension = Path::new(&attachment_meta.filename)
                                    .extension()
                                    .and_then(|s| s.to_str())
                                    .unwrap_or("png");
                                let local_filename = format!("{}.{}", filename_base, extension);
                                let relative_path_str = Path::new("cached")
                                    .join(&local_filename)
                                    .to_string_lossy()
                                    .into_owned();
                                let absolute_path = match get_cached_image_dir(&app_clone) {
                                    Ok(dir) => dir.join(&local_filename),
                                    Err(e) => {
                                        error!("Error getting cache dir: {}", e);
                                        attachment_processing_failed = true;
                                        break;
                                    }
                                };

                                let path_exists = {
                                    let path_check = absolute_path.clone();
                                    tokio::task::spawn_blocking(move || path_check.exists())
                                        .await
                                        .unwrap_or(false)
                                };

                                if path_exists {
                                    warn!("Skipping download, file exists: {}", local_filename);
                                    saved_filenames_for_msg.push(relative_path_str.clone());
                                    total_images_saved_or_found += 1;
                                    continue;
                                }

                                let download_url = attachment_meta.url.clone();
                                let download_client_clone = download_client.clone();
                                app_clone
                                    .emit(
                                        "indexing-status",
                                        format!(
                                            "Downloading: {}... ({} indexed)",
                                            attachment_meta.filename, total_images_saved_or_found
                                        ),
                                    )
                                    .unwrap_or_default();

                                match download_client_clone.get(&download_url).send().await {
                                    Ok(response) => {
                                        if response.status().is_success() {
                                            match response.bytes().await {
                                                Ok(image_bytes) => {
                                                    let path_clone = absolute_path.clone();
                                                    let save_result =
                                                        tokio::task::spawn_blocking(move || {
                                                            if let Some(parent) =
                                                                path_clone.parent()
                                                            {
                                                                fs::create_dir_all(parent)?;
                                                            }
                                                            fs::write(&path_clone, &image_bytes)
                                                        })
                                                        .await;

                                                    match save_result {
                                                        Ok(Ok(())) => {
                                                            info!(
                                                                "Saved image: {}",
                                                                local_filename
                                                            );
                                                            saved_filenames_for_msg
                                                                .push(relative_path_str.clone());
                                                            total_images_saved_or_found += 1;
                                                        }
                                                        Ok(Err(e)) => {
                                                            error!(
                                                                "Failed to write file {}: {}",
                                                                local_filename, e
                                                            );
                                                            attachment_processing_failed = true;
                                                            break;
                                                        }
                                                        Err(e) => {
                                                            error!(
                                                                "File write task failed for {}: {}",
                                                                local_filename, e
                                                            );
                                                            attachment_processing_failed = true;
                                                            break;
                                                        }
                                                    }
                                                }
                                                Err(e) => {
                                                    error!(
                                                        "Failed to read bytes from download {}: {}",
                                                        download_url, e
                                                    );
                                                    attachment_processing_failed = true;
                                                    break;
                                                }
                                            }
                                        } else {
                                            error!(
                                                "Download failed for {}: Status {}",
                                                download_url,
                                                response.status()
                                            );
                                        }
                                    }
                                    Err(e) => {
                                        error!(
                                            "Download request failed for {}: {}",
                                            download_url, e
                                        );
                                        attachment_processing_failed = true;
                                        break;
                                    }
                                }
                            }

                            if !attachment_processing_failed && !saved_filenames_for_msg.is_empty()
                            {
                                batch_data_for_db.push((msg.clone(), saved_filenames_for_msg));
                                total_messages_processed_for_db += 1;
                            } else if attachment_processing_failed {
                                error!("Skipping DB insert for message {} due to attachment processing failure.", msg.id);
                                app_clone
                                    .emit(
                                        "indexing-error",
                                        format!(
                                            "Failed to process attachments for message {}",
                                            msg.id
                                        ),
                                    )
                                    .unwrap_or_default();
                            }
                        }

                        if !batch_data_for_db.is_empty() {
                            let db_arc_blocking = db_arc.clone();
                            let app_block = app_clone.clone();
                            let current_batch_size = batch_data_for_db.len();

                            let insert_result = tokio::task::spawn_blocking(move || {
                                 let mut conn_guard = db_arc_blocking.lock().map_err(|_| "DB Lock error".to_string())?; 
                                 let tx = conn_guard.transaction().map_err(|e| format!("Begin Tx: {}", e))?;
                                 {
                                     
                                     let mut stmt = tx.prepare_cached(
                                        "INSERT OR IGNORE INTO messages (message_id, channel_id, author_id, author_name, author_avatar, message_content, attachments, timestamp) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
                                     ).map_err(|e| format!("Prepare Stmt: {}", e))?;

                                     for (msg, filenames) in batch_data_for_db {
                                        
                                          let attachments_json = serde_json::to_string(&filenames).map_err(|e| format!("JSON Serialize: {}", e))?;
                                          stmt.execute(params![
                                               msg.id.to_string(), msg.channel_id.to_string(), msg.author.id.to_string(),
                                               msg.author.name, msg.author.avatar_url(), msg.content,
                                               attachments_json,
                                               msg.timestamp.unix_timestamp(),
                                          ]).map_err(|e| format!("Exec Insert ({}): {}", msg.id, e))?;
                                     }
                                 } 
                                 tx.commit().map_err(|e| format!("Commit Tx: {}", e)) 
                             }).await;

                            // Handle insert result
                            match insert_result {
                                Ok(Ok(())) => {
                                    info!("Successfully inserted batch of {} message(s) into DB for channel {}.", current_batch_size, channel_id);
                                }
                                Ok(Err(e)) => {
                                    error!(
                                        "DB Error inserting batch for channel {}: {}",
                                        channel_id, e
                                    );
                                    app_block
                                        .emit("indexing-error", format!("DB Error: {}", e))
                                        .unwrap_or_default();
                                }
                                Err(e) => {
                                    error!(
                                        "Blocking task failed during DB insert for channel {}: {}",
                                        channel_id, e
                                    );
                                    app_block
                                        .emit("indexing-error", format!("Task Error: {}", e))
                                        .unwrap_or_default();
                                }
                            }
                        }

                        if reached_older_messages {
                            info!("Reached messages older than threshold in channel {}. Stopping fetch.", channel_id);
                            break 'message_loop;
                        }
                    }
                    Err(e) => {
                        error!("Error fetching message batch for {}: {:?}", channel_id, e);
                        app_clone
                            .emit(
                                "indexing-error",
                                format!("Fetch Error {}: {}", channel_id, e),
                            )
                            .unwrap_or_default();
                        if let serenity::Error::Http(http_err) = &e {
                            if http_err.status_code().map_or(false, |c| c.as_u16() == 429) {
                                app_clone
                                    .emit("indexing-status", "Rate limited, waiting...")
                                    .unwrap_or_default();
                                sleep(Duration::from_secs(5)).await;
                                continue;
                            }
                        }
                        break 'message_loop;
                    }
                }
            }
            info!("Finished indexing channel {}", channel_id);
        }

        info!(
            "Background indexing task finished. Metadata Fetched: {}, Messages Processed: {}, Images Saved/Found: {}",
            total_fetched_metadata, total_messages_processed_for_db, total_images_saved_or_found
        );
        app_clone
            .emit(
                "indexing-complete",
                format!(
                    "Indexing finished. {} messages with images processed.",
                    total_messages_processed_for_db
                ),
            )
            .unwrap_or_default();
    });

    Ok(())
}
