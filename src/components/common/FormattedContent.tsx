'use client';

import React from 'react';
import Image from 'next/image';
import { Code, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CodeBlockDisplay = ({ language, code }: { language: string, code: string }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };

    return (
        <div className="my-4 not-prose">
            <div className="flex justify-between items-center bg-muted rounded-t-lg px-4 py-2">
                <div className="flex items-center gap-2">
                     <Code className="h-5 w-5" />
                     <span className="text-sm font-semibold">{language || 'code'}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                    {copied ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">Copy code</span>
                </Button>
            </div>
            <div className="bg-background border rounded-b-lg p-4 overflow-x-auto">
                <pre><code>{code}</code></pre>
            </div>
        </div>
    );
};

const FormattedContent = ({ content }: { content: string }) => {
    if (!content) return null;

    // Debug: log the content to see what we're working with
    console.log('FormattedContent received:', content.substring(0, 200) + '...');

    // First, extract any images that might be in code blocks and move them out
    let processedContent = content;
    
    // Look for images inside code blocks and extract them
    const codeBlockImageRegex = /```[\s\S]*?\[([^\]]*)\]\(((?:data:image\/[^)]+|https?:\/\/[^)]+))\)[\s\S]*?```/g;
    const extractedImages: string[] = [];
    
    processedContent = processedContent.replace(codeBlockImageRegex, (match, alt, src) => {
        const imageMarkdown = `![${alt}](${src})`;
        extractedImages.push(imageMarkdown);
        console.log('Extracted image from code block:', alt, src.substring(0, 50) + '...');
        return ''; // Remove the code block
    });
    
    // Add extracted images back to the content
    if (extractedImages.length > 0) {
        processedContent = processedContent + '\n\n' + extractedImages.join('\n\n');
    }

    // Improved regex to split by code blocks OR markdown images (including data URIs)
    const blocks = processedContent.split(/(```[\s\S]*?```|!\[.*?\]\((?:data:image\/[^)]+|https?:\/\/[^)]+)\))/g).filter(Boolean);
    
    console.log('Blocks found:', blocks.length);
    blocks.forEach((block, i) => {
        if (block.includes('![') && block.includes('](')) {
            console.log(`Block ${i} (potential image):`, block.substring(0, 100) + '...');
        }
    });

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
            {blocks.map((block, index) => {
                // Handle code blocks
                if (block.startsWith('```') && block.endsWith('```')) {
                    const codeBlock = block.slice(3, -3);
                    const firstLineBreak = codeBlock.indexOf('\n');
                    const language = firstLineBreak !== -1 ? codeBlock.substring(0, firstLineBreak).trim() : 'plaintext';
                    const code = firstLineBreak !== -1 ? codeBlock.substring(firstLineBreak + 1) : codeBlock;
                    return <CodeBlockDisplay key={index} language={language} code={code} />;
                }

                // Handle images with improved regex pattern
                const imageMatch = block.match(/!\[(.*?)\]\(((?:data:image\/[^)]+|https?:\/\/[^)]+))\)/);
                if (imageMatch) {
                    console.log('Image match found:', imageMatch[1], imageMatch[2].substring(0, 50) + '...');
                    const alt = imageMatch[1];
                    const src = imageMatch[2];
                    
                    // Handle data URIs differently from regular URLs
                    if (src.startsWith('data:image/')) {
                        return (
                            <div key={index} className="my-6 not-prose">
                                <div className="bg-muted/30 rounded-lg p-4 border">
                                    <p className="text-sm text-muted-foreground mb-4 font-medium">{alt}</p>
                                    <div className="flex justify-center">
                                        <img
                                            src={src}
                                            alt={alt}
                                            className="max-w-full h-auto rounded-lg border shadow-md bg-white"
                                            style={{ maxHeight: '500px' }}
                                            onLoad={() => console.log('Image loaded successfully')}
                                            onError={(e) => {
                                                console.error('Image failed to load:', e);
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        // Handle regular URLs with Next.js Image component
                        return (
                            <div key={index} className="my-4 not-prose">
                                <p className="text-xs text-muted-foreground italic mb-2">{alt}</p>
                                <Image
                                    src={src}
                                    alt={alt}
                                    width={512}
                                    height={512}
                                    className="rounded-lg border shadow-md object-contain"
                                />
                            </div>
                        );
                    }
                }

                // Process regular text blocks line by line
                let inList = false;
                return block.split('\n').map((line, lineIndex) => {
                    if (line.startsWith('### ')) {
                        inList = false;
                        return <h3 key={`${index}-${lineIndex}`} className="font-semibold mt-4 mb-2">{line.substring(4)}</h3>
                    }
                    if (line.startsWith('> ')) {
                        inList = false;
                        return <blockquote key={`${index}-${lineIndex}`} className="pl-4 border-l-4 my-2">{line.substring(2)}</blockquote>
                    }
                    if (line.startsWith('---')) {
                        inList = false;
                        return <hr key={`${index}-${lineIndex}`} className="my-4" />;
                    }
                    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                        const listContent = <li key={`${index}-${lineIndex}`} dangerouslySetInnerHTML={{ __html: line.trim().substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>') }}></li>;
                        if (!inList) {
                            inList = true;
                            return <ul key={`ul-${index}-${lineIndex}`} className="list-disc pl-5 my-2 space-y-1">{listContent}</ul>;
                        }
                        return listContent;
                    }

                    inList = false;
                    if (line.trim() === '') {
                        return null; // Don't render empty paragraphs
                    }
                    return <p key={`${index}-${lineIndex}`} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>') }} />;
                });
            })}
        </div>
    );
};

export default FormattedContent;
