import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentService, Document } from '../../services/document.service';
import { useAuth } from '../../hooks/useAuth';
import RichTextEditor from './RichTextEditor';

interface DocumentEditorProps {
  documentId?: string;
  isNewDocument?: boolean;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId: propDocumentId, isNewDocument = false }) => {
  const { documentId: paramDocumentId } = useParams<{ documentId: string }>();
  const documentId = propDocumentId || paramDocumentId;
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState<any>('');
  
  // Debug: Log content changes
  useEffect(() => {
    console.log('Content state changed:', {
      contentType: typeof content,
      content: content,
      contentStringified: JSON.stringify(content)
    });
  }, [content]);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<'text' | 'markdown' | 'rich_text' | 'wysiwyg'>('rich_text');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNewDocument);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(isNewDocument);
  const [needsTeamSelection, setNeedsTeamSelection] = useState(isNewDocument);
  
  // Auto-save timer
  const autoSaveTimer = useRef<number | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Load document on mount
  useEffect(() => {
    if (documentId && !isNewDocument) {
      loadDocument();
    } else if (isNewDocument) {
      setTitle('Untitled Document');
      // Initialize with proper rich text structure
      setContent({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ text: "", type: "text" }]
          }
        ]
      });
      setIsEditingTitle(true);
      loadTeams();
    }
  }, [documentId, isNewDocument]);

  // Auto-save functionality - direct save to main content
  useEffect(() => {
    if (document && (content !== document.content || title !== document.title)) {
      // Debug: Log what triggered the auto-save
      console.log('Auto-save triggered:', {
        hasDocument: !!document,
        contentChanged: content !== document.content,
        titleChanged: title !== document.title,
        currentDocumentType: documentType,
        documentTypeFromDoc: document.document_type,
        currentContent: content,
        currentContentType: typeof content,
        documentContent: document.content,
        currentTitle: title,
        documentTitle: document.title
      });

      // Clear existing timer
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      
      // Set new timer for auto-save
      autoSaveTimer.current = setTimeout(() => {
        console.log('Auto-save timer fired, calling saveDocument(). Current documentType:', documentType);
        saveDocument();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [content, title, document]);

  // Save content when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // Force save on unmount if there are changes
      if (document && (content !== document.content || title !== document.title)) {
        console.log('DocumentEditor unmounting - force saving content');
        
        // Clear any pending auto-save
        if (autoSaveTimer.current) {
          clearTimeout(autoSaveTimer.current);
        }
        
        // Immediately auto-save the document
        const token = localStorage.getItem('accessToken');
        if (token && document.id) {
          documentService.autoSaveDocument(token, document.id, content).then(() => {
            console.log('Content auto-saved successfully on unmount');
          }).catch((error) => {
            console.error('Failed to auto-save content on unmount:', error);
          });
        }
      }
    };
  }, [document, content, title]);

  const loadTeams = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      // First get user's organizations
      const orgsResponse = await fetch('http://localhost:8000/api/v1/organizations/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (orgsResponse.ok) {
        const orgsData = await orgsResponse.json();
        if (orgsData.results && orgsData.results.length > 0) {
          // Get teams for the first organization (you might want to let user select organization)
          const orgId = orgsData.results[0].id;
          const teamsResponse = await fetch(`http://localhost:8000/api/v1/organizations/${orgId}/teams/`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (teamsResponse.ok) {
            const teamsData = await teamsResponse.json();
            setTeams(teamsData.results || []);
            if (teamsData.results && teamsData.results.length > 0) {
              setSelectedTeam(teamsData.results[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
      setError('Failed to load teams');
    }
  };

  const loadDocument = async () => {
    if (!documentId) return;
    
    try {
      setLoading(true);
      console.log('Loading document with ID:', documentId);
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      const doc = await documentService.getDocument(token, documentId);
      console.log('Document fetched successfully:', doc);
      setDocument(doc);
      
      // CRITICAL: Use latest_content which prioritizes draft over published content
      const contentToLoad = doc.latest_content || doc.content || '';
      
      console.log('Loading document:', {
        documentId: doc.id,
        documentType: doc.document_type,
        contentType: typeof contentToLoad,
        contentValue: contentToLoad,
        hasLatestContent: !!doc.latest_content,
        hasContent: !!doc.content
      });
      
      setContent(contentToLoad);
      setTitle(doc.title);
      setDocumentType(doc.document_type);
      
      // Log for debugging
      console.log('Document loaded:', {
        hasLatestContent: !!doc.latest_content,
        hasUnsavedChanges: doc.has_unsaved_changes,
        lastAutoSave: doc.last_auto_save
      });
      
      setError(null);
    } catch (err) {
      console.error('Failed to load document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async () => {
    if (!selectedTeam || !title.trim()) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      // Ensure content has proper structure for rich text
      let documentContent = content;
      if (documentType === 'rich_text' || documentType === 'wysiwyg') {
        // If content is empty or not properly structured, create default rich text structure
        if (!content || (typeof content === 'string' && content.trim() === '')) {
          documentContent = {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 1 },
                content: [{ text: title.trim(), type: "text" }]
              }
            ]
          };
        }
      }

        const newDoc = await documentService.createDocument(token, {
          title: title.trim(),
          content: documentContent,
          team_id: selectedTeam,
          document_type: documentType,
          status: 'draft',
          is_public: false,
          tags: [],
          metadata: {
            category: "document",
            priority: "normal"
          },
          editor_settings: {
            theme: 'light',
            font_size: 14,
            toolbar: ['bold', 'italic', 'heading', 'image', 'link'],
            auto_save: true
          }
        });
      
      setDocument(newDoc);
      setNeedsTeamSelection(false);
      setLastSaved(new Date());
      setError(null);
      
      // Update URL to the new document
      window.history.replaceState({}, '', `/documents/${newDoc.id}/edit`);
    } catch (err) {
      console.error('Failed to create document:', err);
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setSaving(false);
    }
  };

  const saveDocument = async () => {
    if (isNewDocument && !document) {
      // For new documents, create first
      return createDocument();
    }
    
    if (!document) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      // Validate and transform content based on document type
      let contentToSave = content;
      
      // Use document type from the loaded document to ensure accuracy
      const actualDocumentType = document.document_type || documentType;
      
      console.log('Auto-save validation - Document type:', actualDocumentType, 'State documentType:', documentType, 'Content type:', typeof content);
      
      // Based on your API logs, it seems ALL document types expect JSON structure
      // Let's handle each document type appropriately
      if (actualDocumentType === 'rich_text' || actualDocumentType === 'wysiwyg') {
        // For rich text documents, ensure content is in proper JSON structure
        if (typeof content === 'string') {
          // Convert plain string to rich text structure
          console.log('Converting plain string to rich text structure:', content);
          contentToSave = {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ text: content, type: "text" }]
              }
            ]
          };
        } else if (!content || typeof content !== 'object' || content.type !== 'doc') {
          // If content is not properly structured, create default structure
          console.log('Creating default rich text structure for invalid content');
          contentToSave = {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ text: "", type: "text" }]
              }
            ]
          };
        }
      } else if (actualDocumentType === 'text') {
        // For plain text documents, also convert to JSON structure
        if (typeof content === 'string') {
          console.log('Converting plain text to JSON structure:', content);
          contentToSave = {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ text: content, type: "text" }]
              }
            ]
          };
        } else if (!content || typeof content !== 'object') {
          // Create default structure for plain text
          console.log('Creating default structure for plain text document');
          contentToSave = {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ text: "", type: "text" }]
              }
            ]
          };
        }
      } else if (actualDocumentType === 'markdown') {
        // For markdown documents, also convert to JSON structure
        if (typeof content === 'string') {
          console.log('Converting markdown to JSON structure:', content);
          contentToSave = {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ text: content, type: "text" }]
              }
            ]
          };
        } else if (!content || typeof content !== 'object') {
          // Create default structure for markdown
          console.log('Creating default structure for markdown document');
          contentToSave = {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ text: "", type: "text" }]
              }
            ]
          };
        }
      }

      // Debug: Log what content we're trying to save
      console.log('Attempting to auto-save content:', {
        actualDocumentType,
        stateDocumentType: documentType,
        originalContentType: typeof content,
        finalContentType: typeof contentToSave,
        contentToSave: contentToSave,
        isValidRichText: (actualDocumentType === 'rich_text' && contentToSave?.type === 'doc')
      });

      // Skip save only if content is null/undefined
      if (contentToSave === null || contentToSave === undefined) {
        console.log('Skipping auto-save: processed content is null/undefined');
        return;
      }

      // Use auto-save endpoint to save as draft
      const result = await documentService.autoSaveDocument(token, document.id, contentToSave);
      
      setLastSaved(new Date(result.last_auto_save));
      setError(null);
      
      console.log('Auto-save successful:', result.message);
    } catch (err) {
      console.error('Failed to auto-save document:', err);
      setError(err instanceof Error ? err.message : 'Failed to auto-save document');
    } finally {
      setSaving(false);
    }
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (document) {
      saveDocument();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      publishDraft();
    }
  };

  // Publish draft to make changes permanent
  const publishDraft = async () => {
    if (!document) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      const result = await documentService.publishDraft(token, document.id, true, 'Manual save');
      
      setLastSaved(new Date());
      setError(null);
      
      console.log('Draft published successfully:', result);
      
      // Reload document to get updated content
      await loadDocument();
    } catch (err) {
      console.error('Failed to publish draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getReadTime = (text: string): number => {
    const wordsPerMinute = 200;
    const wordCount = getWordCount(text);
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const renderMarkdown = (markdown: string): string => {
    if (typeof markdown !== 'string') return '';
    
    // Simple markdown to HTML converter
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/__(.*?)__/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/_(.*?)_/gim, '<em>$1</em>')
      // Code
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
      // Line breaks
      .replace(/\n/gim, '<br>');
    
    return html;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading Document...</p>
        </div>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h3 className="font-bold">Error</h3>
            <p>{error}</p>
          </div>
          <div className="space-x-4">
            <button 
              onClick={() => navigate('/documents')} 
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Back to Documents
            </button>
            <button 
              onClick={loadDocument} 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4 flex-1">
              <Link 
                to="/documents"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              
              <div className="flex-1 max-w-2xl">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTitleSubmit();
                      }
                    }}
                    className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 w-full"
                    placeholder="Document title..."
                    autoFocus
                  />
                ) : (
                  <h1 
                    className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-gray-700"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {title || 'Untitled Document'}
                  </h1>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Save Status */}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    <span>Saving...</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Saved {lastSaved.toLocaleTimeString()}</span>
                  </>
                ) : document ? (
                  <span>Auto-save enabled</span>
                ) : (
                  <span>Ready to create</span>
                )}
              </div>

              {/* Document Stats */}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>
                  {document ? document.word_count : getWordCount(typeof content === 'string' ? content : '')} words
                </span>
                <span>
                  {document ? Math.ceil(document.word_count / 200) : getReadTime(typeof content === 'string' ? content : '')} min read
                </span>
                {document?.media_count !== undefined && (
                  <span>{document.media_count} media</span>
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  document ? documentService.getStatusColor(document.status) : 'bg-gray-100 text-gray-800'
                }`}>
                  {document ? document.status : 'draft'}
                </span>
              </div>

              {/* User Avatar */}
              {user && (
                <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {user.first_name?.[0] || user.username[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team Selection for New Documents */}
      {needsTeamSelection && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-blue-900">Create New Document</h3>
                  <p className="text-blue-700">Configure your document settings before creating</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">Team</label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                  >
                    <option value="">Select a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">Document Type</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as any)}
                    className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                  >
                    <option value="rich_text">✨ Rich Text Editor</option>
                    <option value="wysiwyg">🎨 WYSIWYG Editor</option>
                    <option value="markdown">📝 Markdown</option>
                    <option value="text">📃 Plain Text</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={createDocument}
                    disabled={!selectedTeam || !title.trim() || saving}
                    className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      selectedTeam && title.trim() && !saving
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {saving ? 'Creating...' : 'Create Document'}
                  </button>
                </div>
              </div>
              
              <div className="bg-blue-100 rounded-xl p-3">
                <p className="text-sm text-blue-800">
                  <strong>Rich Text Editor:</strong> Full formatting with media support • 
                  <strong> WYSIWYG:</strong> Visual editing • 
                  <strong> Markdown:</strong> Syntax-based • 
                  <strong> Plain Text:</strong> Simple text only
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Editor */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(documentType === 'rich_text' || documentType === 'wysiwyg') ? (
          <RichTextEditor
            content={content}
            onChange={(newContent) => {
              console.log('RichTextEditor onChange called:', {
                newContentType: typeof newContent,
                newContent: newContent,
                newContentStringified: JSON.stringify(newContent)
              });
              setContent(newContent);
            }}
            documentId={document?.id}
            token={localStorage.getItem('accessToken') || ''}
            readOnly={false}
          />
        ) : documentType === 'markdown' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Markdown Editor */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Markdown Editor</h3>
              <textarea
                value={typeof content === 'string' ? content : ''}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Start writing in Markdown..."
                className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              />
            </div>
            {/* Markdown Preview */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
              <div className="w-full h-96 p-4 border border-gray-300 rounded-lg bg-gray-50 overflow-y-auto prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
              </div>
            </div>
          </div>
        ) : (
          /* Plain Text Editor */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Plain Text Editor</h3>
            </div>
            <textarea
              ref={contentRef}
              value={typeof content === 'string' ? content : ''}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your document..."
              className="w-full h-96 p-8 border-none resize-none focus:outline-none focus:ring-0 text-gray-900 leading-relaxed"
              style={{ fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: '1.6' }}
            />
          </div>
        )}

        {/* Document Info */}
        {document && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Team:</span>
                <span className="ml-2 text-gray-600">{document.team_name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${documentService.getStatusColor(document.status)}`}>
                  {document.status}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <span className="ml-2 text-gray-600">{new Date(document.created_at).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <span className="ml-2 text-gray-600">{new Date(document.updated_at).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Version:</span>
                <span className="ml-2 text-gray-600">{document.current_version}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Your Permission:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  document.user_permission === 'admin' ? 'bg-purple-100 text-purple-800' :
                  document.user_permission === 'editor' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {document.user_permission}
                </span>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-gray-700">Document Stats:</span>
                <div className="ml-2 text-gray-600 flex flex-wrap gap-4 mt-1">
                  <span>📝 {document.word_count || 0} words</span>
                  <span>📊 {document.character_count || 0} characters</span>
                  <span>⏱️ {getReadTime(typeof content === 'string' ? content : document.content_text || '')} min read</span>
                  {document.media_count !== undefined && (
                    <span>📎 {document.media_count} media files</span>
                  )}
                </div>
              </div>
            </div>

            {document.tags.length > 0 && (
              <div className="mt-4">
                <span className="font-medium text-gray-700">Tags:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {document.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentEditor;
