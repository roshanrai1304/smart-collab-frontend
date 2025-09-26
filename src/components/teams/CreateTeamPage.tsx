import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { teamService, CreateTeamData } from '../../services/team.service';

const CreateTeamPage: React.FC = () => {
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();
  const [formData, setFormData] = useState<CreateTeamData>({
    name: '',
    slug: '',
    description: '',
    color: '#3B82F6'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const availableColors = teamService.getDefaultColors();

  const generateSlug = (name: string) => {
    return teamService.generateSlug(name);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    
    setErrors({});
    setLoading(true);

    // Basic validation
    if (!formData.name.trim()) {
      setErrors({ name: 'Team name is required' });
      setLoading(false);
      return;
    }

    if (!formData.description.trim()) {
      setErrors({ description: 'Description is required' });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const teamData = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
        description: formData.description.trim(),
        color: formData.color
      };

      const createdTeam = await teamService.createTeam(token, orgId, teamData);
      
      // Navigate back to dashboard with success
      navigate('/dashboard', { 
        state: { 
          message: `Team "${createdTeam.name}" created successfully!`,
          type: 'success'
        }
      });
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Failed to create team' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link 
            to={orgId ? `/organizations/${orgId}` : '/dashboard'} 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Organization
          </Link>
          
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-3xl shadow-2xl mb-6 ring-4 ring-white">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent mb-4">
            Create New Team
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Set up a team to organize your members and collaborate on projects
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="rounded-2xl bg-gradient-to-r from-red-50 to-pink-50 p-4 border border-red-200">
                <p className="text-sm font-medium text-red-800">{errors.general}</p>
              </div>
            )}

            {/* Team Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                Team Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleNameChange}
                className="block w-full px-4 py-3 border-0 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                placeholder="e.g., Development Team"
                required
              />
              {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Slug (Auto-generated) */}
            <div>
              <label htmlFor="slug" className="block text-sm font-semibold text-gray-700 mb-2">
                Team Slug
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                className="block w-full px-4 py-3 border-0 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                placeholder="development-team"
              />
              <p className="mt-2 text-xs text-gray-500">
                URL-friendly identifier for your team. Auto-generated from name.
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="block w-full px-4 py-3 border-0 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 resize-none"
                placeholder="Brief description of your team's purpose..."
                required
              />
              {errors.description && <p className="mt-2 text-sm text-red-600">{errors.description}</p>}
            </div>

            {/* Team Color */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Team Color
              </label>
              <div className="grid grid-cols-5 gap-3">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    className={`w-12 h-12 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-110 ${
                      formData.color === color 
                        ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' 
                        : 'hover:shadow-xl'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Choose a color to help identify your team visually
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4 pt-6">
              <Link
                to={orgId ? `/organizations/${orgId}` : '/dashboard'}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200 text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Team
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-6 border border-green-200">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">Team Setup</h3>
              <ul className="text-green-800 space-y-1 text-sm">
                <li>• You'll become an admin of this team</li>
                <li>• Invite members to collaborate on projects</li>
                <li>• Create and manage documents together</li>
                <li>• Set team-specific permissions and settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamPage;
