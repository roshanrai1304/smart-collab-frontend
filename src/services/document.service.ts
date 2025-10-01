import { API_BASE_URL } from '../utils/constants';

export interface Document {
  id: string;
  title: string;
  content?: any; // Rich content JSON object or string
  content_text?: string; // Plain text extraction for search
  document_type: 'text' | 'markdown' | 'rich_text' | 'wysiwyg';
  status: 'draft' | 'published' | 'archived' | 'template';
  is_public: boolean;
  word_count: number;
  character_count: number;
  media_count?: number;
  tags: string[];
  team_name: string; // API returns team_name instead of team object
  editor_settings?: {
    theme?: string;
    toolbar?: string[];
    auto_save?: boolean;
  };
  metadata?: Record<string, any>;
  
  // Auto-save fields
  draft_content?: any; // Draft content for auto-save
  latest_content?: any; // Latest content (prioritizes draft over published)
  has_unsaved_changes?: boolean; // Whether there are unsaved changes
  last_auto_save?: string; // Timestamp of last auto-save
  
  created_by: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  updated_by: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  current_version: number;
  latest_version?: {
    id: string;
    version_number: number;
    title: string;
    content: any;
    content_text: string;
    change_summary: string;
    word_count: number;
    character_count: number;
    created_by: any;
    created_at: string;
  };
  comment_count: number;
  user_permission: 'admin' | 'editor' | 'viewer';
  permissions_count?: number;
  media_attachments?: MediaAttachment[];
  created_at: string;
  updated_at: string;
}

export interface MediaAttachment {
  id: string;
  filename: string;
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  media_type: 'image' | 'video' | 'audio' | 'document' | 'spreadsheet' | 'presentation' | 'pdf' | 'archive' | 'other';
  usage_type: 'inline' | 'attachment';
  position_data?: {
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    alignment?: string;
  };
  width?: number;
  height?: number;
  duration?: number;
  alt_text?: string;
  caption?: string;
  file_url: string;
  is_image?: boolean;
  is_video?: boolean;
  is_processed?: boolean;
  uploaded_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  uploaded_at: string;
}

export interface CreateDocumentData {
  title: string;
  content?: any; // Rich content JSON or string
  team_id: string;
  document_type?: 'text' | 'markdown' | 'rich_text' | 'wysiwyg';
  status?: 'draft' | 'published' | 'archived' | 'template';
  is_public?: boolean;
  tags?: string[];
  editor_settings?: {
    theme?: string;
    font_size?: number;
    toolbar?: string[];
    auto_save?: boolean;
  };
  metadata?: Record<string, any>;
}

export interface DocumentFilters {
  team?: string;
  team_id?: string;
  status?: string;
  type?: string;
  search?: string;
  tags?: string[];
  page?: number;
  page_size?: number;
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  content: string;
  change_summary: string;
  is_major: boolean;
  created_by: {
    id: number;
    username: string;
    full_name: string;
  };
  created_at: string;
}

export interface DocumentComment {
  id: string;
  content: string;
  position_start?: number;
  position_end?: number;
  parent_comment?: string;
  created_by: {
    id: number;
    username: string;
    full_name: string;
  };
  created_at: string;
  updated_at: string;
  replies: DocumentComment[];
}

class DocumentService {
  private getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Document CRUD Operations
  async getDocuments(token: string, filters: DocumentFilters = {}): Promise<{ results: Document[]; count: number }> {
    const params = new URLSearchParams();
    
    if (filters.team) params.append('team', filters.team);
    if (filters.team_id) params.append('team', filters.team_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.search) params.append('search', filters.search);
    if (filters.tags) params.append('tags', filters.tags.join(','));
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());

