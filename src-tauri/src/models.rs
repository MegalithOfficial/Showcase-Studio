use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum OverlayPosition {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Hidden,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OverlayStyle {
    Black,
    White,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OverlaySettings {
    pub position: OverlayPosition,
    pub style: OverlayStyle,
    #[serde(rename = "showAvatar")]
    pub show_avatar: bool,
    pub width: f32,
    pub transparency: u8, // 0-100 
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SelectedMessage {
    pub message_id: String,
    pub channel_id: String,
    pub author_id: String,
    pub author_name: String,
    pub author_avatar: Option<String>,
    pub message_content: String,
    pub selected_attachment_filename: String,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShowcaseImage {
    pub message_id: String,
    pub sender: String,
    pub avatar: String,
    pub message: String,
    pub is_edited: bool,
    pub overlay: OverlaySettings,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Showcase {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: i64,
    pub last_modified: i64,
    pub phase: i32,
    pub selected_messages: Option<Vec<SelectedMessage>>,
    pub images: Option<Vec<ShowcaseImage>>,
    pub pptx_path: Option<String>, 
}

#[derive(Debug, Deserialize)]
pub struct UpdateShowcasePayload {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct AppConfig {
    pub selected_server_id: Option<String>,
    pub selected_channel_ids: Vec<String>,
    pub is_setup_complete: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AttachmentInfo {
    pub id: String,
    pub url: String,
    pub filename: String,
    pub content_type: Option<String>,
    pub width: Option<u64>,
    pub height: Option<u64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct IndexedMessage {
    pub message_id: String,
    pub channel_id: String,
    pub author_id: String,
    pub author_name: String,
    pub author_avatar: Option<String>,
    pub message_content: String,
    pub attachments: Vec<String>,
    pub timestamp: i64,
    pub is_used: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct StorageUsage {
    pub database_size_bytes: u64,
    pub image_cache_size_bytes: u64,
    pub total_size_bytes: u64,
    pub database_path: String,
    pub message_count: i64,
    pub showcase_count: i64,
    pub protected_message_count: i64,  
    pub cache_file_count: u64,
    pub oldest_message_date: Option<i64>, 
    pub newest_message_date: Option<i64>,  
}

#[derive(Debug, Serialize)]
pub struct CleanupStats {
    pub messages_deleted: usize,
    pub files_deleted: usize,
    pub skipped_used_messages: usize,
}