use regex::Regex;
use rusqlite::Connection as RusqliteConnection;
use rusqlite::{Connection, Error as RusqliteError, Row};
use serde_json;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard};
use tauri::{AppHandle, Manager, State};

use crate::models::{IndexedMessage, StorageUsage};
use crate::AppConfig;

use base64::{engine::general_purpose::STANDARD as base64_engine, Engine as _};
use mime_guess;

const DB_FILENAME: &str = "showcase_app_data.db";
const CURRENT_SCHEMA_VERSION: i32 = 1;

const SQL_CREATE_SCHEMA_VERSION_TABLE: &str = "
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY NOT NULL
);";

const SQL_CREATE_CONFIG_TABLE: &str = "
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);";

const SQL_CREATE_SHOWCASES_TABLE: &str = "
CREATE TABLE IF NOT EXISTS showcases (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Draft', 
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    last_modified INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    phase INTEGER NOT NULL DEFAULT 1,           
    selected_messages_json TEXT,  
    pptx_path TEXT,              
    images_json TEXT                           
);";

const SQL_CREATE_MESSAGES_TABLE: &str = "
CREATE TABLE IF NOT EXISTS messages (
    message_id TEXT PRIMARY KEY NOT NULL,      
    channel_id TEXT NOT NULL,                  
    author_id TEXT NOT NULL,                   
    author_name TEXT NOT NULL,                 
    author_avatar TEXT,                        
    message_content TEXT NOT NULL,             
    attachments TEXT NOT NULL DEFAULT '[]',   
    timestamp INTEGER NOT NULL                 
);";

const SQL_CREATE_MESSAGES_CHANNEL_INDEX: &str = "
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages (channel_id);";

const SQL_CREATE_MESSAGES_TIMESTAMP_INDEX: &str = "
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp);";

const SQL_CREATE_MESSAGES_AUTHOR_INDEX: &str = "
CREATE INDEX IF NOT EXISTS idx_messages_author_id ON messages (author_id);";

#[derive(Clone)]
pub struct DbConnection(pub Arc<Mutex<RusqliteConnection>>);

fn get_db_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir() 
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    let path = app_data_dir.join(DB_FILENAME);

    if let Some(parent_dir) = path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|e| format!("Failed to create database directory: {}", e))?;
    } else {
        return Err("Failed to determine parent directory for database.".to_string());
    }

    Ok(path)
}

fn parse_create_table_statement(create_sql: &str) -> Result<(String, Vec<(String, String)>), String> {
    let table_name_re = Regex::new(r"CREATE TABLE IF NOT EXISTS (\w+)").unwrap();
    let table_name = match table_name_re.captures(create_sql) {
        Some(caps) => caps.get(1).unwrap().as_str().to_string(),
        None => return Err("Could not extract table name from CREATE TABLE statement".to_string()),
    };
    
    let mut columns = Vec::new();
    
    let columns_re = Regex::new(r"\(\s*([\s\S]+?)\s*\);").unwrap();
    let columns_text = match columns_re.captures(create_sql) {
        Some(caps) => caps.get(1).unwrap().as_str(),
        None => return Err("Could not extract column definitions from CREATE TABLE statement".to_string()),
    };
    
    for line in columns_text.split(',') {
        let line = line.trim();
        if line.starts_with("PRIMARY KEY") || line.starts_with("FOREIGN KEY") || line.is_empty() {
            continue;
        }
        
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let column_name = parts[0].to_string();
            let column_def = parts[1..].join(" ");
            
            columns.push((column_name, column_def));
        }
    }
    
    Ok((table_name, columns))
}

fn get_existing_tables(conn: &Connection) -> Result<Vec<String>, String> {
    let mut stmt = conn.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).map_err(|e| format!("Failed to prepare query for existing tables: {}", e))?;
    
    let tables = stmt.query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to query existing tables: {}", e))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("Error processing table names: {}", e))?;
    
    Ok(tables)
}

fn get_existing_columns(conn: &Connection, table_name: &str) -> Result<HashMap<String, String>, String> {
    let mut stmt = conn.prepare(&format!(
        "PRAGMA table_info({})", table_name
    )).map_err(|e| format!("Failed to prepare query for columns of {}: {}", table_name, e))?;
    
    let columns = stmt.query_map([], |row| {
        let name: String = row.get(1)?;
        let type_name: String = row.get(2)?;
        let notnull: bool = row.get(3)?;
        let dflt_value: Option<String> = row.get(4)?;
        let pk: bool = row.get(5)?;
        
        let mut def = type_name;
        if pk {
            def += " PRIMARY KEY";
        }
        if notnull {
            def += " NOT NULL";
        }
        if let Some(default) = dflt_value {
            def += &format!(" DEFAULT {}", default);
        }
        
        Ok((name, def))
    })
    .map_err(|e| format!("Failed to query columns for {}: {}", table_name, e))?
    .collect::<Result<HashMap<String, String>, _>>()
    .map_err(|e| format!("Error processing column info: {}", e))?;
    
    Ok(columns)
}

