import { API_BASE_URL } from '../utils/constants';

export interface Organization {
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
}

export interface CreateOrganizationData {
  name: string;
  slug?: string;
  description: string;
  domain?: string;
}

export interface OrganizationStats {
  total_members: number;
  total_teams: number;
  total_documents: number;
  total_files: number;
  active_members_last_30_days: number;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  is_default: boolean;
  is_archived: boolean;
  settings: Record<string, any>;
  organization: {
    id: string;
    name: string;
  };
  membership: {
    role: string;
    status: string;
    joined_at: string;
    is_admin: boolean;
    permissions: {
      can_manage_members: boolean;
      can_create_documents: boolean;
      can_upload_files: boolean;
      can_delete_team: boolean;
    };
  };
  stats: {
    total_members: number;
    total_documents: number;
    total_files: number;
    created_at: string;
  };
}

export interface CreateTeamData {
  name: string;
  slug?: string;
  description: string;
  color?: string;
}

export interface Member {
  id: string;
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

class OrganizationService {
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

  // Organization CRUD
  async getOrganizations(token: string): Promise<{ results: Organization[] }> {
    const response = await fetch(`${API_BASE_URL}/organizations/`, {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }

  async getOrganization(token: string, orgId: string): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/`, {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }

  async getOrganizationStats(token: string, orgId: string): Promise<OrganizationStats> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/stats/`, {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }

  async createOrganization(token: string, data: CreateOrganizationData): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/organizations/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  async updateOrganization(token: string, orgId: string, data: Partial<CreateOrganizationData>): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  async deleteOrganization(token: string, orgId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token)
    });
    if (!response.ok) {
      throw new Error('Failed to delete organization');
    }
  }

  // Team Management
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

  // Member Management
  async getMembers(token: string, orgId: string): Promise<{ results: Member[] }> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/`, {
      headers: this.getAuthHeaders(token)
    });
    return this.handleResponse(response);
  }

  async inviteMember(token: string, orgId: string, email: string, role: 'admin' | 'member'): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/invite/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ email, role })
    });
    return this.handleResponse(response);
  }

  async updateMemberRole(token: string, orgId: string, memberId: string, role: string): Promise<Member> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${memberId}/`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ role })
    });
    return this.handleResponse(response);
  }

  async removeMember(token: string, orgId: string, memberId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${memberId}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token)
    });
    if (!response.ok) {
      throw new Error('Failed to remove member');
    }
  }

  // Team Member Management
  async inviteTeamMember(token: string, orgId: string, teamId: string, email: string, role: 'admin' | 'editor' | 'viewer'): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/invite/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ email, role })
    });
    return this.handleResponse(response);
  }
}

export const organizationService = new OrganizationService();
