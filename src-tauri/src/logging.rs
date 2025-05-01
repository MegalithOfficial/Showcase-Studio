use chrono::Local;
use log::{Level, LevelFilter, Metadata, Record};
use once_cell::sync::Lazy;
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;

static FILE_LOGGER: Lazy<Mutex<Option<FileLogger>>> = Lazy::new(|| Mutex::new(None));

struct CustomLogger;

struct FileLogger {
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

            if let Ok(mut logger) = FILE_LOGGER.lock() {
                if let Some(file_logger) = logger.as_mut() {
                    let file_msg = format!(
                        "{} [{}] [{}] {}\n",
                        timestamp,
                        record.level(),
                        record.target(),
                        record.args()
                    );

                    if let Err(e) = file_logger.file.write_all(file_msg.as_bytes()) {
                        eprintln!("Failed to write to log file: {}", e);
                    }
                }
            }
        }
    }

    fn flush(&self) {
        if let Ok(mut logger) = FILE_LOGGER.lock() {
            if let Some(file_logger) = logger.as_mut() {
                if let Err(e) = file_logger.file.flush() {
                    eprintln!("Failed to flush log file: {}", e);
                }
            }
        }
    }
}

impl FileLogger {
    fn new(log_dir: &Path) -> io::Result<Self> {
        fs::create_dir_all(log_dir)?;

        let today = Local::now();
        let date_str = today.format("%Y-%m-%d").to_string();

        let mut count = 1;
        let mut log_path;

        loop {
            log_path = log_dir.join(format!("{}_{}.log", date_str, count));
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

        Ok(FileLogger { file, log_path })
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

    let file_logger =
        FileLogger::new(&logs_dir).map_err(|e| format!("Failed to create log file: {}", e))?;

    let log_path = file_logger.log_path().clone();

    if let Ok(mut logger_guard) = FILE_LOGGER.lock() {
        *logger_guard = Some(file_logger);
    } else {
        return Err("Failed to initialize file logger".to_string());
    }

    static LOGGER: CustomLogger = CustomLogger;
    log::set_logger(&LOGGER)
        .map(|()| log::set_max_level(LevelFilter::Info))
        .map_err(|e| format!("Failed to set logger: {}", e))?;

    log_info!("Logging system initialized");
    log_info!("Log file: {}", log_path.display());

    Ok(log_path)
}