fn update_database_schema(conn: &mut Connection) -> Result<(), String> {
    println!("Starting dynamic schema analysis and update...");
    
    let tx = conn.transaction()
        .map_err(|e| format!("Failed to start schema update transaction: {}", e))?;

    let table_definitions = vec![
        SQL_CREATE_CONFIG_TABLE,
        SQL_CREATE_SHOWCASES_TABLE, 
        SQL_CREATE_MESSAGES_TABLE
    ];
    
    let existing_tables = get_existing_tables(&tx)?;
    println!("Existing tables: {:?}", existing_tables);
    
    for create_sql in table_definitions {
        let (table_name, expected_columns) = parse_create_table_statement(create_sql)?;
        
        if !existing_tables.contains(&table_name) {
            println!("Creating missing table: {}", table_name);
            tx.execute(create_sql, [])
                .map_err(|e| format!("Failed to create table {}: {}", table_name, e))?;
        } else {
            let existing_columns = get_existing_columns(&tx, &table_name)?;
            
            for (col_name, col_def) in &expected_columns {
                if !existing_columns.contains_key(col_name) {
                    println!("Adding missing column: {}.{}", table_name, col_name);

                    let simple_def = if col_def.contains("PRIMARY KEY") {
                        col_def.replace("PRIMARY KEY", "").trim().to_string()
                    } else {
                        col_def.clone()
                    };
                    
                    let alter_sql = format!("ALTER TABLE {} ADD COLUMN {} {}", 
                                           table_name, col_name, simple_def);
                    
                    tx.execute(&alter_sql, [])
                        .map_err(|e| format!("Failed to add column {}.{}: {}", 
                                            table_name, col_name, e))?;
                }
            }
        }
    }
    
    let index_definitions = vec![
        SQL_CREATE_MESSAGES_CHANNEL_INDEX,
        SQL_CREATE_MESSAGES_TIMESTAMP_INDEX,
        SQL_CREATE_MESSAGES_AUTHOR_INDEX
    ];
    
    for index_sql in index_definitions {
        tx.execute(index_sql, [])
            .map_err(|e| format!("Failed to create index: {}", e))?;
    }
    
    set_schema_version(&tx, CURRENT_SCHEMA_VERSION)?;
    
    tx.commit()
        .map_err(|e| format!("Failed to commit schema updates: {}", e))?;
    
    println!("Dynamic schema update completed successfully.");
    Ok(())
}

fn get_schema_version(conn: &Connection) -> Result<i32, String> {
    let table_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_version')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check if schema_version table exists: {}", e))?;
    
    if !table_exists {
        return Ok(0);
    }
    
    match conn.query_row("SELECT version FROM schema_version LIMIT 1", [], |row| {
        row.get::<_, i32>(0)
    }) {
        Ok(version) => Ok(version),
        Err(RusqliteError::QueryReturnedNoRows) => Ok(0),
        Err(e) => Err(format!("Failed to get schema version: {}", e)),
    }
}

// Sets the schema version in the database
fn set_schema_version(conn: &Connection, version: i32) -> Result<(), String> {
    conn.execute("DELETE FROM schema_version", [])
        .map_err(|e| format!("Failed to clear schema_version table: {}", e))?;
        
    conn.execute("INSERT INTO schema_version (version) VALUES (?1)", [version])
        .map_err(|e| format!("Failed to update schema version to {}: {}", version, e))?;
        
    Ok(())
}

