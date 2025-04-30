use crate::models::{SelectedMessage, Showcase, ShowcaseImage, UpdateShowcasePayload};
use crate::sqlite_manager::DbConnection;
use base64::{engine::general_purpose::STANDARD as base64_engine, Engine as _};
use chrono::Utc;
use rusqlite::{params, types::Value as RusqliteValue, Error as RusqliteError, Row};
use serde::Deserialize;
use serde_json;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

fn get_showcase_image_dir(app_handle: &AppHandle, showcase_id: &str) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data_dir.join("images").join(showcase_id))
}

fn get_showcase_presentation_dir(
    app_handle: &AppHandle,
    showcase_id: &str,
) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data_dir.join("presentations").join(showcase_id))
}

fn decode_base64_image(data_uri: &str) -> Result<(Vec<u8>, String), String> {
    let prefix = data_uri
        .splitn(2, ',')
        .next()
        .ok_or_else(|| "Invalid Data URI format (missing comma)".to_string())?;
    let data = data_uri
        .splitn(2, ',')
        .nth(1)
        .ok_or_else(|| "Invalid Data URI format (missing data)".to_string())?;

    let mime_type = prefix
        .splitn(2, ';')
        .next()
        .and_then(|p| p.strip_prefix("data:"))
        .ok_or_else(|| "Invalid Data URI format (missing 'data:' or ';')".to_string())?;

    // Determine extension
    let extension = match mime_type {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => return Err(format!("Unsupported image MIME type: {}", mime_type)),
    };

    let bytes = base64_engine
        .decode(data)
        .map_err(|e| format!("Base64 decoding failed: {}", e))?;

    Ok((bytes, extension.to_string()))
}

