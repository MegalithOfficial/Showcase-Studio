export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'hidden';
export type OverlayStyle = 'black' | 'white';

export interface OverlaySettings {
    position: OverlayPosition;
    style: OverlayStyle;
    showAvatar: boolean; 
    width: number;
    transparency: number; // 0-100
}

export interface ShowcaseImage {
    message_id: string;
    sender: string;
    avatar: string; 
    message: string;
    is_edited: boolean; 
    overlay: OverlaySettings;
}

export interface SelectedMessage {
    message_id: string;
    selected_attachment_filename: string;
    channel_id: string;
    author_id: string;
    author_name: string;
    author_avatar: string | null;
    message_content: string;
    timestamp: number;
}

export interface Showcase {
    id: string;
    title: string;
    description: string | null;
    status: string;
    created_at: number;
    last_modified: number;
    phase: number;
    selected_messages: SelectedMessage[] | null;
    images: ShowcaseImage[] | null;
    pptx_path?: string | null; 
}

export interface AttachmentInfo {
    id: string;
    url: string;
    filename: string;
    content_type?: string | null;
    width?: number | null;
    height?: number | null;
}

export interface IndexedMessage {
    message_id: string;
    channel_id: string;
    author_id: string;
    author_name: string;
    author_avatar?: string | null;
    message_content: string;
    attachments: string[];
    timestamp: number; // Unix timestamp (seconds)
}

export interface SerializableGuild {
    id: string;
    name: string;
    icon: string | null;
}

export interface DiscordChannel {
    id: string;
    name: string;
    topic: string;
    position: number;
    parent_id: string;
    parent_name: string;
}

export interface StorageUsage {
    database_size_bytes: number,
    image_cache_size_bytes: number,
    total_size_bytes: number,
    database_path: string,
    image_cache_path: string
}

export interface FirstSlideSettings {
  backgroundImage?: string | null;
  showTitle: boolean;
  showAuthor: boolean;
}

export interface CustomizationSettingsPayload {
  overlaySettings?: OverlaySettings | null;
  firstSlideSettings?: FirstSlideSettings | null;
  autoUpdateEnabled?: boolean | null;
}

export interface EditableImage {
    id: string;
    message_id: string;
    filename: string;
    sender: string;
    avatar: string | null;
    message: string;
    imageDataUrl: string; // base64 data URI from get_cached_image_data
    overlay: {
        position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'hidden';
        style: 'black' | 'white';
        showAvatar: boolean;
        width: number;
        transparency: number; // 0-100
    };
}
