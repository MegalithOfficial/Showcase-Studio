use chrono::Local;
use log::{Level, LevelFilter, Metadata, Record};
use once_cell::sync::Lazy;
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write, Read};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use zip::write::{FileOptions, ZipWriter};
use zip::CompressionMethod;
use tauri::AppHandle;
use tauri::Manager;

static BACKEND_LOG_FILE_HANDLER: Lazy<Mutex<Option<LogFileHandler>>> = Lazy::new(|| Mutex::new(None));
static FRONTEND_LOG_FILE_HANDLER: Lazy<Mutex<Option<LogFileHandler>>> = Lazy::new(|| Mutex::new(None));

struct CustomLogger;

struct LogFileHandler { 
    file: File,
    log_path: PathBuf,
}

#[macro_export]
macro_rules! function_path {
    () => {{
        fn f() {}
        fn type_name_of<T>(_: &T) -> &'static str {
            std::any::type_name::<T>()
        }

        let name = type_name_of(&f);
        let parts: Vec<&str> = name.split("::").collect();

        if parts.len() > 2 {
            let mut fn_name = parts[parts.len() - 2];

            if fn_name.contains("{{closure}}") {
                if parts.len() > 3 {
                    fn_name = parts[parts.len() - 3];
                }
            }

            fn_name
        } else {
            "unknown"
        }
    }};
}

#[macro_export]
macro_rules! log_info {
    ($($arg:tt)*) => {
        log::info!(target: &format!("{}::{}", module_path!(), $crate::function_path!()), $($arg)*)
    };
}

#[macro_export]
macro_rules! log_warn {
    ($($arg:tt)*) => {
        log::warn!(target: &format!("{}::{}", module_path!(), $crate::function_path!()), $($arg)*)
    };
}

#[macro_export]
macro_rules! log_error {
    ($($arg:tt)*) => {
        log::error!(target: &format!("{}::{}", module_path!(), $crate::function_path!()), $($arg)*)
    };
}

#[macro_export]
macro_rules! log_debug {
    ($($arg:tt)*) => {
        log::debug!(target: &format!("{}::{}", module_path!(), $crate::function_path!()), $($arg)*)
    };
}

impl log::Log for CustomLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= Level::Info
    }

    fn log(&self, record: &Record) {
        if self.enabled(record.metadata()) {
            let level_color = match record.level() {
                Level::Error => "\x1B[31m", // Red
                Level::Warn => "\x1B[33m",  // Yellow
                Level::Info => "\x1B[32m",  // Green
                Level::Debug => "\x1B[34m", // Blue
                Level::Trace => "\x1B[36m", // Cyan
            };

            let reset = "\x1B[0m";
            let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            let console_msg = format!(
                "{} {}[{}]{} [{}] {}",
                timestamp,
                level_color,
                record.level(),
                reset,
                record.target(),
                record.args()
            );

            println!("{}", console_msg);

            let file_msg = format!(
                "{} [{}] [{}] {}\n",
                timestamp,
                record.level(),
                record.target(),
                record.args()
            );

            let is_frontend_log = record.target().starts_with("showcase_app_lib::log_frontend_");

            if is_frontend_log {
                if let Ok(mut logger_guard) = FRONTEND_LOG_FILE_HANDLER.lock() {
                    if let Some(file_handler) = logger_guard.as_mut() {
                        if let Err(e) = file_handler.file.write_all(file_msg.as_bytes()) {
                            eprintln!("Failed to write to frontend log file: {}", e);
                        }
                    }
                }
            } else {
                if let Ok(mut logger_guard) = BACKEND_LOG_FILE_HANDLER.lock() {
                    if let Some(file_handler) = logger_guard.as_mut() {
                        if let Err(e) = file_handler.file.write_all(file_msg.as_bytes()) {
                            eprintln!("Failed to write to backend log file: {}", e);
                        }
                    }
                }
            }
        }
    }

    fn flush(&self) {
        if let Ok(mut logger_guard) = BACKEND_LOG_FILE_HANDLER.lock() {
            if let Some(file_handler) = logger_guard.as_mut() {
                if let Err(e) = file_handler.file.flush() {
                    eprintln!("Failed to flush backend log file: {}", e); 
                }
            }
        }
        if let Ok(mut logger_guard) = FRONTEND_LOG_FILE_HANDLER.lock() {
            if let Some(file_handler) = logger_guard.as_mut() {
                if let Err(e) = file_handler.file.flush() {
                    eprintln!("Failed to flush frontend log file: {}", e);
                }
            }
        }
    }
}

