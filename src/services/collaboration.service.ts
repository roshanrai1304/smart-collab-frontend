import { API_BASE_URL } from '../utils/constants';

export interface CollaborationRoom {
  id: string;
  name: string;
  document: string;
  max_participants: number;
  enable_cursor_tracking: boolean;
  enable_voice: boolean;
  enable_video: boolean;
  room_type: string;
  is_active: boolean;
  created_at: string;
  participants_count: number;
}

export interface RoomParticipant {
  id: string;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
  user_role: 'viewer' | 'editor' | 'admin';
  joined_at: string;
  is_active: boolean;
  cursor_position?: {
    x: number;
    y: number;
    line: number;
    column: number;
  };
}

export interface WebSocketMessage {
  type: 'authenticate' | 'join_room' | 'text_change' | 'cursor_position' | 'user_presence' | 'connection_established' | 'authenticated' | 'room_joined' | 'user_joined' | 'user_left' | 'error';
  token?: string;
  user_role?: string;
  operation?: 'insert' | 'delete' | 'replace';
  position?: number | { x: number; y: number; line: number; column: number };
  content?: string;
  length?: number;
  selection_start?: number;
  selection_end?: number;
  timestamp?: number;
  user_id?: string;
  user_info?: any;
  message?: string;
  participants?: RoomParticipant[];
  room_info?: CollaborationRoom;
}

class CollaborationService {
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

  // Room Management
  async createCollaborationRoom(token: string, documentId: string, roomSettings: {
    name?: string;
    maxParticipants?: number;
    enableCursorTracking?: boolean;
    enableVoice?: boolean;
    enableVideo?: boolean;
    type?: string;
  } = {}): Promise<CollaborationRoom> {
    const response = await fetch(`${API_BASE_URL}/collaboration/rooms/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        document: documentId,
        name: roomSettings.name || `Collaboration on Document`,
        max_participants: roomSettings.maxParticipants || 10,
        enable_cursor_tracking: roomSettings.enableCursorTracking !== false,
        enable_voice: roomSettings.enableVoice || false,
        enable_video: roomSettings.enableVideo || false,
        room_type: roomSettings.type || 'document_editing'
      })
    });

    return this.handleResponse(response);
  }

  async joinCollaborationRoom(token: string, roomId: string, userRole: 'viewer' | 'editor' | 'admin' = 'editor'): Promise<{ room: CollaborationRoom; participants: RoomParticipant[] }> {
    const response = await fetch(`${API_BASE_URL}/collaboration/rooms/${roomId}/join/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        user_role: userRole,
        client_info: {
          browser: navigator.userAgent,
          screen_resolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
    });

    return this.handleResponse(response);
  }

  async getWebSocketToken(token: string, roomId: string): Promise<{ token: string; websocket_url: string }> {
    const response = await fetch(`${API_BASE_URL}/collaboration/ws-token/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        room_id: roomId
      })
    });

    return this.handleResponse(response);
  }

  async getRoomParticipants(token: string, roomId: string): Promise<{ results: RoomParticipant[] }> {
    const response = await fetch(`${API_BASE_URL}/collaboration/rooms/${roomId}/participants/`, {
      headers: this.getAuthHeaders(token)
    });

    return this.handleResponse(response);
  }

  async leaveRoom(token: string, roomId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/collaboration/rooms/${roomId}/leave/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token)
    });

    if (!response.ok) {
      throw new Error('Failed to leave room');
    }
  }
}

export class CollaborativeEditor {
  private roomId: string;
  private documentId: string;
  private ws: WebSocket | null = null;
  private isAuthenticated: boolean = false;
  private participants: Map<string, RoomParticipant> = new Map();
  private cursors: Map<string, HTMLElement> = new Map();
  private currentUserId: string | null = null;

  // Event callbacks
  public onParticipantsChange?: (participants: RoomParticipant[]) => void;
  public onConnectionChange?: (isConnected: boolean) => void;
  public onTextChange?: (operation: string, position: number, content: string, length?: number) => void;
  public onCursorChange?: (userId: string, position: { x: number; y: number; line: number; column: number }) => void;
  public onError?: (error: string) => void;

  constructor(roomId: string, documentId: string, currentUserId?: string) {
    this.roomId = roomId;
    this.documentId = documentId;
    this.currentUserId = currentUserId || null;
  }

  async connect(): Promise<void> {
    try {
      // Get WebSocket token
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      const { token: wsToken } = await collaborationService.getWebSocketToken(token, this.roomId);
      
      // Create WebSocket connection
      const wsUrl = `ws://localhost:8000/ws/collaboration/${this.roomId}/`;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.authenticate(wsToken);
        this.onConnectionChange?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code);
        this.handleDisconnection();
        this.onConnectionChange?.(false);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError?.('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to connect to collaboration room:', error);
      this.onError?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isAuthenticated = false;
    this.participants.clear();
    this.cursors.clear();
  }