fn map_row_to_showcase(row: &Row) -> Result<Showcase, RusqliteError> {
    fn parse_json_col<T: for<'de> Deserialize<'de>>(
        row: &Row,
        idx: usize,
        col_name: &str,
    ) -> Result<Option<T>, RusqliteError> {
        let raw: Option<String> = row.get(idx)?;
        if let Some(ref s) = raw {
            if !s.trim().is_empty() && s.trim() != "null" {
                return serde_json::from_str(s).map(Some).map_err(|e| {
                    eprintln!("❌ JSON parse error in column `{}`: {}", col_name, e);
                    RusqliteError::FromSqlConversionFailure(
                        idx,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                });
            }
        }
        Ok(None)
    }

    Ok(Showcase {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        status: row.get(3)?,
        created_at: row.get(4)?,
        last_modified: row.get(5)?,
        phase: row.get(6)?,
        selected_messages: parse_json_col(row, 7, "selected_messages_json")?,
        pptx_path: row.get(8)?,
        images: parse_json_col(row, 9, "images_json")?,
    })
}

#[tauri::command]
pub async fn create_showcase(
    title: String,
    description: Option<String>,
    db_state: State<'_, DbConnection>,
) -> Result<String, String> {
    println!("Attempting to create showcase: title='{}'", title);
    let new_id = Uuid::new_v4().to_string();
    let current_ts = Utc::now().timestamp();
    let status_val = "Draft";
    let initial_phase = 1;

    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let result = conn_guard.execute(
        "INSERT INTO showcases (id, title, description, status, created_at, last_modified, phase, selected_messages_json, images_json, pptx_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, NULL, NULL)",
        params![
            &new_id, &title, &description, status_val,
            current_ts, current_ts, initial_phase
        ],
    );

    match result {
        Ok(rows_affected) if rows_affected > 0 => {
            println!("Showcase created successfully with ID: {}", new_id);
            Ok(new_id)
        }
        Ok(_) => Err("Failed to create showcase (0 rows affected). Check constraints.".to_string()),
        Err(e) => {
            eprintln!("Error creating showcase: {}", e);
            Err(format!("Database error creating showcase: {}", e))
        }
    }
}

#[tauri::command]
pub async fn update_showcase_phase(
    id: String,
    phase: i32,
    db_state: State<'_, DbConnection>,
) -> Result<(), String> {
    println!("Updating phase for showcase ID: {} to {}", id, phase);
    if !(1..=4).contains(&phase) {
        return Err("Invalid phase value provided (must be 1-4).".to_string());
    }
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    let current_ts = Utc::now().timestamp();
    let rows = conn_guard
        .execute(
            "UPDATE showcases SET phase = ?1, last_modified = ?2 WHERE id = ?3",
            params![phase, current_ts, &id],
        )
        .map_err(|e| format!("DB error updating phase: {}", e))?;

    if rows == 0 {
        Err(format!("Showcase ID '{}' not found for phase update.", id))
    } else {
        println!("Phase updated successfully for showcase ID: {}", id);
        Ok(())
    }
}

#[tauri::command]
pub async fn save_selected_messages(
    id: String,
    selected_messages: Vec<SelectedMessage>,
    db_state: State<'_, DbConnection>,
) -> Result<(), String> {
    println!("Saving selected messages for showcase ID: {}", id);
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let json_data = serde_json::to_string(&selected_messages)
        .map_err(|e| format!("Failed to serialize selected messages: {}", e))?;

    let current_ts = Utc::now().timestamp();
    let next_phase = 2;

    let rows = conn_guard.execute(
        "UPDATE showcases SET selected_messages_json = ?1, phase = ?2, last_modified = ?3 WHERE id = ?4",
        params![json_data, next_phase, current_ts, &id]
    ).map_err(|e| format!("DB error saving selected messages: {}", e))?;

    if rows == 0 {
        Err(format!(
            "Showcase ID '{}' not found for saving selected messages.",
            id
        ))
    } else {
        println!(
            "Selected messages saved and phase updated to {} for showcase ID: {}",
            next_phase, id
        );
        Ok(())
    }
}

#[tauri::command]
pub async fn get_selected_messages(
    id: String,
    db_state: State<'_, DbConnection>,
) -> Result<Vec<SelectedMessage>, String> {
    println!("Getting selected messages for showcase ID: {}", id);
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let result = conn_guard.query_row(
        "SELECT selected_messages_json FROM showcases WHERE id = ?1",
        params![&id],
        |row| row.get::<_, Option<String>>(0),
    );

    match result {
        Ok(Some(json_data)) => {
            if json_data.is_empty() || json_data == "null" {
                Ok(Vec::new())
            } else {
                serde_json::from_str(&json_data)
                    .map_err(|e| format!("Failed to parse selected messages JSON: {}", e))
            }
        }
        Ok(None) => Ok(Vec::new()),
        Err(RusqliteError::QueryReturnedNoRows) => Err(format!("Showcase ID '{}' not found.", id)),
        Err(e) => Err(format!("DB error getting selected messages: {}", e)),
    }
}

#[tauri::command]
pub async fn upload_showcase_image(
    app_handle: AppHandle,
    id: String,
    image_metadata: ShowcaseImage,
    image_data_uri: String,
    db_state: State<'_, DbConnection>,
) -> Result<(), String> {
    println!(
        "Uploading image for showcase ID: {}, message ID: {}",
        id, image_metadata.message_id
    );

    let (image_bytes, extension) = decode_base64_image(&image_data_uri)?;

    let image_dir = get_showcase_image_dir(&app_handle, &id)?;
    // Filename format: <showcase_id>_<message_id>.<ext>
    let filename = format!("{}_{}.{}", id, image_metadata.message_id, extension);
    let file_path = image_dir.join(&filename);

    print!("{}", image_metadata.overlay.width);

    let file_path_clone = file_path.clone();
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        if let Some(parent) = file_path_clone.parent() {
            fs::create_dir_all(parent).map_err(|e| {
                format!(
                    "Failed to create image directory '{}': {}",
                    parent.display(),
                    e
                )
            })?;
        }
        fs::write(&file_path_clone, &image_bytes).map_err(|e| {
            format!(
                "Failed to write image file '{}': {}",
                file_path_clone.display(),
                e
            )
        })?;
        println!(
            "Image file saved successfully: {}",
            file_path_clone.display()
        );
        Ok(())
    })
    .await
    .map_err(|e| format!("File saving task panicked or was cancelled: {}", e))??;

    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let current_images: Vec<ShowcaseImage> = conn_guard
        .query_row(
            "SELECT images_json FROM showcases WHERE id = ?1",
            params![&id],
            |row| {
                let json_opt: Option<String> = row.get(0)?;
                match json_opt {
                    Some(json_str) if !json_str.is_empty() && json_str != "null" => {
                        serde_json::from_str(&json_str).map_err(|e| {
                            RusqliteError::FromSqlConversionFailure(
                                0,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })
                    }
                    _ => Ok(Vec::new()),
                }
            },
        )
        .unwrap_or_else(|_| Vec::new());

    let mut updated_images: Vec<ShowcaseImage> = current_images;

    let existing_index = updated_images
        .iter()
        .position(|img| img.message_id == image_metadata.message_id);

    if let Some(index) = existing_index {
        updated_images[index] = image_metadata.clone();
        println!(
            "Replaced existing image for message ID: {} in showcase ID: {}",
            image_metadata.message_id, id
        );
    } else {
        updated_images.push(image_metadata.clone());
        println!(
            "Added new image for message ID: {} to showcase ID: {}",
            image_metadata.message_id, id
        );
    }

    let images_json = serde_json::to_string(&updated_images)
        .map_err(|e| format!("Failed to serialize images metadata: {}", e))?;

    let current_ts = Utc::now().timestamp();
    conn_guard
        .execute(
            "UPDATE showcases SET images_json = ?1, last_modified = ?2 WHERE id = ?3",
            params![images_json, current_ts, &id],
        )
        .map_err(|e| format!("DB error updating images after upload: {}", e))?;

    println!(
        "Images metadata and timestamp updated for showcase ID: {} after image upload.",
        id
    );

    Ok(())
}