fn archive_old_logs(logs_dir: &Path) -> Result<(), String> {
    let today_str = Local::now().format("%Y-%m-%d").to_string();
    let mut archived_count = 0;
    let mut error_count = 0;

    crate::log_info!("Starting scan for old log files to archive in '{}'...", logs_dir.display());

    match fs::read_dir(logs_dir) {
        Ok(entries) => {
            for entry_result in entries {
                match entry_result {
                    Ok(entry) => {
                        let path = entry.path();
                        if path.is_file() {
                            if let Some(filename_str) = path.file_name().and_then(|name| name.to_str()) {
                                if filename_str.ends_with(".log") {
                                    let mut filename_parts_iter = filename_str.splitn(3, '_');
                                    let prefix_opt = filename_parts_iter.next();
                                    let date_opt = filename_parts_iter.next();

                                    if let (Some(prefix), Some(file_date_str)) = (prefix_opt, date_opt) {
                                        if (prefix == "backend" || prefix == "frontend") && file_date_str.len() == 10 {
                                            if file_date_str != today_str {
                                                crate::log_info!("Found old log file: {}", filename_str);
                                                let zip_file_path = path.with_extension("log.zip");

                                                match File::create(&zip_file_path) {
                                                    Ok(zip_file) => {
                                                        let mut zip_writer = ZipWriter::new(zip_file);
                                                        let options = FileOptions::default()
                                                            .compression_method(CompressionMethod::Deflated)
                                                            .unix_permissions(0o644);

                                                        if let Err(e) = zip_writer.start_file(filename_str, options) {
                                                            crate::log_error!("Failed to start file in zip archive for {}: {}", filename_str, e);
                                                            error_count += 1;
                                                            if let Err(del_err) = fs::remove_file(&zip_file_path) {
                                                                 crate::log_warn!("Failed to delete incomplete zip file {}: {}", zip_file_path.display(), del_err);
                                                            }
                                                            continue;
                                                        }
                                                        
                                                        match File::open(&path) {
                                                            Ok(mut log_file_content) => {
                                                                let mut buffer = Vec::new();
                                                                if let Err(e) = log_file_content.read_to_end(&mut buffer) {
                                                                    crate::log_error!("Failed to read content of {}: {}", filename_str, e);
                                                                    error_count += 1;
                                                                    continue;
                                                                }
                                                                if let Err(e) = zip_writer.write_all(&buffer) {
                                                                    crate::log_error!("Failed to write content to zip for {}: {}", filename_str, e);
                                                                    error_count += 1;
                                                                    continue;
                                                                }
                                                            }
                                                            Err(e) => {
                                                                crate::log_error!("Failed to open log file {} for reading: {}", filename_str, e);
                                                                error_count += 1;
                                                                continue;
                                                            }
                                                        }

                                                        if let Err(e) = zip_writer.finish() {
                                                            crate::log_error!("Failed to finalize zip archive for {}: {}", filename_str, e);
                                                            error_count += 1;
                                                            continue;
                                                        }

                                                        crate::log_info!("Successfully archived {} to {}", filename_str, zip_file_path.display());

                                                        if let Err(e) = fs::remove_file(&path) {
                                                            crate::log_error!("Failed to delete original log file {}: {}", filename_str, e);
                                                            error_count += 1;
                                                        } else {
                                                            crate::log_info!("Deleted original log file: {}", filename_str);
                                                            archived_count += 1;
                                                        }
                                                    }
                                                    Err(e) => {
                                                        crate::log_error!("Failed to create zip file for {}: {}", filename_str, e);
                                                        error_count += 1;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        crate::log_warn!("Failed to read directory entry: {}", e);
                        error_count += 1;
                    }
                }
            }
        }
        Err(e) => {
            let err_msg = format!("Failed to read logs directory '{}': {}", logs_dir.display(), e);
            crate::log_error!("{}", err_msg);
            return Err(err_msg);
        }
    }

    crate::log_info!("Log archival scan complete. Archived {} files. Encountered {} errors.", archived_count, error_count);
    if error_count > 0 {
        Ok(()) 
    } else {
        Ok(())
    }
}

impl LogFileHandler {
    fn new(log_dir: &Path, log_prefix: &str) -> io::Result<Self> {
        fs::create_dir_all(log_dir)?;

        let today = Local::now();
        let date_str = today.format("%Y-%m-%d").to_string();

        let mut count = 1;
        let mut log_path;

        loop {
            log_path = log_dir.join(format!("{}_{}_{}.log", log_prefix, date_str, count));
            if !log_path.exists() {
                break;
            }
            count += 1;
        }

        let file = OpenOptions::new()
            .create(true)
            .write(true)
            .append(true)
            .open(&log_path)?;

        Ok(LogFileHandler { file, log_path })
    }

    fn log_path(&self) -> &PathBuf {
        &self.log_path
    }
}

pub fn init_logging(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let logs_dir = app_data_dir.join("logs");

    if let Err(e) = fs::create_dir_all(&logs_dir) {
        eprintln!("Failed to create logs directory '{}': {}", logs_dir.display(), e);
        return Err(format!("Failed to create logs directory '{}': {}", logs_dir.display(), e));
    }

    if let Err(e) = archive_old_logs(&logs_dir) {
        eprintln!("Error during log archival process: {}", e);
    }

    let backend_file_handler =
        LogFileHandler::new(&logs_dir, "backend")
            .map_err(|e| format!("Failed to create backend log file: {}", e))?;
    let backend_log_path = backend_file_handler.log_path().clone();

    if let Ok(mut guard) = BACKEND_LOG_FILE_HANDLER.lock() {
        *guard = Some(backend_file_handler);
    } else {
        return Err("Failed to lock backend file handler for initialization".to_string());
    }

    let frontend_file_handler =
        LogFileHandler::new(&logs_dir, "frontend")
            .map_err(|e| format!("Failed to create frontend log file: {}", e))?;
    let frontend_log_path = frontend_file_handler.log_path().clone();

    if let Ok(mut guard) = FRONTEND_LOG_FILE_HANDLER.lock() {
        *guard = Some(frontend_file_handler);
    } else {
        return Err("Failed to lock frontend file handler for initialization".to_string());
    }

    static LOGGER: CustomLogger = CustomLogger;
    log::set_logger(&LOGGER)
        .map(|()| log::set_max_level(LevelFilter::Info)) 
        .map_err(|e| format!("Failed to set logger: {}", e))?;

    crate::log_info!("Logging system initialized.");
    crate::log_info!("Backend log file: {}", backend_log_path.display());
    crate::log_info!("Frontend log file: {}", frontend_log_path.display());
    
    Ok(backend_log_path)
}