    const response = await fetch(`${API_BASE_URL}/documents/?${params}`, {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getDocument(token: string, documentId: string): Promise<Document> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/`, {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async createDocument(token: string, data: CreateDocumentData): Promise<Document> {
    const response = await fetch(`${API_BASE_URL}/documents/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data)
    });

    return this.handleResponse(response);
  }

  async updateDocument(token: string, documentId: string, updates: Partial<CreateDocumentData & { content: string }>): Promise<Document> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(updates)
    });

    return this.handleResponse(response);
  }

  // Auto-save functionality
  async autoSaveDocument(token: string, documentId: string, content: any): Promise<{
    message: string;
    last_auto_save: string;
    has_unsaved_changes: boolean;
  }> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/auto-save/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ content })
    });
    return this.handleResponse(response);
  }

  async publishDraft(token: string, documentId: string, createVersion: boolean = true, versionSummary: string = ''): Promise<{
    message: string;
    version_created: boolean;
    current_version: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/publish-draft/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        create_version: createVersion,
        version_summary: versionSummary
      })
    });
    return this.handleResponse(response);
  }

  async discardDraft(token: string, documentId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/discard-draft/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({})
    });
    return this.handleResponse(response);
  }

  async deleteDocument(token: string, documentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token)
    });

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }
  }

  // Document Versions
  async getDocumentVersions(token: string, documentId: string): Promise<{ results: DocumentVersion[] }> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions/`, {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async createDocumentVersion(token: string, documentId: string, versionData: {
    content: string;
    changeSummary: string;
    isMajor?: boolean;
  }): Promise<DocumentVersion> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        content: versionData.content,
        change_summary: versionData.changeSummary,
        is_major: versionData.isMajor || false
      })
    });

    return this.handleResponse(response);
  }

  // Document Comments
  async getDocumentComments(token: string, documentId: string): Promise<{ results: DocumentComment[] }> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/comments/`, {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async addDocumentComment(token: string, documentId: string, commentData: {
    content: string;
    positionStart?: number;
    positionEnd?: number;
    parentCommentId?: string;
  }): Promise<DocumentComment> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/comments/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        content: commentData.content,
        position_start: commentData.positionStart,
        position_end: commentData.positionEnd,
        parent_comment: commentData.parentCommentId || null
      })
    });

    return this.handleResponse(response);
  }

  // Auto-save functionality
  async autoSave(token: string, documentId: string, content: any): Promise<Document> {
    return this.updateDocument(token, documentId, {
      content: content
    });
  }

  // Media Management
  async uploadMedia(token: string, documentId: string, file: File, options: {
    usageType?: 'inline' | 'attachment';
    altText?: string;
    caption?: string;
    positionData?: any;
  } = {}): Promise<MediaAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('usage_type', options.usageType || 'inline');
    if (options.altText) formData.append('alt_text', options.altText);
    if (options.caption) formData.append('caption', options.caption);
    if (options.positionData) formData.append('position_data', JSON.stringify(options.positionData));

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/media/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    return this.handleResponse(response);
  }

  async getDocumentMedia(token: string, documentId: string): Promise<MediaAttachment[]> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/media/`, {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async getMediaDetails(token: string, documentId: string, mediaId: string): Promise<MediaAttachment> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/media/${mediaId}/`, {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async updateMedia(token: string, documentId: string, mediaId: string, updates: {
    altText?: string;
    caption?: string;
    positionData?: any;
  }): Promise<MediaAttachment> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/media/${mediaId}/`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        alt_text: updates.altText,
        caption: updates.caption,
        position_data: updates.positionData
      })
    });

    return this.handleResponse(response);
  }

  async deleteMedia(token: string, documentId: string, mediaId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/media/${mediaId}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token)
    });

    if (!response.ok) {
      throw new Error('Failed to delete media');
    }
  }

  // Utility functions
  getDocumentTypeIcon(type: string): string {
    switch (type) {
      case 'markdown': return '📝';
      case 'rich_text': return '✨';
      case 'wysiwyg': return '🎨';
      case 'text': return '📃';
      default: return '📄';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'template': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getMediaTypeIcon(mediaType: string): string {
    switch (mediaType) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'document': return '📄';
      case 'spreadsheet': return '📊';
      case 'presentation': return '📽️';
      case 'pdf': return '📕';
      case 'archive': return '📦';
      default: return '📎';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  estimateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}

export const documentService = new DocumentService();