#[tauri::command]
pub async fn get_showcase_images(
    id: String,
    db_state: State<'_, DbConnection>,
) -> Result<Vec<ShowcaseImage>, String> {
    println!("Getting showcase images for showcase ID: {}", id);
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let result = conn_guard.query_row(
        "SELECT images_json FROM showcases WHERE id = ?1",
        params![&id],
        |row| row.get::<_, Option<String>>(0),
    );

    match result {
        Ok(Some(json_data)) => {
            if json_data.is_empty() || json_data == "null" {
                Ok(Vec::new())
            } else {
                serde_json::from_str(&json_data)
                    .map_err(|e| format!("Failed to parse showcase images JSON: {}", e))
            }
        }
        Ok(None) => Ok(Vec::new()),
        Err(RusqliteError::QueryReturnedNoRows) => Err(format!("Showcase ID '{}' not found.", id)),
        Err(e) => Err(format!("DB error getting showcase images: {}", e)),
    }
}

#[tauri::command]
pub async fn sort_showcase_images(
    id: String,
    sorted_images: Vec<ShowcaseImage>,
    db_state: State<'_, DbConnection>,
) -> Result<(), String> {
    println!(
        "Saving final sorted images metadata for showcase ID: {}",
        id
    );
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let final_images_json = serde_json::to_string(&sorted_images)
        .map_err(|e| format!("Failed to serialize final images metadata: {}", e))?;

    let current_ts = Utc::now().timestamp();
    let final_phase = 4;

    let rows = conn_guard
        .execute(
            "UPDATE showcases SET images_json = ?1, phase = ?2, last_modified = ?3 WHERE id = ?4",
            params![final_images_json, final_phase, current_ts, &id],
        )
        .map_err(|e| format!("DB error saving final sorted images metadata: {}", e))?;

    if rows == 0 {
        Err(format!(
            "Showcase ID '{}' not found for final image sort save.",
            id
        ))
    } else {
        println!(
            "Final images metadata saved and phase updated to {} for showcase ID: {}",
            final_phase, id
        );
        Ok(())
    }
}

#[tauri::command]
pub async fn get_showcase(
    id: String,
    db_state: State<'_, DbConnection>,
) -> Result<Showcase, String> {
    println!("Attempting to get showcase with ID: {}", id);
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    let result = conn_guard.query_row(
        "SELECT id, title, description, status, created_at, last_modified, phase, selected_messages_json, pptx_path, images_json FROM showcases WHERE id = ?1",
        params![&id],
        map_row_to_showcase,
    );

    if let Ok(ref showcase) = result {
        println!("Showcase images_json: {:?}", showcase.images);
    }

    match result {
        Ok(showcase) => Ok(showcase),
        Err(RusqliteError::QueryReturnedNoRows) => {
            Err(format!("Showcase with ID '{}' not found.", id))
        }
        Err(e) => Err(format!(
            "Database error fetching showcase (check logs for JSON errors): {}",
            e
        )),
    }
}

