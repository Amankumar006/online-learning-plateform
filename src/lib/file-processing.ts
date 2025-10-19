/**
 * File Processing Service
 * Handles extraction and processing of different file types
 */

export interface ProcessedFile {
    id: string;
    name: string;
    type: 'image' | 'pdf' | 'document' | 'other';
    size: number;
    content?: string;
    preview?: string;
    metadata?: Record<string, any>;
}

export class FileProcessingService {
    /**
     * Process an uploaded file and extract its content
     */
    static async processFile(file: File): Promise<ProcessedFile> {
        const id = Math.random().toString(36).substr(2, 9);
        const type = FileProcessingService.getFileType(file);
        
        const processedFile: ProcessedFile = {
            id,
            name: file.name,
            type,
            size: file.size,
        };

        try {
            switch (type) {
                case 'image':
                    processedFile.preview = await FileProcessingService.createImagePreview(file);
                    processedFile.content = `Image: ${file.name} (${FileProcessingService.formatFileSize(file.size)})`;
                    break;
                
                case 'pdf':
                    processedFile.content = await FileProcessingService.extractPDFText(file);
                    break;
                
                case 'document':
                    processedFile.content = await FileProcessingService.extractTextContent(file);
                    break;
                
                default:
                    processedFile.content = `File: ${file.name} (${FileProcessingService.formatFileSize(file.size)})`;
            }
        } catch (error) {
            console.error('Error processing file:', error);
            processedFile.content = `Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

        return processedFile;
    }

    /**
     * Determine file type based on MIME type and extension
     */
    static getFileType(file: File): ProcessedFile['type'] {
        const mimeType = file.type.toLowerCase();
        const extension = file.name.split('.').pop()?.toLowerCase() || '';

        if (mimeType.startsWith('image/')) {
            return 'image';
        }
        
        if (mimeType === 'application/pdf' || extension === 'pdf') {
            return 'pdf';
        }
        
        const documentTypes = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown',
            'application/rtf'
        ];
        
        const documentExtensions = ['doc', 'docx', 'txt', 'md', 'rtf'];
        
        if (documentTypes.includes(mimeType) || documentExtensions.includes(extension)) {
            return 'document';
        }
        
        return 'other';
    }

    /**
     * Create image preview (base64 data URL)
     */
    static createImagePreview(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                resolve(result);
            };
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Extract text content from PDF files
     * Note: This is a simplified implementation. For production, consider using:
     * - pdf-parse for server-side processing
     * - PDF.js for client-side processing
     */
    static async extractPDFText(file: File): Promise<string> {
        try {
            // For now, we'll use a placeholder implementation
            // In a real app, you'd want to use a proper PDF parsing library
            
            // Option 1: Send to server for processing
            // const formData = new FormData();
            // formData.append('file', file);
            // const response = await fetch('/api/extract-pdf', { method: 'POST', body: formData });
            // return await response.text();
            
            // Option 2: Use PDF.js (client-side)
            // This would require installing pdfjs-dist package
            
            // Placeholder implementation
            return `PDF Document: ${file.name}
            
This is a PDF file that would be processed to extract text content.
File size: ${FileProcessingService.formatFileSize(file.size)}

To implement full PDF text extraction, you can:
1. Use pdf-parse on the server side
2. Use PDF.js for client-side processing
3. Send the file to a document processing API

The extracted text would appear here and be available for AI analysis.`;
            
        } catch (error) {
            throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extract text content from document files
     */
    static extractTextContent(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const result = e.target?.result as string;
                
                // For .docx files, you'd need a proper parser like mammoth.js
                if (file.name.endsWith('.docx')) {
                    // Placeholder for DOCX processing
                    resolve(`DOCX Document: ${file.name}
                    
This is a Word document that would be processed to extract text content.
File size: ${FileProcessingService.formatFileSize(file.size)}

To implement full DOCX text extraction, consider using:
- mammoth.js for client-side processing
- A server-side document processing service

The extracted text content would appear here.`);
                } else {
                    // For plain text files
                    resolve(result);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read document file'));
            
            // Read as text for most document types
            reader.readAsText(file);
        });
    }

    /**
     * Format file size in human-readable format
     */
    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Validate file before processing
     */
    static validateFile(file: File): { valid: boolean; error?: string } {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            // Images
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown',
            'application/rtf'
        ];

        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File size (${FileProcessingService.formatFileSize(file.size)}) exceeds the 10MB limit`
            };
        }

        if (!allowedTypes.includes(file.type) && !FileProcessingService.isAllowedExtension(file.name)) {
            return {
                valid: false,
                error: `File type "${file.type}" is not supported. Please upload images, PDFs, or document files.`
            };
        }

        return { valid: true };
    }

    /**
     * Check if file extension is allowed (fallback for MIME type checking)
     */
    private static isAllowedExtension(filename: string): boolean {
        const allowedExtensions = [
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
            'pdf',
            'doc', 'docx',
            'txt', 'md', 'rtf'
        ];
        
        const extension = filename.split('.').pop()?.toLowerCase();
        return extension ? allowedExtensions.includes(extension) : false;
    }

    /**
     * Create a summary of processed files for AI context
     */
    static createFilesSummary(files: ProcessedFile[]): string {
        if (files.length === 0) return '';

        const summary = files.map(file => {
            let content = `File: ${file.name} (${file.type}, ${FileProcessingService.formatFileSize(file.size)})`;
            
            if (file.content && file.content.length > 0) {
                // Truncate very long content
                const maxLength = 2000;
                const truncatedContent = file.content.length > maxLength 
                    ? file.content.substring(0, maxLength) + '...[truncated]'
                    : file.content;
                
                content += `\nContent: ${truncatedContent}`;
            }
            
            return content;
        }).join('\n\n---\n\n');

        return `User has uploaded ${files.length} file(s):\n\n${summary}`;
    }
}

/**
 * Hook for file processing with React state management
 */
export function useFileProcessing() {
    const processFiles = async (fileList: FileList): Promise<ProcessedFile[]> => {
        const files = Array.from(fileList);
        const processedFiles: ProcessedFile[] = [];

        for (const file of files) {
            const validation = FileProcessingService.validateFile(file);
            
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            const processedFile = await FileProcessingService.processFile(file);
            processedFiles.push(processedFile);
        }

        return processedFiles;
    };

    return {
        processFiles,
        validateFile: FileProcessingService.validateFile,
        formatFileSize: FileProcessingService.formatFileSize,
        createFilesSummary: FileProcessingService.createFilesSummary
    };
}