pub fn initialize_database(app_handle: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app_handle)?;
    println!("Database path: {}", db_path.display());
    
    let is_new_database = !db_path.exists();
    println!("Database exists: {}", !is_new_database);

    let mut conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database connection: {}", e))?;
    
    println!("Database connection opened successfully.");

    conn.query_row("PRAGMA journal_mode=WAL;", [], |_| Ok(()))
        .map_err(|e| format!("Failed to set journal_mode=WAL: {}", e))?;

    conn.execute("PRAGMA foreign_keys=ON;", [])
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;
    println!("Enabled foreign keys.");

    conn.execute("PRAGMA synchronous=NORMAL;", [])
        .map_err(|e| format!("Failed to set synchronous=NORMAL: {}", e))?;
    println!("Set synchronous=NORMAL.");

    println!("Applied PRAGMAs.");

    if is_new_database {
        println!("Setting up new database...");
        
        conn.execute(SQL_CREATE_SCHEMA_VERSION_TABLE, [])
            .map_err(|e| format!("Failed to create schema_version table: {}", e))?;
        
        let tx = conn.transaction()
            .map_err(|e| format!("Failed to start schema transaction: {}", e))?;

        println!("Starting schema creation transaction...");

        tx.execute(SQL_CREATE_CONFIG_TABLE, [])
            .map_err(|e| format!("Failed to create config table: {}", e))?;
        println!("Created config table.");

        tx.execute(SQL_CREATE_SHOWCASES_TABLE, [])
            .map_err(|e| format!("Failed to create showcases table: {}", e))?;
        println!("Created showcases table.");

        tx.execute(SQL_CREATE_MESSAGES_TABLE, [])
            .map_err(|e| format!("Failed to create messages table: {}", e))?;
        println!("Created messages table.");

        // Create indexes
        tx.execute(SQL_CREATE_MESSAGES_CHANNEL_INDEX, [])
            .map_err(|e| format!("Failed to create messages channel index: {}", e))?;
        tx.execute(SQL_CREATE_MESSAGES_TIMESTAMP_INDEX, [])
            .map_err(|e| format!("Failed to create messages timestamp index: {}", e))?;
        tx.execute(SQL_CREATE_MESSAGES_AUTHOR_INDEX, [])
            .map_err(|e| format!("Failed to create messages author index: {}", e))?;
        println!("Created messages indexes.");

        set_schema_version(&tx, CURRENT_SCHEMA_VERSION)?;

        tx.commit()
            .map_err(|e| format!("Failed to commit schema transaction: {}", e))?;
        
        println!("New database schema created with version {}", CURRENT_SCHEMA_VERSION);
    } 
    else {
        println!("Existing database found, checking schema version...");
        
        conn.execute(SQL_CREATE_SCHEMA_VERSION_TABLE, [])
            .map_err(|e| format!("Failed to create schema_version table: {}", e))?;
        
        let current_version = get_schema_version(&conn)?;
        println!("Current database schema version: {}", current_version);
        
        if current_version < CURRENT_SCHEMA_VERSION {
            println!("Database schema needs update from version {} to {}", 
                     current_version, CURRENT_SCHEMA_VERSION);
            update_database_schema(&mut conn)?;
        } else if current_version > CURRENT_SCHEMA_VERSION {
            return Err(format!(
                "Database schema version {} is newer than application version {}. Please update the application.", 
                current_version, CURRENT_SCHEMA_VERSION
            ));
        } else {
            println!("Database schema is already at current version {}", CURRENT_SCHEMA_VERSION);
        }
    }

    println!("Database schema initialized successfully.");
    Ok(conn)
}

pub fn retrieve_config(conn_guard: &MutexGuard<Connection>) -> Result<AppConfig, String> {
    println!("Executing retrieve_config_logic...");
    let mut stmt = conn_guard
        .prepare("SELECT key, value FROM config;")
        .map_err(|e| format!("Failed to prepare config query: {}", e))?;

    let config_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?, // key
                row.get::<_, String>(1)?, // value
            ))
        })
        .map_err(|e| format!("Failed to query configuration: {}", e))?;

    let mut config = AppConfig::default();

    for row_result in config_iter {
        match row_result {
            Ok((key, value)) => {
                match key.as_str() {
                    "selected_server_id" => config.selected_server_id = Some(value),
                    "selected_channel_ids" => {
                        config.selected_channel_ids = serde_json::from_str(&value).unwrap_or_else(|e| {
                           eprintln!("Failed to deserialize channel IDs: {}, defaulting to empty. Value was: '{}'", e, value);
                           Vec::new()
                       });
                    }
                    "is_setup_complete" => {
                        config.is_setup_complete = value == "true";
                    }
                    _ => {} 
                }
            }
            Err(e) => {
                eprintln!("Error processing config row: {}", e);
            }
        }
    }
    println!("retrieve_config_logic finished successfully.");
    Ok(config)
}

fn map_row_to_indexed_message(row: &Row) -> Result<IndexedMessage, RusqliteError> {
    // 0: message_id, 1: channel_id, 2: author_id, 3: author_name,
    // 4: author_avatar, 5: message_content, 6: attachments (JSON array of strings), 7: timestamp
    let attachments_json_opt: Option<String> = row.get(6)?;

    let attachments: Vec<String> = match attachments_json_opt {
        Some(json_str) if !json_str.is_empty() && json_str != "null" => {
            serde_json::from_str(&json_str).map_err(|e| {
                eprintln!(
                    "Failed to deserialize attachments JSON (expected array of strings) for message_id {:?}: {}. JSON: '{}'",
                    row.get::<_, String>(0).ok(), 
                    e,
                    json_str
                );
                RusqliteError::FromSqlConversionFailure(
                    6, 
                    rusqlite::types::Type::Text, 
                    Box::new(e),
                )
            })?
        },
        _ => Vec::new(),
    };

    Ok(IndexedMessage {
        message_id: row.get(0)?,
        channel_id: row.get(1)?,
        author_id: row.get(2)?,
        author_name: row.get(3)?,
        author_avatar: row.get(4)?,
        message_content: row.get(5)?,
        attachments,
        timestamp: row.get(7)?,
    })
}