#[tauri::command]
pub async fn list_showcases(db_state: State<'_, DbConnection>) -> Result<Vec<Showcase>, String> {
    println!("Attempting to list all showcases...");
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    let mut stmt = conn_guard.prepare(
        "SELECT id, title, description, status, created_at, last_modified, phase, selected_messages_json, pptx_path, images_json FROM showcases ORDER BY last_modified DESC"
    ).map_err(|e| format!("Failed to prepare list query: {}", e))?;
    let showcase_iter = stmt
        .query_map([], map_row_to_showcase)
        .map_err(|e| format!("Failed to query showcases: {}", e))?;
    let showcases = showcase_iter
        .collect::<Result<Vec<Showcase>, _>>()
        .map_err(|e| format!("Error processing showcase row during list: {}", e))?;
    println!("Found {} showcases.", showcases.len());
    Ok(showcases)
}

#[tauri::command]
pub async fn delete_showcase(
    app_handle: AppHandle,
    id: String,
    db_state: State<'_, DbConnection>,
) -> Result<(), String> {
    println!("Attempting to delete showcase with ID: {}", id);

    let image_dir = get_showcase_image_dir(&app_handle, &id)?;
    if image_dir.exists() {
        println!("Deleting image directory: {}", image_dir.display());
        let image_dir_for_task = image_dir.clone();
        tokio::task::spawn_blocking(move || fs::remove_dir_all(&image_dir_for_task))
            .await
            .map_err(|e| format!("Image directory deletion task failed: {}", e))?
            .map_err(|e: std::io::Error| {
                format!(
                    "Failed to delete image directory '{}': {}",
                    image_dir.display(),
                    e
                )
            })?;
    } else {
        println!(
            "Image directory not found, skipping deletion: {}",
            image_dir.display()
        );
    }

    let presentation_dir = get_showcase_presentation_dir(&app_handle, &id)?;
    if presentation_dir.exists() {
        println!(
            "Deleting presentation directory: {}",
            presentation_dir.display()
        );
        let presentation_dir_for_task = presentation_dir.clone();
        tokio::task::spawn_blocking(move || fs::remove_dir_all(&presentation_dir_for_task))
            .await
            .map_err(|e| format!("Presentation directory deletion task failed: {}", e))?
            .map_err(|e: std::io::Error| {
                format!(
                    "Failed to delete presentation directory '{}': {}",
                    presentation_dir.display(),
                    e
                )
            })?;
    } else {
        println!(
            "Presentation directory not found, skipping deletion: {}",
            presentation_dir.display()
        );
    }

    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    let rows_affected = conn_guard
        .execute("DELETE FROM showcases WHERE id = ?1", params![&id])
        .map_err(|e| format!("Database error deleting showcase row: {}", e))?;

    if rows_affected > 0 {
        println!("Showcase row deleted successfully: {}", id);
        Ok(())
    } else {
        println!(
            "Showcase row with ID '{}' not found for deletion (or already deleted).",
            id
        );
        Ok(())
    }
}

#[tauri::command]
pub async fn update_showcase(
    id: String,
    payload: UpdateShowcasePayload,
    db_state: State<'_, DbConnection>,
) -> Result<(), String> {
    println!(
        "Attempting to update showcase (basic info only) ID: {}, Payload: {:?}",
        id, payload
    );
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let mut set_parts: Vec<String> = Vec::new();
    let mut params_list: Vec<RusqliteValue> = Vec::new();

    if let Some(title) = payload.title {
        set_parts.push("title = ?".to_string());
        params_list.push(title.into());
    }
    if let Some(description) = payload.description {
        set_parts.push("description = ?".to_string());
        params_list.push(description.into());
    }
    if let Some(status) = payload.status {
        set_parts.push("status = ?".to_string());
        params_list.push(status.into());
    }

    if set_parts.is_empty() {
        println!("No basic showcase data provided for update. Skipping.");
        return Ok(());
    }

    set_parts.push("last_modified = ?".to_string());
    params_list.push(Utc::now().timestamp().into());

    params_list.push(id.clone().into());

    let sql = format!(
        "UPDATE showcases SET {} WHERE id = ?{}",
        set_parts.join(", "),
        params_list.len()
    );

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_list
        .iter()
        .map(|v| v as &dyn rusqlite::ToSql)
        .collect();

    println!("Executing basic update SQL: {}", sql);
    let rows_affected = conn_guard
        .execute(&sql, params_refs.as_slice())
        .map_err(|e| format!("Database error updating showcase basic info: {}", e))?;

    if rows_affected == 0 {
        return Err(format!(
            "Update failed: Showcase with ID '{}' not found or not updated.",
            id
        ));
    }
    println!("Showcase basic info updated successfully: {}", id);
    Ok(())
}

