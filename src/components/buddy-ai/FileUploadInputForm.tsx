"use client";

import { useState, useRef, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
    Loader2, 
    Mic, 
    Send, 
    Globe, 
    Search, 
    Paperclip, 
    Image as ImageIcon, 
    FileText, 
    File, 
    X, 
    Upload,
    Eye,
    Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
    id: string;
    file: File;
    type: 'image' | 'pdf' | 'document' | 'other';
    preview?: string;
    content?: string;
    status: 'uploading' | 'processing' | 'ready' | 'error';
    error?: string;
}

interface FileUploadInputFormProps {
    input: string;
    onInputChange: (value: string) => void;
    onSend: (message: string, files?: UploadedFile[]) => void;
    isLoading: boolean;
    isListening: boolean;
    onMicClick: () => void;
    webSearchEnabled?: boolean;
    onWebSearchToggle?: () => void;
}

export function FileUploadInputForm({
    input,
    onInputChange,
    onSend,
    isLoading,
    isListening,
    onMicClick,
    webSearchEnabled = false,
    onWebSearchToggle
}: FileUploadInputFormProps) {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading && (input.trim() || uploadedFiles.length > 0)) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = () => {
        const readyFiles = uploadedFiles.filter(f => f.status === 'ready');
        console.log('Sending files:', readyFiles.length);
        console.log('File details:', readyFiles.map(f => ({ 
            name: f.file.name, 
            type: f.type, 
            hasPreview: !!f.preview,
            previewLength: f.preview?.length || 0,
            status: f.status 
        })));
        onSend(input, readyFiles);
        setUploadedFiles([]);
    };

    const getFileType = (file: File): UploadedFile['type'] => {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type === 'application/pdf') return 'pdf';
        if (file.type.includes('document') || file.type.includes('text') || 
            file.name.endsWith('.docx') || file.name.endsWith('.doc') || 
            file.name.endsWith('.txt') || file.name.endsWith('.md')) return 'document';
        return 'other';
    };

    const processFile = async (file: File): Promise<UploadedFile> => {
        const id = Math.random().toString(36).substr(2, 9);
        const fileType = getFileType(file);
        
        const uploadedFile: UploadedFile = {
            id,
            file,
            type: fileType,
            status: 'uploading'
        };

        // Create preview for images
        if (fileType === 'image') {
            try {
                console.log('Creating image preview for:', file.name);
                const preview = await createImagePreview(file);
                uploadedFile.preview = preview;
                console.log('Image preview created, length:', preview.length);
            } catch (error) {
                console.error('Error creating image preview:', error);
            }
        }

        // Process file content
        try {
            uploadedFile.status = 'processing';
            
            if (fileType === 'image') {
                // For images, we'll use the AI vision capabilities
                uploadedFile.status = 'ready';
            } else if (fileType === 'pdf') {
                // For PDFs, we'd need a PDF processing library
                uploadedFile.content = await extractPDFText(file);
                uploadedFile.status = 'ready';
            } else if (fileType === 'document') {
                // For text documents
                uploadedFile.content = await extractTextContent(file);
                uploadedFile.status = 'ready';
            } else {
                uploadedFile.status = 'ready';
                uploadedFile.content = `File: ${file.name} (${formatFileSize(file.size)})`;
            }
        } catch (error) {
            uploadedFile.status = 'error';
            uploadedFile.error = error instanceof Error ? error.message : 'Failed to process file';
        }

        return uploadedFile;
    };

    const createImagePreview = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const extractPDFText = async (file: File): Promise<string> => {
        // This is a placeholder - you'd need to implement PDF text extraction
        // You could use libraries like pdf-parse or pdf2pic
        return `PDF content extraction would be implemented here for: ${file.name}`;
    };

    const extractTextContent = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleFileSelect = useCallback(async (files: FileList) => {
        const maxFiles = 5;
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (uploadedFiles.length + files.length > maxFiles) {
            toast({
                variant: "destructive",
                title: "Too many files",
                description: `You can upload a maximum of ${maxFiles} files at once.`
            });
            return;
        }

        const newFiles: UploadedFile[] = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (file.size > maxSize) {
                toast({
                    variant: "destructive",
                    title: "File too large",
                    description: `${file.name} is larger than 10MB. Please choose a smaller file.`
                });
                continue;
            }

            const uploadedFile = await processFile(file);
            newFiles.push(uploadedFile);
        }

        setUploadedFiles(prev => [...prev, ...newFiles]);
    }, [uploadedFiles.length, toast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files);
        }
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const removeFile = (id: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
    };

    const getFileIcon = (type: UploadedFile['type']) => {
        switch (type) {
            case 'image': return <ImageIcon className="w-4 h-4" />;
            case 'pdf': return <FileText className="w-4 h-4" />;
            case 'document': return <FileText className="w-4 h-4" />;
            default: return <File className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status: UploadedFile['status']) => {
        switch (status) {
            case 'uploading': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            case 'processing': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'ready': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        }
    };

    return (
        <div className="shrink-0 p-4 bg-background border-t">
            <div className="relative mx-auto max-w-4xl">
                {/* Web Search Status */}
                {webSearchEnabled && (
                    <div className="flex items-center justify-center mb-2">
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                            <Globe className="w-3 h-3" />
                            <span>Web</span>
                        </div>
                    </div>
                )}

                {/* Uploaded Files Display */}
                {uploadedFiles.length > 0 && (
                    <div className="mb-3 space-y-2">
                        <div className="flex flex-wrap gap-2">
                            {uploadedFiles.map((file) => (
                                <Card key={file.id} className="p-2 flex items-center gap-2 max-w-xs">
                                    {file.type === 'image' && file.preview ? (
                                        <img 
                                            src={file.preview} 
                                            alt={file.file.name}
                                            className="w-8 h-8 object-cover rounded"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                            {getFileIcon(file.type)}
                                        </div>
                                    )}
                                    
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{file.file.name}</p>
                                        <div className="flex items-center gap-1">
                                            <Badge variant="secondary" className={cn("text-xs", getStatusColor(file.status))}>
                                                {file.status === 'uploading' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                                {file.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {formatFileSize(file.file.size)}
                                            </span>
                                        </div>
                                        {file.error && (
                                            <p className="text-xs text-red-600 dark:text-red-400">{file.error}</p>
                                        )}
                                    </div>
                                    
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => removeFile(file.id)}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Container */}
                <div 
                    className={cn(
                        "relative flex items-center gap-2 p-2 bg-muted/30 rounded-2xl border border-border/50 focus-within:border-primary/50 transition-all",
                        isDragging && "border-primary bg-primary/5"
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    {/* File Upload Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                        disabled={isLoading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip className="w-4 h-4" />
                    </Button>

                    {/* Hidden File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt,.md"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files) {
                                handleFileSelect(e.target.files);
                            }
                        }}
                    />

                    {/* Main Input */}
                    <Input
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        placeholder={
                            isDragging
                                ? 'Drop files here...'
                                : isListening 
                                    ? 'Listening...' 
                                    : uploadedFiles.length > 0
                                        ? 'Ask about your files...'
                                        : webSearchEnabled 
                                            ? 'Ask me anything - I can search the web!'
                                            : 'Type your message or drag files here...'
                        }
                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/70"
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                        {/* Web Search Toggle */}
                        {onWebSearchToggle && (
                            <Button
                                onClick={onWebSearchToggle}
                                size="icon"
                                variant="ghost"
                                className={cn(
                                    "h-8 w-8 rounded-full transition-all",
                                    webSearchEnabled 
                                        ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                                title={webSearchEnabled ? "Disable web search" : "Enable web search"}
                            >
                                {webSearchEnabled ? (
                                    <Globe className="w-4 h-4" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                            </Button>
                        )}
                        
                        {/* Voice Input */}
                        <Button
                            onClick={onMicClick}
                            size="icon"
                            variant="ghost"
                            className={cn(
                                "h-8 w-8 rounded-full transition-all",
                                isListening 
                                    ? "bg-red-100 text-red-600 animate-pulse dark:bg-red-900/30 dark:text-red-400" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            title={isListening ? "Stop listening" : "Voice input"}
                        >
                            <Mic className="w-4 h-4" />
                        </Button>
                        
                        {/* Send Button */}
                        <Button
                            onClick={handleSend}
                            disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
                            size="icon"
                            className={cn(
                                "h-8 w-8 rounded-full transition-all",
                                (input.trim() || uploadedFiles.length > 0) && !isLoading
                                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                                    : "bg-muted text-muted-foreground"
                            )}
                            title="Send message"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Drag and Drop Overlay */}
                {isDragging && (
                    <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center z-10">
                        <div className="text-center">
                            <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                            <p className="text-sm font-medium text-primary">Drop files here to upload</p>
                            <p className="text-xs text-muted-foreground">Images, PDFs, and documents supported</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}