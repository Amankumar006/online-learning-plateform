
"use client";

import * as React from "react";
import { Lesson, Block } from "@/lib/data";
import Image from "next/image";
import { CheckCircle, Lightbulb, HelpCircle, Code, Copy } from "lucide-react";
import { BlockMath, InlineMath } from 'react-katex';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";

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
        <div className="my-6">
            <div className="flex justify-between items-center bg-secondary rounded-t-lg px-4 py-2">
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
                <pre><code className={`language-${language}`}>{code}</code></pre>
            </div>
        </div>
    );
};

const FormattedText = ({ text }: { text: string }) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\$\$.*?\$\$|\$.*?\$)/g);
    return <>{parts.filter(Boolean).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={index} className="bg-muted px-1.5 py-1 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('$$') && part.endsWith('$$')) {
            return <div key={index} className="my-2"><BlockMath math={part.slice(2, -2)} /></div>
        }
        if (part.startsWith('$') && part.endsWith('$')) {
            return <InlineMath key={index}>{part.slice(1, -1)}</InlineMath>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
    })}</>;
};


const TextContentRenderer = ({ text }: { text: string }) => {
  const keyWordStyleMap = {
    '**Example:**': {
      icon: <Lightbulb className="h-5 w-5 text-primary" />,
      title: "Example",
      cardClass: "my-6 bg-secondary/50",
    },
    '**Question:**': {
      icon: <HelpCircle className="h-5 w-5 text-primary" />,
      title: "Question",
      cardClass: "my-6 border-primary",
    },
  };

  for (const keyword in keyWordStyleMap) {
    if (text.startsWith(keyword)) {
      const { icon, title, cardClass } = keyWordStyleMap[keyword as keyof typeof keyWordStyleMap];
      const content = text.replace(keyword, '').trim();
      return (
        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4">
            {icon}
            <CardTitle className="text-lg font-headline">{title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 text-sm md:text-base prose-p:my-2">
             <TextContentRenderer text={content} />
          </CardContent>
        </Card>
      );
    }
  }

  const segments = text.split(/(```[\s\S]*?```)/g);

  const renderedSegments = segments.filter(Boolean).map((segment, index) => {
    if (segment.startsWith('```')) {
      const content = segment.slice(3, -3);
      const firstLineBreak = content.indexOf('\n');
      const language = content.substring(0, firstLineBreak).trim();
      const code = content.substring(firstLineBreak + 1);
      return <CodeBlockDisplay key={index} language={language} code={code} />;
    }

    const lines = segment.trim().split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];

    lines.forEach((line, lineIndex) => {
      const isListItem = line.trim().startsWith('* ');
      if (isListItem) {
        currentList.push(line.trim().substring(2));
      } else {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${index}-${lineIndex}`} className="list-disc pl-5 my-4 space-y-2">
              {currentList.map((item, i) => (
                <li key={i}><FormattedText text={item} /></li>
              ))}
            </ul>
          );
          currentList = [];
        }
        if (line.trim()) {
          elements.push(<p key={`p-${index}-${lineIndex}`} className="leading-relaxed"><FormattedText text={line} /></p>);
        }
      }
    });

    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-final-${index}`} className="list-disc pl-5 my-4 space-y-2">
          {currentList.map((item, i) => (
            <li key={i}><FormattedText text={item} /></li>
          ))}
        </ul>
      );
    }

    return elements;
  });

  return <div className="space-y-4">{renderedSegments}</div>;
};

const BlockRenderer = ({ block }: { block: Block }) => {
    switch (block.type) {
        case 'text':
            return <TextContentRenderer text={block.content} />;
        case 'code':
            return <CodeBlockDisplay language={block.language} code={block.code} />;
        default:
            return null;
    }
};

interface LessonContentProps {
  lesson: Lesson;
}

export default function LessonContent({ lesson }: LessonContentProps) {
  
  const sections = lesson.sections || [];

  const renderContent = () => {
    if (sections.length > 0) {
        return sections.map((section, sIndex) => (
            <section key={sIndex} id={`section-${sIndex}`} className="mb-8 p-4 rounded-lg transition-all">
                <h2 className="text-2xl font-bold font-headline mt-8 mb-4 border-b pb-2">{section.title}</h2>
                <div>
                    {section.blocks.map((block, bIndex) => <BlockRenderer key={bIndex} block={block} />)}
                </div>
            </section>
        ));
    }

    if (typeof lesson.content === 'string') return <TextContentRenderer text={lesson.content} />;
    
    if (Array.isArray(lesson.content)) {
        return lesson.content.map((block, index) => {
            if (block.type === 'paragraph') return <TextContentRenderer key={index} text={block.value} />;
            return null;
        });
    }
    
    return <p>No content available for this lesson.</p>;
  };

  return (
    <div>
        {lesson.image && (
            <div className="mb-6">
            <Image
                src={lesson.image}
                alt={lesson.title}
                width={800}
                height={450}
                className="rounded-lg object-cover w-full aspect-video"
            />
            </div>
        )}
        <div className="prose dark:prose-invert prose-lg max-w-none mb-8">
            {renderContent()}
        </div>
    </div>
  );
}