#[tauri::command]
pub async fn save_showcase_pptx(
    app_handle: AppHandle,
    id: String,
    _title: String,
    pptx_base64: String,
    db_state: State<'_, DbConnection>,
) -> Result<String, String> {
    println!("Saving PPTX for showcase ID: {}", id);

    let pptx_bytes = base64_engine
        .decode(pptx_base64)
        .map_err(|e| format!("Failed to decode base64 PPTX data: {}", e))?;

    let presentation_dir = get_showcase_presentation_dir(&app_handle, &id)?;
    if let Some(parent) = presentation_dir.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            format!(
                "Failed to create presentation directory '{}': {}",
                parent.display(),
                e
            )
        })?;
    }

    fs::create_dir_all(&presentation_dir).map_err(|e| {
        format!(
            "Failed to create showcase presentation directory '{}': {}",
            presentation_dir.display(),
            e
        )
    })?;

    let filename = format!("showcase_{}.pptx", id);
    let file_path = presentation_dir.join(&filename);

    let file_path_clone = file_path.clone();
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let mut file = std::fs::File::create(&file_path_clone).map_err(|e| {
            format!(
                "Failed to create PPTX file '{}': {}",
                file_path_clone.display(),
                e
            )
        })?;

        file.write_all(&pptx_bytes).map_err(|e| {
            format!(
                "Failed to write PPTX file '{}': {}",
                file_path_clone.display(),
                e
            )
        })?;

        println!(
            "PPTX file saved successfully: {}",
            file_path_clone.display()
        );
        Ok(())
    })
    .await
    .map_err(|e| format!("File saving task panicked or was cancelled: {}", e))??;

    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let pptx_relative_path = format!("presentations/{}/{}", id, &filename);
    let current_ts = Utc::now().timestamp();
    let final_phase = 4;

    conn_guard
        .execute(
            "UPDATE showcases SET pptx_path = ?1, phase = ?2, last_modified = ?3 WHERE id = ?4",
            params![pptx_relative_path, final_phase, current_ts, &id],
        )
        .map_err(|e| format!("DB error updating showcase with PPTX path: {}", e))?;

    println!(
        "Showcase updated with PPTX path and set to final phase {} for ID: {}",
        final_phase, id
    );

    Ok(pptx_relative_path)
}

#[tauri::command]
pub async fn open_showcase_pptx(
    app_handle: AppHandle,
    id: String,
    db_state: State<'_, DbConnection>,
) -> Result<String, String> {
    println!("Opening PPTX for showcase ID: {}", id);

    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let pptx_path: String = conn_guard
        .query_row(
            "SELECT pptx_path FROM showcases WHERE id = ?1",
            params![&id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to query PPTX path: {}", e))?;

    if pptx_path.is_empty() {
        return Err("No PPTX file found for this showcase".to_string());
    }

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let file_path = app_data_dir.join(&pptx_path);

    if !file_path.exists() {
        return Err(format!("PPTX file not found at {}", file_path.display()));
    }
    Ok(file_path.display().to_string())
}

#[tauri::command]
pub async fn check_showcase_pptx_exists(
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<bool, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    let presentation_dir = app_data_dir.join("presentations");
    let pptx_path = presentation_dir.join(format!("{}/showcase_{}.pptx", id, id));

    println!("Checking if PPTX exists at: {}", pptx_path.display());

    let exists = pptx_path.exists();
    println!("File exists: {}", exists);

    Ok(exists)
}