#[tauri::command]
pub async fn get_indexed_messages(
    db_state: State<'_, DbConnection>,
) -> Result<Vec<IndexedMessage>, String> {
    println!("Fetching all indexed messages from DB...");
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn_guard.prepare(
        "SELECT message_id, channel_id, author_id, author_name, author_avatar, message_content, attachments, timestamp FROM messages ORDER BY timestamp DESC"
    ).map_err(|e| format!("Failed to prepare message query: {}", e))?;

    let message_iter = stmt
        .query_map([], map_row_to_indexed_message)
        .map_err(|e| format!("Failed to query indexed messages: {}", e))?;

    let messages = message_iter
        .collect::<Result<Vec<IndexedMessage>, _>>()
        .map_err(|e| format!("Error processing message row: {}", e))?;

    println!("Successfully fetched {} indexed messages.", messages.len());
    Ok(messages)
}

fn calculate_dir_size(path: &Path) -> Result<u64, std::io::Error> {
    let mut total_size = 0;
    if path.is_dir() {
        for entry_result in fs::read_dir(path)? {
            let entry = entry_result?;
            let entry_path = entry.path();
            if entry_path.is_dir() {
                total_size += calculate_dir_size(&entry_path)?;
            } else {
                total_size += entry.metadata()?.len();
            }
        }
    } else {}
    Ok(total_size)
}

#[tauri::command]
pub async fn get_storage_usage(app_handle: AppHandle) -> Result<StorageUsage, String> {
    println!("Calculating storage usage...");

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let db_path = app_data_dir.join(DB_FILENAME);
    let database_size_bytes = match fs::metadata(&db_path) {
        Ok(metadata) => {
            if metadata.is_file() {
                metadata.len()
            } else {
                eprintln!(
                    "Warning: Expected database file, but found directory or other at {}",
                    db_path.display()
                );
                0
            }
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            println!("Database file not found at {}", db_path.display());
            0
        }
        Err(e) => {
            return Err(format!("Failed to get database file metadata: {}", e));
        }
    };
    println!("Database size: {} bytes", database_size_bytes);

    let image_cache_dir = app_data_dir.join("images").join("cached");
    let image_cache_size_bytes = if image_cache_dir.is_dir() {
        match calculate_dir_size(&image_cache_dir) {
            Ok(size) => size,
            Err(e) => {
                eprintln!(
                    "Warning: Failed to calculate image cache directory size: {}",
                    e
                );
                0
            }
        }
    } else {
        println!(
            "Image cache directory not found at {}",
            image_cache_dir.display()
        );
        0
    };
    println!("Image Cache size: {} bytes", image_cache_size_bytes);

    let total_size_bytes = database_size_bytes + image_cache_size_bytes;
    let usage = StorageUsage {
        database_size_bytes,
        image_cache_size_bytes,
        total_size_bytes,
        database_path: db_path.to_string_lossy().to_string(),
    };

    println!("Total storage usage calculated.");
    Ok(usage)
}

fn get_image_base_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data_dir.join("images")) 
}

#[tauri::command]
pub async fn get_cached_image_data(
    app_handle: AppHandle,
    relative_path: String,
) -> Result<String, String> {
    println!("Fetching image data for relative path: {}", relative_path);

    if relative_path.contains("..")
        || relative_path.starts_with('/')
        || relative_path.starts_with('\\')
    {
        return Err("Invalid relative path provided.".to_string());
    }

    let base_dir = get_image_base_dir(&app_handle)?;
    let file_path = base_dir.join(&relative_path);

    println!("Attempting to read image file: {}", file_path.display());

    match fs::read(&file_path) {
        Ok(bytes) => {
            let mime_type =
                mime_guess::from_path(&file_path).first_or("image/png".parse().unwrap());

            let base64_str = base64_engine.encode(&bytes);

            let data_uri = format!("data:{};base64,{}", mime_type.essence_str(), base64_str);

            println!("Successfully read and encoded image: {}", relative_path);
            Ok(data_uri)
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            eprintln!("Image file not found: {}", file_path.display());
            Err(format!("Image not found: {}", relative_path))
        }
        Err(e) => {
            eprintln!("Failed to read image file {}: {}", file_path.display(), e);
            Err(format!("Failed to read image file: {}", e))
        }
    }
}
