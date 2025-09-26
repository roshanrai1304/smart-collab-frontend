import { API_BASE_URL } from '../utils/constants';

export interface Document {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  team: {
    id: string;
    name: string;
  };
  tags: string[];
  version: number;
  collaborators_count: number;
  comments_count: number;
}

export interface CreateDocumentData {
  title: string;
  content: string;
  team_id: string;
  status?: 'draft' | 'published';
  tags?: string[];
}

export interface DocumentFilters {
  search?: string;
  status?: string;
  team_id?: string;
  author?: string;
  tags?: string;
  page?: number;
  page_size?: number;
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  content: string;
  version_notes: string;
  created_at: string;
  created_by: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
}

export interface DocumentComment {
  id: string;
  content: string;
  position?: {
    line: number;
    column: number;
  };
  created_at: string;
  author: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  parent_comment?: string;
  replies?: DocumentComment[];
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

  // Document CRUD
  async getDocuments(token: string, filters: DocumentFilters = {}): Promise<{ results: Document[]; count: number }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_BASE_URL}/documents/?${params}`, {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }

  async getDocument(token: string, docId: string): Promise<Document> {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}/`, {
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

  async updateDocument(token: string, docId: string, data: Partial<CreateDocumentData>): Promise<Document> {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}/`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  async deleteDocument(token: string, docId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token)
    });
    if (!response.ok) {
      throw new Error('Failed to delete document');
    }
  }

  // Document Versions
  async getDocumentVersions(token: string, docId: string): Promise<{ results: DocumentVersion[] }> {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}/versions/`, {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }

  async createDocumentVersion(token: string, docId: string, versionNotes: string): Promise<DocumentVersion> {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}/versions/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ version_notes: versionNotes })
    });
    return this.handleResponse(response);
  }

  // Document Comments
  async getDocumentComments(token: string, docId: string): Promise<{ results: DocumentComment[] }> {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}/comments/`, {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }

  async addDocumentComment(token: string, docId: string, content: string, position?: { line: number; column: number }, parentId?: string): Promise<DocumentComment> {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}/comments/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        content,
        position,
        parent_comment: parentId
      })
    });
    return this.handleResponse(response);
  }

  // Document Stats
  async getDocumentStats(token: string): Promise<{
    total_count: number;
    draft_count: number;
    published_count: number;
    archived_count: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/documents/stats/`, {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }
}

export const documentService = new DocumentService();
