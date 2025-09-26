import { API_BASE_URL } from '../utils/constants';

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  is_default: boolean;
  is_archived: boolean;
  settings: Record<string, any>;
  member_count: number;
  user_role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    domain: string;
    description: string;
    logo_url: string | null;
    subscription_plan: string;
    subscription_status: string;
    max_members: number;
    max_documents: number;
    max_storage_gb: number;
    settings: Record<string, any>;
    member_count: number;
    team_count: number;
    can_add_member: boolean;
    created_by: {
      id: number;
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      full_name: string;
    };
    created_at: string;
    updated_at: string;
  };
  created_by: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateTeamData {
  name: string;
  slug?: string;
  description: string;
  color?: string;
}

export interface TeamMember {
  id: string;
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  role: 'admin' | 'editor' | 'viewer';
  joined_at: string;
  is_admin: boolean;
}

class TeamService {
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

  // Team CRUD Operations
  async getTeams(token: string, orgId: string): Promise<{ results: Team[] }> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/teams/`, {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }

  async getTeam(token: string, orgId: string, teamId: string): Promise<Team> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/`, {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }

  async createTeam(token: string, orgId: string, data: CreateTeamData): Promise<Team> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/teams/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  async updateTeam(token: string, orgId: string, teamId: string, data: Partial<CreateTeamData>): Promise<Team> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  async deleteTeam(token: string, orgId: string, teamId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token)
    });
    if (!response.ok) {
      throw new Error('Failed to delete team');
    }
  }

  // Team Member Management
  async getTeamMembers(token: string, orgId: string, teamId: string): Promise<{ results: TeamMember[] }> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/members/`, {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }

  async inviteTeamMember(token: string, orgId: string, teamId: string, email: string, role: 'admin' | 'editor' | 'viewer'): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/invite/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ email, role })
    });
    return this.handleResponse(response);
  }

  async updateTeamMemberRole(token: string, orgId: string, teamId: string, memberId: string, role: 'admin' | 'editor' | 'viewer'): Promise<TeamMember> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/members/${memberId}/`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ role })
    });
    return this.handleResponse(response);
  }

  async removeTeamMember(token: string, orgId: string, teamId: string, memberId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/members/${memberId}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token)
    });
    if (!response.ok) {
      throw new Error('Failed to remove team member');
    }
  }

  // Utility functions
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  getDefaultColors(): string[] {
    return [
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#8B5CF6', // Violet
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#EC4899', // Pink
      '#6366F1'  // Indigo
    ];
  }
}

export const teamService = new TeamService();
