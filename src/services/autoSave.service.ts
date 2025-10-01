import { documentService } from './document.service';

export interface AutoSaveStatus {
  isAutoSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  message: string;
  isError: boolean;
}

export class DocumentAutoSave {
  private documentId: string;
  private authToken: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private lastSavedContent: any = null;
  private isAutoSaving: boolean = false;
  private statusCallback?: (status: AutoSaveStatus) => void;
  private getCurrentContentCallback?: () => any;

  constructor(
    documentId: string, 
    authToken: string,
    getCurrentContent?: () => any,
    onStatusChange?: (status: AutoSaveStatus) => void
  ) {
    this.documentId = documentId;
    this.authToken = authToken;
    this.getCurrentContentCallback = getCurrentContent;
    this.statusCallback = onStatusChange;
  }

  // Start auto-save with specified interval (default: 30 seconds)
  startAutoSave(intervalMs: number = 30000): void {
    if (this.autoSaveInterval) {
      this.stopAutoSave();
    }

    this.autoSaveInterval = setInterval(() => {
      this.performAutoSave();
    }, intervalMs);

    this.updateStatus({
      isAutoSaving: false,
      lastSaved: null,
      hasUnsavedChanges: false,
      message: 'Auto-save enabled',
      isError: false
    });
  }

  // Stop auto-save
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Perform auto-save if content changed
  async performAutoSave(): Promise<boolean> {
    if (this.isAutoSaving || !this.getCurrentContentCallback) {
      return false;
    }

    const currentContent = this.getCurrentContentCallback();
    
    // Skip if content hasn't changed
    if (JSON.stringify(currentContent) === JSON.stringify(this.lastSavedContent)) {
      return false;
    }

    this.isAutoSaving = true;
    this.updateStatus({
      isAutoSaving: true,
      lastSaved: null,
      hasUnsavedChanges: true,
      message: 'Auto-saving...',
      isError: false
    });
    
    try {
      const result = await documentService.autoSaveDocument(
        this.authToken, 
        this.documentId, 
        currentContent
      );

      this.lastSavedContent = currentContent;
      this.updateStatus({
        isAutoSaving: false,
        lastSaved: new Date(result.last_auto_save),
        hasUnsavedChanges: result.has_unsaved_changes,
        message: 'Auto-saved',
        isError: false
      });

      return true;
    } catch (error) {
      console.error('Auto-save error:', error);
      this.updateStatus({
        isAutoSaving: false,
        lastSaved: null,
        hasUnsavedChanges: true,
        message: 'Auto-save failed',
        isError: true
      });
      return false;
    } finally {
      this.isAutoSaving = false;
    }
  }

  // Manual save (publish draft)
  async publishDraft(createVersion: boolean = true, versionSummary: string = ''): Promise<boolean> {
    try {
      this.updateStatus({
        isAutoSaving: true,
        lastSaved: null,
        hasUnsavedChanges: true,
        message: 'Publishing...',
        isError: false
      });

      const result = await documentService.publishDraft(
        this.authToken, 
        this.documentId, 
        createVersion, 
        versionSummary
      );

      this.updateStatus({
        isAutoSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        message: `Published successfully${result.version_created ? ` (v${result.current_version})` : ''}`,
        isError: false
      });

      return true;
    } catch (error) {
      console.error('Publish error:', error);
      this.updateStatus({
        isAutoSaving: false,
        lastSaved: null,
        hasUnsavedChanges: true,
        message: 'Publish failed',
        isError: true
      });
      return false;
    }
  }

  // Discard unsaved changes
  async discardDraft(): Promise<boolean> {
    try {
      this.updateStatus({
        isAutoSaving: true,
        lastSaved: null,
        hasUnsavedChanges: true,
        message: 'Discarding changes...',
        isError: false
      });

      await documentService.discardDraft(this.authToken, this.documentId);

      this.updateStatus({
        isAutoSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        message: 'Draft discarded',
        isError: false
      });

      return true;
    } catch (error) {
      console.error('Discard error:', error);
      this.updateStatus({
        isAutoSaving: false,
        lastSaved: null,
        hasUnsavedChanges: true,
        message: 'Discard failed',
        isError: true
      });
      return false;
    }
  }

  // Force auto-save immediately
  async forceSave(): Promise<boolean> {
    return this.performAutoSave();
  }

  // Update status and notify callback
  private updateStatus(status: AutoSaveStatus): void {
    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }

  // Set the callback for getting current content
  setGetCurrentContentCallback(callback: () => any): void {
    this.getCurrentContentCallback = callback;
  }

  // Set the callback for status updates
  setStatusCallback(callback: (status: AutoSaveStatus) => void): void {
    this.statusCallback = callback;
  }

  // Get current auto-save state
  getStatus(): { isActive: boolean; isAutoSaving: boolean } {
    return {
      isActive: this.autoSaveInterval !== null,
      isAutoSaving: this.isAutoSaving
    };
  }

  // Cleanup
  destroy(): void {
    this.stopAutoSave();
    this.statusCallback = undefined;
    this.getCurrentContentCallback = undefined;
  }
}

// Utility function to create auto-save instance
export function createAutoSave(
  documentId: string,
  authToken: string,
  getCurrentContent?: () => any,
  onStatusChange?: (status: AutoSaveStatus) => void
): DocumentAutoSave {
  return new DocumentAutoSave(documentId, authToken, getCurrentContent, onStatusChange);
}