  private authenticate(token: string): void {
    this.send({
      type: 'authenticate',
      token: token
    });
  }

  private send(data: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(data: WebSocketMessage): void {
    switch (data.type) {
      case 'connection_established':
        console.log('Connection established');
        break;
        
      case 'authenticated':
        this.isAuthenticated = true;
        this.joinRoom();
        break;
        
      case 'room_joined':
        this.handleRoomJoined(data);
        break;
        
      case 'user_joined':
        this.handleUserJoined(data);
        break;
        
      case 'user_left':
        this.handleUserLeft(data);
        break;
        
      case 'text_change':
        this.handleTextChange(data);
        break;
        
      case 'cursor_position':
        this.handleCursorPosition(data);
        break;
        
      case 'user_presence':
        this.handleUserPresence(data);
        break;
        
      case 'error':
        console.error('WebSocket error:', data.message);
        this.onError?.(data.message || 'Unknown error');
        break;
    }
  }

  private joinRoom(): void {
    this.send({
      type: 'join_room',
      user_role: 'editor'
    });
  }

  private handleRoomJoined(data: WebSocketMessage): void {
    if (data.participants) {
      this.participants.clear();
      data.participants.forEach(participant => {
        this.participants.set(participant.user.id.toString(), participant);
      });
      this.onParticipantsChange?.(Array.from(this.participants.values()));
    }
  }

  private handleUserJoined(data: WebSocketMessage): void {
    if (data.user_info) {
      this.participants.set(data.user_id!, data.user_info);
      this.onParticipantsChange?.(Array.from(this.participants.values()));
    }
  }

  private handleUserLeft(data: WebSocketMessage): void {
    if (data.user_id) {
      this.participants.delete(data.user_id);
      this.cursors.delete(data.user_id);
      this.onParticipantsChange?.(Array.from(this.participants.values()));
    }
  }

  private handleTextChange(data: WebSocketMessage): void {
    // Skip if this is our own change
    if (data.user_id === this.currentUserId) return;
    
    this.onTextChange?.(
      data.operation || 'insert',
      data.position as number || 0,
      data.content || '',
      data.length
    );
  }

  private handleCursorPosition(data: WebSocketMessage): void {
    if (data.user_id && data.position && typeof data.position === 'object') {
      this.onCursorChange?.(data.user_id, data.position as any);
    }
  }

  private handleUserPresence(data: WebSocketMessage): void {
    // Handle user presence updates
    if (data.user_id && data.user_info) {
      this.participants.set(data.user_id, data.user_info);
      this.onParticipantsChange?.(Array.from(this.participants.values()));
    }
  }

  private handleDisconnection(): void {
    this.isAuthenticated = false;
    // Attempt reconnection after a delay
    setTimeout(() => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect();
      }
    }, 3000);
  }

  // Public methods for sending changes
  public sendTextChange(operation: 'insert' | 'delete' | 'replace', position: number, content: string, length?: number): void {
    if (!this.isAuthenticated) return;
    
    this.send({
      type: 'text_change',
      operation,
      position,
      content,
      length,
      timestamp: Date.now()
    });
  }

  public sendCursorPosition(position: { x: number; y: number; line: number; column: number }, selectionStart?: number, selectionEnd?: number): void {
    if (!this.isAuthenticated) return;
    
    this.send({
      type: 'cursor_position',
      position,
      selection_start: selectionStart,
      selection_end: selectionEnd,
      timestamp: Date.now()
    });
  }

  public getParticipants(): RoomParticipant[] {
    return Array.from(this.participants.values());
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }
}

export const collaborationService = new CollaborationService();
