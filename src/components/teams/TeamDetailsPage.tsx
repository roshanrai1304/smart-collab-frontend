import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { teamService, Team, TeamMember } from '../../services/team.service';

const TeamDetailsPage: React.FC = () => {
  const { orgId, teamId } = useParams<{ orgId: string; teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!orgId || !teamId) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('No access token found');
        }

        // Fetch team data first (most important)
        const teamData = await teamService.getTeam(token, orgId, teamId);
        setTeam(teamData);
        console.log('Team data loaded:', teamData);

        // Try to fetch members, but don't fail if it errors
        try {
          const membersData = await teamService.getTeamMembers(token, orgId, teamId);
          setMembers(membersData.results || []);
          console.log('Team members loaded:', membersData.results?.length || 0);
        } catch (membersError) {
          console.warn('Failed to load team members:', membersError);
          setMembers([]); // Continue without members
        }

        setError(null);
      } catch (err) {
        console.error('Failed to fetch team data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load team');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [orgId, teamId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !teamId || !inviteEmail.trim()) return;

    try {
      setInviting(true);
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      await teamService.inviteTeamMember(token, orgId, teamId, inviteEmail.trim(), inviteRole);
      
      // Refresh members list
      const membersData = await teamService.getTeamMembers(token, orgId, teamId);
      setMembers(membersData.results || []);
      
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('editor');
    } catch (err) {
      console.error('Failed to invite member:', err);
    } finally {
      setInviting(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'lead': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'editor': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      case 'member': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading Team...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h3 className="font-bold">Error</h3>
            <p>{error || 'Team not found'}</p>
          </div>
          <Link 
            to={orgId ? `/organizations/${orgId}` : '/dashboard'} 
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Organization
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to={orgId ? `/organizations/${orgId}` : '/dashboard'} className="text-indigo-600 hover:text-indigo-700">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div 
                className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: team.color }}
              >
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                {team.is_default && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800">
                    Default
                  </span>
                )}
                {team.is_archived && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                    Archived
                  </span>
                )}
              </div>
                <p className="text-sm text-gray-500">{team.organization.name}</p>
              </div>
            </div>
            
            {(team.user_role === 'lead' || team.user_role === 'admin') && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Invite Member
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Team Info */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
              <p className="text-gray-600 mb-4">{team.description}</p>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRoleColor(team.user_role)}`}>
                    {team.user_role}
                  </span>
                  <span className="text-sm text-gray-500">
                    Created {new Date(team.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    Created by {team.created_by.full_name || team.created_by.username}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">{team.member_count}</div>
                  <div className="text-sm text-indigo-800">Members</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">--</div>
                  <div className="text-sm text-green-800">Documents</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Members ({team.member_count})</h2>
          </div>
          
          {members.length > 0 ? (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: team.color }}
                    >
                      <span className="text-white text-sm font-bold">
                        {member.user.first_name?.[0] || member.user.username[0]}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.user.first_name && member.user.last_name 
                          ? `${member.user.first_name} ${member.user.last_name}`
                          : member.user.username
                        }
                      </div>
                      <div className="text-sm text-gray-500">{member.user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(member.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div 
                  className="h-12 w-12 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: team.color }}
                >
                  <span className="text-white text-sm font-bold">
                    {team.created_by.full_name?.[0] || team.created_by.username[0]}
                  </span>
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">
                    {team.created_by.full_name || team.created_by.username}
                  </div>
                  <div className="text-sm text-gray-500">{team.created_by.email}</div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold mt-1 inline-block ${getRoleColor(team.user_role)}`}>
                    {team.user_role}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                This team has {team.member_count} member{team.member_count !== 1 ? 's' : ''}.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Member list API is not available yet, but you can still invite new members.
              </p>
              {(team.user_role === 'lead' || team.user_role === 'admin') && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Invite Member
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h3>
            <form onSubmit={handleInvite}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'editor' | 'viewer')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="viewer">Viewer - Can view documents</option>
                  <option value="editor">Editor - Can edit documents</option>
                  <option value="admin">Admin - Can manage team</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetailsPage;
