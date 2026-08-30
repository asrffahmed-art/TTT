export interface WebSource {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon?: string;
  publishedDate?: string;
  score?: number;
}

export interface WebImage {
  url: string;
  description?: string;
  sourceTitle?: string;
  sourceUrl?: string;
}

export interface Message {
  id: number | string;
  senderId?: string;
  chatId?: string;
  userId?: string;
  text: string;
  isUser: boolean;
  time: string;
  timestamp?: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
  mode?: 'fast' | 'thinking' | 'web_search';
  sources?: WebSource[];
  relatedSources?: WebSource[];
  images?: WebImage[];
  error?: boolean;
  isLimitError?: boolean;
  isServerError?: boolean;
  modelUsed?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioDuration?: string;
  audioSummaryInfo?: {
    status?: 'generating' | 'ready' | 'error' | 'limit_reached';
    title?: string;
    duration?: number | string;
    voiceName?: string;
    script?: string;
    sourceType?: 'pdf' | 'youtube' | 'image' | 'audio' | 'document' | 'text';
  };
  mediaUrl?: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileUri?: string;
  fileRefName?: string;
  isUploadedToFileApi?: boolean;
  fileSize?: string;
  mediaSize?: number;
  mediaName?: string;
  compressionInfo?: {
    originalSize: number;
    compressedSize: number;
    savingsPercentage: number;
  };
}
declare global { interface Window { Paymob: any; } }
