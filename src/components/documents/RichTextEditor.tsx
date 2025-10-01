import React, { useState, useEffect, useRef, useCallback } from 'react';
import { documentService, MediaAttachment } from '../../services/document.service';
import './RichTextEditor.css';

interface RichTextEditorProps {
  content: any;
  onChange: (content: any) => void;
  documentId?: string;
  token: string;
  readOnly?: boolean;
}

interface EditorSelection {
  start: number;
  end: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  documentId,
  token,
  readOnly = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastContentRef = useRef<string>('');
  
  // Initialize editor content
  useEffect(() => {
    // Don't update content while user is actively typing
    if (isTyping || !editorRef.current) return;
    
    let expectedHtml = '';
    
    if (typeof content === 'object' && content && content.type === 'doc') {
      expectedHtml = renderRichContent(content);
      console.log('RichTextEditor: Rendering content object to HTML:', expectedHtml);
    } else if (typeof content === 'string') {
      expectedHtml = content;
      console.log('RichTextEditor: Using string content as HTML:', expectedHtml);
    } else if (content === '' || content === null || content === undefined) {
      expectedHtml = '';
    }
    
    // Check if this is the same content we last processed
    const contentString = JSON.stringify(content);
    if (lastContentRef.current === contentString) {
      return; // Skip update if content hasn't actually changed
    }
    
    // Only update if the current HTML is significantly different from what we expect
    const currentHtml = editorRef.current.innerHTML;
    const currentText = editorRef.current.textContent || '';
    const expectedText = expectedHtml.replace(/<[^>]*>/g, ''); // Strip HTML tags for comparison
    
    // If the text content is the same, don't update (prevents losing formatting during typing)
    if (currentText === expectedText && currentText.length > 0) {
      lastContentRef.current = contentString;
      return;
    }
    
    // Only update if content is actually different to avoid cursor jumping
    if (currentHtml !== expectedHtml) {
      console.log('Updating editor content:', { currentHtml, expectedHtml, isTyping });
      
      // Save cursor position before updating
      const selection = window.getSelection();
      let cursorPosition = null;
      
      if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        cursorPosition = {
          startContainer: range.startContainer,
          startOffset: range.startOffset,
          endContainer: range.endContainer,
          endOffset: range.endOffset
        };
      }
      
      editorRef.current.innerHTML = expectedHtml;
      lastContentRef.current = contentString;
      
      // Restore cursor position if it was within the editor
      if (cursorPosition && selection) {
        try {
          const range = document.createRange();
          range.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
          range.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          // If restoration fails, place cursor at the end
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else {
      lastContentRef.current = contentString;
    }
  }, [content, isTyping]);

  // Load media attachments
  useEffect(() => {
    if (documentId) {
      loadMediaAttachments();
    }
  }, [documentId]);

  // Add selection change listener
  useEffect(() => {
    const handleDocumentSelectionChange = () => {
      if (editorRef.current && editorRef.current.contains(document.getSelection()?.anchorNode || null)) {
        handleSelectionChange();
      }
    };

    document.addEventListener('selectionchange', handleDocumentSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleDocumentSelectionChange);
    };
  }, []);

  // Add keyboard shortcuts and special key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editorRef.current || readOnly) return;
      
      // Handle space key specially to ensure cursor visibility
      if (e.key === ' ') {
        // Let the space be typed naturally, but ensure cursor remains visible
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            // Force a slight cursor movement to ensure visibility
            const range = selection.getRangeAt(0);
            range.collapse(false); // Collapse to end
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }, 0);
        return;
      }
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            execCommand('bold');
            break;
          case 'i':
            e.preventDefault();
            execCommand('italic');
            break;
          case 'u':
            e.preventDefault();
            execCommand('underline');
            break;
          case 'z':
            e.preventDefault();
            execCommand('undo');
            break;
          case 'y':
            e.preventDefault();
            execCommand('redo');
            break;
        }
      }
    };

    if (editorRef.current) {
      editorRef.current.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [readOnly]);

  // Cleanup timeout on unmount and save content
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Force save content before unmounting
      if (editorRef.current && !readOnly) {
        const html = editorRef.current.innerHTML;
        const richContent = parseHtmlToRichContent(html);
        
        const currentContent = JSON.stringify(richContent);
        const previousContent = JSON.stringify(content);
        
        if (currentContent !== previousContent) {
          onChange(richContent);
        }
      }
    };
  }, [content, onChange, readOnly]);

  // Add beforeunload listener to save content when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editorRef.current && !readOnly && isTyping) {
        // Force save content before page unload
        const html = editorRef.current.innerHTML;
        const richContent = parseHtmlToRichContent(html);
        
        const currentContent = JSON.stringify(richContent);
        const previousContent = JSON.stringify(content);
        
        if (currentContent !== previousContent) {
          onChange(richContent);
          
          // Show warning if there are unsaved changes
          e.preventDefault();
          e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
          return 'You have unsaved changes. Are you sure you want to leave?';
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [content, onChange, readOnly, isTyping]);

  const loadMediaAttachments = async () => {
    if (!documentId) return;
    try {
      const media = await documentService.getDocumentMedia(token, documentId);
      setMediaAttachments(media);
    } catch (error) {
      console.error('Failed to load media attachments:', error);
    }
  };

  // Convert rich content JSON to HTML
  const renderRichContent = (content: any): string => {
    if (!content || !content.content) return '';
    
    return content.content.map((node: any) => {
      switch (node.type) {
        case 'heading':
          const level = node.attrs?.level || 1;
          const headingText = node.content?.[0]?.text || '';
          return `<h${level}>${headingText}</h${level}>`;
          
        case 'paragraph':
          const paragraphContent = node.content?.map((textNode: any) => {
            let text = textNode.text || '';
            if (textNode.marks) {
              textNode.marks.forEach((mark: any) => {
                switch (mark.type) {
                  case 'strong':
                    text = `<strong>${text}</strong>`;
                    break;
                  case 'em':
                    text = `<em>${text}</em>`;
                    break;
                  case 'underline':
                    text = `<u>${text}</u>`;
                    break;
                  case 'code':
                    text = `<code>${text}</code>`;
                    break;
                  case 'textStyle':
                    if (mark.attrs?.color) {
                      text = `<span style="color: ${mark.attrs.color}">${text}</span>`;
                    }
                    if (mark.attrs?.backgroundColor) {
                      text = `<span style="background-color: ${mark.attrs.backgroundColor}">${text}</span>`;
                    }
                    break;
                }
              });
            }
            return text;
          }).join('') || '';
          // Ensure empty paragraphs have a BR tag for proper spacing
          return `<p>${paragraphContent || '<br>'}</p>`;
          
        case 'bulletList':
          const listItems = node.content?.map((item: any) => {
            const itemContent = item.content?.[0]?.content?.[0]?.text || '';
            return `<li>${itemContent}</li>`;
          }).join('') || '';
          return `<ul>${listItems}</ul>`;
          
        case 'orderedList':
          const orderedItems = node.content?.map((item: any) => {
            const itemContent = item.content?.[0]?.content?.[0]?.text || '';
            return `<li>${itemContent}</li>`;
          }).join('') || '';
          return `<ol>${orderedItems}</ol>`;
          
        case 'blockquote':
          const quoteContent = node.content?.[0]?.content?.[0]?.text || '';
          return `<blockquote>${quoteContent}</blockquote>`;
          
        case 'codeBlock':
          const codeContent = node.content?.[0]?.text || '';
          const language = node.attrs?.language || '';
          return `<pre><code class="language-${language}">${codeContent}</code></pre>`;
          
        case 'image':
          const { src, alt, width, height } = node.attrs || {};
          return `<img src="${src}" alt="${alt || ''}" style="width: ${width || 'auto'}; height: ${height || 'auto'};" />`;
          
        default:
          return '';
      }
    }).join('');
    
    console.log('Rendered rich content to HTML:', {
      contentNodes: richContent.content?.length || 0,
      generatedHtml: html.substring(0, 200) + '...',
      hasParagraphs: html.includes('<p>'),
      hasHeadings: /h[1-6]/.test(html)
    });
    
    return html;
  };

  // Convert HTML back to rich content JSON
  const parseHtmlToRichContent = (html: string): any => {
    // This is a simplified parser - in a real app you'd use a proper HTML to ProseMirror parser
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const content: any[] = [];
    
    // Handle both element and text nodes
    Array.from(tempDiv.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        // Handle direct text nodes
        const text = node.textContent?.trim();
        if (text) {
          content.push({
            type: 'paragraph',
            content: [{ type: 'text', text: text }]
          });
        }
        return;
      }
      
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      
      const element = node as Element;
      switch (element.tagName.toLowerCase()) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          content.push({
            type: 'heading',
            attrs: { level: parseInt(element.tagName[1]) },
            content: [{ type: 'text', text: element.textContent }]
          });
          break;
          
        case 'p':
          const textContent = parseTextContent(element);
          // Only add paragraph if it has actual content or if it's an empty paragraph with BR
          if (textContent.length > 0 || element.innerHTML === '<br>' || element.innerHTML === '') {
            content.push({
              type: 'paragraph',
              content: textContent.length > 0 ? textContent : [{ type: 'text', text: '' }]
            });
          }
          break;
          
        case 'br':
          // Handle standalone BR tags as empty paragraphs
          content.push({
            type: 'paragraph',
            content: [{ type: 'text', text: '' }]
          });
          break;
          
        case 'ul':
          const bulletItems = Array.from(element.children).map(li => ({
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: li.textContent }]
            }]
          }));
          content.push({
            type: 'bulletList',
            content: bulletItems
          });
          break;
          
        case 'ol':
          const orderedItems = Array.from(element.children).map(li => ({
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: li.textContent }]
            }]
          }));
          content.push({
            type: 'orderedList',
            content: orderedItems
          });
          break;
          
        case 'blockquote':
          content.push({
            type: 'blockquote',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: element.textContent }]
            }]
          });
          break;
          
        case 'pre':
          const codeElement = element.querySelector('code');
          const codeText = codeElement?.textContent || '';
          const language = codeElement?.className.replace('language-', '') || '';
          content.push({
            type: 'codeBlock',
            attrs: { language },
            content: [{ type: 'text', text: codeText }]
          });
          break;
          
        case 'img':
          const img = element as HTMLImageElement;
          content.push({
            type: 'image',
            attrs: {
              src: img.src,
              alt: img.alt,
              width: img.style.width || img.width,
              height: img.style.height || img.height
            }
          });
          break;
      }
    });
    
    console.log('Parsed HTML to rich content:', { 
      html: html.substring(0, 200) + '...', 
      parsedContent: content,
      contentCount: content.length,
      hasNormalText: content.some(c => c.type === 'paragraph')
    });
    
    return {
      type: 'doc',
      content
    };
  };

  const parseTextContent = (element: Element): any[] => {
    const result: any[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text.trim()) {
          const marks: any[] = [];
          let parent = node.parentElement;
          
          while (parent && parent !== element) {
            switch (parent.tagName.toLowerCase()) {
              case 'strong':
              case 'b':
                marks.push({ type: 'strong' });
                break;
              case 'em':
              case 'i':
                marks.push({ type: 'em' });
                break;
              case 'u':
                marks.push({ type: 'underline' });
                break;
              case 'code':
                marks.push({ type: 'code' });
                break;
              case 'span':
                const style = (parent as HTMLElement).style;
                if (style.color) {
                  console.log('Parsing color from span:', style.color);
                  marks.push({ 
                    type: 'textStyle', 
                    attrs: { color: style.color }
                  });
                }
                if (style.backgroundColor) {
                  console.log('Parsing background color from span:', style.backgroundColor);
                  marks.push({ 
                    type: 'textStyle', 
                    attrs: { backgroundColor: style.backgroundColor }
                  });
                }
                break;
            }
            parent = parent.parentElement;
          }
          
          result.push({
            type: 'text',
            text: text,
            marks: marks.length > 0 ? marks : undefined
          });
        }
      }
    }
    
    return result.length > 0 ? result : [{ type: 'text', text: element.textContent || '' }];
  };

  const updateActiveFormats = () => {
    const newActiveFormats = new Set<string>();
    
    try {
      if (document.queryCommandState('bold')) newActiveFormats.add('bold');
      if (document.queryCommandState('italic')) newActiveFormats.add('italic');
      if (document.queryCommandState('underline')) newActiveFormats.add('underline');
      if (document.queryCommandState('strikeThrough')) newActiveFormats.add('strikethrough');
    } catch (e) {
      // queryCommandState might fail in some browsers
      console.warn('queryCommandState failed:', e);
    }
    
    setActiveFormats(newActiveFormats);
  };

  const handleContentChange = useCallback(() => {
    if (!editorRef.current || readOnly) return;
    
    // Set typing state to prevent content resets during typing
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to detect end of typing - reduced to 300ms for faster auto-save
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      
      // Only process content after typing has stopped
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        const richContent = parseHtmlToRichContent(html);
        
        // Only call onChange if content actually changed
        const currentContent = JSON.stringify(richContent);
        const previousContent = JSON.stringify(content);
        
        if (currentContent !== previousContent) {
          console.log('RichTextEditor: Content changed, calling onChange with:', richContent);
          console.log('RichTextEditor: Detailed content structure:', JSON.stringify(richContent, null, 2));
          onChange(richContent);
        }
      }
    }, 300);
    
    // Update active formats immediately for UI feedback
    updateActiveFormats();
  }, [content, onChange, readOnly]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSavedSelection(selection.getRangeAt(0).cloneRange());
    }
  };

  const restoreSelection = () => {
    if (savedSelection && editorRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
        editorRef.current.focus();
      }
    }
  };

  const ensureCursorVisibility = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // If no selection, create one at the end of content
      const range = document.createRange();
      const lastChild = editorRef.current.lastChild;
      
      if (lastChild) {
        if (lastChild.nodeType === Node.TEXT_NODE) {
          range.setStart(lastChild, lastChild.textContent?.length || 0);
        } else {
          range.setStartAfter(lastChild);
        }
      } else {
        range.setStart(editorRef.current, 0);
      }
      
      range.collapse(true);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const handleSelectionChange = () => {
    saveSelection();
    updateActiveFormats();
    ensureCursorVisibility();
  };

  const execCommand = (command: string, value?: string) => {
    if (readOnly || !editorRef.current) return;
    
    // Restore the saved selection first
    restoreSelection();
    
    // Small delay to ensure selection is restored
    setTimeout(() => {
      // Execute the command
      const success = document.execCommand(command, false, value);
      
      if (!success) {
        console.warn(`Command ${command} failed, trying alternative approach`);
        // Alternative approach for bold/italic
        if (command === 'bold') {
          wrapSelectedText('strong');
        } else if (command === 'italic') {
          wrapSelectedText('em');
        } else if (command === 'underline') {
          wrapSelectedText('u');
        } else if (command === 'strikeThrough') {
          wrapSelectedText('s');
        }
      }
      
      handleContentChange();
    }, 10);
  };

  const wrapSelectedText = (tagName: string) => {
    // Use saved selection if available, otherwise current selection
    const range = savedSelection || (window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0) : null);
    if (!range || range.collapsed) return;
    
    // Check if the selected text is already wrapped with this tag
    const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
      ? range.commonAncestorContainer.parentElement 
      : range.commonAncestorContainer as Element;
      
    if (parentElement && parentElement.tagName?.toLowerCase() === tagName.toLowerCase()) {
      // Unwrap the text - preserve all content including spaces
      const fragment = document.createDocumentFragment();
      while (parentElement.firstChild) {
        fragment.appendChild(parentElement.firstChild);
      }
      parentElement.parentNode?.replaceChild(fragment, parentElement);
    } else {
      // Wrap the text - preserve exact content including spaces
      const wrapper = document.createElement(tagName);
      try {
        // Extract contents preserves all nodes including text and whitespace
        const contents = range.extractContents();
        wrapper.appendChild(contents);
        range.insertNode(wrapper);
      } catch (e) {
        // Fallback: clone range contents to preserve formatting
        try {
          const contents = range.cloneContents();
          wrapper.appendChild(contents);
          range.deleteContents();
          range.insertNode(wrapper);
        } catch (e2) {
          // Final fallback: use innerHTML to preserve spaces
          const selectedHTML = range.toString();
          wrapper.innerHTML = selectedHTML;
          range.deleteContents();
          range.insertNode(wrapper);
        }
      }
    }
    
    // Clear selection and focus editor
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const insertHeading = (level: number) => {
    if (readOnly || !editorRef.current) return;
    
    console.log(`Inserting heading level ${level}`);
    // Don't use execCommand at all - do manual insertion
    const selection = window.getSelection();
    if (!selection) return;
    
    let range: Range;
    
    // If we have a saved selection, use it
    if (savedSelection) {
      range = savedSelection.cloneRange();
    } else if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      // Create a range at the end of content
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
    }
    
    try {
      // Clear current selection
      selection.removeAllRanges();
      
      // Create heading element
      const heading = document.createElement(`h${level}`);
      console.log(`Created heading element: h${level}`);
      
      if (!range.collapsed) {
        // If text is selected, use it as heading text
        const selectedText = range.toString();
        heading.textContent = selectedText;
        console.log(`Set heading text to: "${selectedText}"`);
        range.deleteContents();
      } else {
        // No selection, create editable placeholder heading
        heading.textContent = '';
        heading.setAttribute('data-placeholder', `Type your heading here...`);
        heading.style.minHeight = '1em';
        console.log(`Created empty heading with placeholder`);
      }
      
      // Insert the heading
      range.insertNode(heading);
      
      // Add a paragraph after the heading for continued typing
      const paragraph = document.createElement('p');
      paragraph.innerHTML = '<br>'; // Empty paragraph with line break
      range.setStartAfter(heading);
      range.insertNode(paragraph);
      
      // Position cursor inside the heading for immediate editing
      if (heading.textContent === '') {
        range.selectNodeContents(heading);
        range.collapse(true);
      } else {
        // Position cursor in the paragraph after the heading
        range.selectNodeContents(paragraph);
        range.collapse(true);
      }
      selection.addRange(range);
      
      // Focus the editor
      editorRef.current.focus();
      
    } catch (error) {
      console.error('Error in insertHeading:', error);
    }
  };

  const insertList = (ordered: boolean = false) => {
    if (readOnly || !editorRef.current) return;
    
    // Restore selection first
    restoreSelection();
    
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }
      
      const range = selection.getRangeAt(0);
      
      // If there's selected text, create a list with that text as the first item
      if (!range.collapsed) {
        const selectedContent = range.extractContents();
        const list = document.createElement(ordered ? 'ol' : 'ul');
        const listItem = document.createElement('li');
        listItem.appendChild(selectedContent);
        list.appendChild(listItem);
        range.insertNode(list);
        
        // Place cursor at the end of the list item
        const newRange = document.createRange();
        newRange.selectNodeContents(listItem);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // Try using execCommand first as fallback
        try {
          const success = document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
          if (!success) {
            // Manual list creation if execCommand fails
            const list = document.createElement(ordered ? 'ol' : 'ul');
            const listItem = document.createElement('li');
            listItem.textContent = 'List item';
            list.appendChild(listItem);
            range.insertNode(list);
            
            // Select the list item text for easy editing
            const newRange = document.createRange();
            newRange.selectNodeContents(listItem);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        } catch (e) {
          console.warn('execCommand failed, using manual list creation:', e);
          // Manual list creation
          const list = document.createElement(ordered ? 'ol' : 'ul');
          const listItem = document.createElement('li');
          listItem.textContent = 'List item';
          list.appendChild(listItem);
          range.insertNode(list);
          
          // Select the list item text for easy editing
          const newRange = document.createRange();
          newRange.selectNodeContents(listItem);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      
      handleContentChange();
    }, 10);
  };

  const insertLink = () => {
    if (readOnly || !editorRef.current) return;
    
    // Restore selection first
    restoreSelection();
    
    const url = prompt('Enter URL:');
    if (!url) return;
    
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }
      
      const range = selection.getRangeAt(0);
      
      // If there's selected text, make it a link
      if (!range.collapsed) {
        const selectedContent = range.extractContents();
        const link = document.createElement('a');
        link.href = url;
        link.appendChild(selectedContent);
        range.insertNode(link);
        
        // Place cursor after the link
        range.setStartAfter(link);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // If no selection, create a link with the URL as text
        const link = document.createElement('a');
        link.href = url;
        link.textContent = url;
        range.insertNode(link);
        
        // Place cursor after the link
        range.setStartAfter(link);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      handleContentChange();
    }, 10);
  };

  const changeTextColor = (color: string) => {
    if (readOnly) return;
    console.log('Applying text color:', color);
    // Restore selection first
    restoreSelection();
    
    // Try multiple color methods for better browser compatibility
    setTimeout(() => {
      let success = false;
      
      // Method 1: Try foreColor
      try {
        success = document.execCommand('foreColor', false, color);
        console.log('foreColor success:', success);
      } catch (e) {
        console.warn('foreColor failed:', e);
      }
      
      // Method 2: Try styleWithCSS + foreColor
      if (!success) {
        try {
          document.execCommand('styleWithCSS', false, 'true');
          success = document.execCommand('foreColor', false, color);
        } catch (e) {
          console.warn('styleWithCSS + foreColor failed:', e);
        }
      }
      
      // Method 3: Manual styling
      if (!success && savedSelection) {
        try {
          const range = savedSelection;
          const span = document.createElement('span');
          span.style.color = color;
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        } catch (e) {
          console.warn('Manual color styling failed:', e);
        }
      }
      
      console.log('Text color applied, triggering content change');
      handleContentChange();
      setShowColorPicker(false);
    }, 10);
  };

  const changeBackgroundColor = (color: string) => {
    if (readOnly) return;
    // Restore selection first
    restoreSelection();
    
    setTimeout(() => {
      let success = false;
      
      // Method 1: Try backColor
      try {
        success = document.execCommand('backColor', false, color);
      } catch (e) {
        console.warn('backColor failed:', e);
      }
      
      // Method 2: Try hiliteColor
      if (!success) {
        try {
          success = document.execCommand('hiliteColor', false, color);
        } catch (e) {
          console.warn('hiliteColor failed:', e);
        }
      }
      
      // Method 3: Manual styling
      if (!success && savedSelection) {
        try {
          const range = savedSelection;
          const span = document.createElement('span');
          span.style.backgroundColor = color;
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        } catch (e) {
          console.warn('Manual background color styling failed:', e);
        }
      }
      
      handleContentChange();
      setShowColorPicker(false);
    }, 10);
  };

  const handleMediaUpload = async (files: FileList | null) => {
    if (!files || !documentId || readOnly) return;
    
    setUploadingMedia(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const media = await documentService.uploadMedia(token, documentId, file, {
          usageType: 'inline',
          altText: file.name
        });
        
        // Insert media into editor
        if (media.is_image) {
          const img = `<img src="${media.file_url}" alt="${media.alt_text}" style="max-width: 100%; height: auto;" />`;
          document.execCommand('insertHTML', false, img);
        } else {
          const link = `<a href="${media.file_url}" target="_blank">${documentService.getMediaTypeIcon(media.media_type)} ${media.filename}</a>`;
          document.execCommand('insertHTML', false, link);
        }
        
        return media;
      });
      
      const uploadedMedia = await Promise.all(uploadPromises);
      setMediaAttachments(prev => [...prev, ...uploadedMedia]);
      handleContentChange();
      
    } catch (error) {
      console.error('Failed to upload media:', error);
    } finally {
      setUploadingMedia(false);
      setShowMediaUpload(false);
    }
  };

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0',
    '#808080', '#FF9999', '#99FF99', '#9999FF', '#FFFF99', '#FF99FF', '#99FFFF'
  ];

  if (readOnly) {
    return (
      <div className="rich-text-editor readonly">
        <div 
          className="editor-content"
          dangerouslySetInnerHTML={{ __html: typeof content === 'object' ? renderRichContent(content) : content }}
        />
      </div>
    );
  }

  return (
    <div className="rich-text-editor border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="toolbar bg-gray-50 border-b border-gray-200 p-3 flex flex-wrap gap-2">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r border-gray-300 pr-2">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('bold')}
            className={`p-2 rounded transition-colors ${
              activeFormats.has('bold') 
                ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                : 'hover:bg-gray-200'
            }`}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('italic')}
            className={`p-2 rounded transition-colors ${
              activeFormats.has('italic') 
                ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                : 'hover:bg-gray-200'
            }`}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('underline')}
            className={`p-2 rounded transition-colors ${
              activeFormats.has('underline') 
                ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                : 'hover:bg-gray-200'
            }`}
            title="Underline (Ctrl+U)"
          >
            <u>U</u>
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('strikeThrough')}
            className={`p-2 rounded transition-colors ${
              activeFormats.has('strikethrough') 
                ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                : 'hover:bg-gray-200'
            }`}
            title="Strikethrough"
          >
            <s>S</s>
          </button>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r border-gray-300 pr-2">
          {[1, 2, 3, 4, 5, 6].map(level => (
            <button
              key={level}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertHeading(level)}
              className="p-2 hover:bg-gray-200 rounded transition-colors text-sm"
              title={`Heading ${level}`}
            >
              H{level}
            </button>
          ))}
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-gray-300 pr-2">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertList(false)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Bullet List"
          >
            • List
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertList(true)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Numbered List"
          >
            1. List
          </button>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 border-r border-gray-300 pr-2">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('justifyLeft')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Align Left"
          >
            ⬅
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('justifyCenter')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Align Center"
          >
            ⬌
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('justifyRight')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Align Right"
          >
            ➡
          </button>
        </div>

        {/* Colors */}
        <div className="flex gap-1 border-r border-gray-300 pr-2 relative">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Text Color"
          >
            🎨
          </button>
          
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
              <div className="mb-2 text-sm font-semibold">Text Color</div>
              <div className="grid grid-cols-7 gap-1 mb-3">
                {colors.map(color => (
                  <button
                    key={color}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => changeTextColor(color)}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="mb-2 text-sm font-semibold">Background Color</div>
              <div className="grid grid-cols-7 gap-1">
                {colors.map(color => (
                  <button
                    key={`bg-${color}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => changeBackgroundColor(color)}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Insert */}
        <div className="flex gap-1 border-r border-gray-300 pr-2">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertLink}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Insert Link"
          >
            🔗
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('insertHorizontalRule')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Horizontal Line"
          >
            ➖
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowMediaUpload(!showMediaUpload)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Insert Media"
            disabled={!documentId}
          >
            📎
          </button>
        </div>

        {/* Format */}
        <div className="flex gap-1">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('removeFormat')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Clear Formatting"
          >
            🧹
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('undo')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Undo"
          >
            ↶
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('redo')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Redo"
          >
            ↷
          </button>
        </div>
      </div>

      {/* Media Upload Panel */}
      {showMediaUpload && documentId && (
        <div className="media-upload-panel bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-blue-900">Insert Media</h3>
            <button
              onClick={() => setShowMediaUpload(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
          
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={(e) => handleMediaUpload(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {uploadingMedia ? 'Uploading...' : '📁 Choose Files'}
            </button>
            
            <div className="text-sm text-blue-700 flex items-center">
              Supported: Images, Videos, Audio, PDFs, Documents
            </div>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleContentChange}
        onBlur={(e) => {
          // Force save on blur to prevent content loss
          console.log('Editor blur event - saving content');
          
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          setIsTyping(false);
          
          if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            const richContent = parseHtmlToRichContent(html);
            
            const currentContent = JSON.stringify(richContent);
            const previousContent = JSON.stringify(content);
            
            if (currentContent !== previousContent) {
              console.log('Content changed on blur, saving...');
              onChange(richContent);
              
              // Update the last content ref to prevent duplicate saves
              lastContentRef.current = currentContent;
            } else {
              console.log('No content changes detected on blur');
            }
          }
        }}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onFocus={(e) => {
          handleSelectionChange();
          // Ensure cursor is visible when editor gains focus
          setTimeout(() => {
            ensureCursorVisibility();
          }, 0);
        }}
        onClick={(e) => {
          // Ensure cursor is visible on click
          setTimeout(() => {
            ensureCursorVisibility();
          }, 0);
        }}
        className="editor-content p-4 min-h-96 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 max-w-none"
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: '16px',
          lineHeight: '1.6'
        }}
        data-placeholder="Start writing your document..."
        suppressContentEditableWarning={true}
      />

      {/* Media Attachments */}
      {mediaAttachments.length > 0 && (
        <div className="media-attachments border-t border-gray-200 p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3">
            Attachments ({mediaAttachments.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {mediaAttachments.map(media => (
              <div key={media.id} className="media-item bg-white rounded-lg border border-gray-200 p-3">
                {media.is_image ? (
                  <img
                    src={media.file_url}
                    alt={media.alt_text}
                    className="w-full h-20 object-cover rounded mb-2"
                  />
                ) : (
                  <div className="w-full h-20 flex items-center justify-center bg-gray-100 rounded mb-2">
                    <span className="text-2xl">
                      {documentService.getMediaTypeIcon(media.media_type)}
                    </span>
                  </div>
                )}
                <div className="text-sm">
                  <div className="font-medium truncate">{media.filename}</div>
                  <div className="text-gray-500">
                    {media.file_size && documentService.formatFileSize(media.file_size)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
