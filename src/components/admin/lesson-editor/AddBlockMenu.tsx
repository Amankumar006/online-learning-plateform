"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  Type, 
  Code, 
  Video,
  Image,
  FileText,
  Terminal,
  Play
} from 'lucide-react'
import { Block } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AddBlockMenuProps {
  onAddBlock: (blockType: Block['type']) => void
  className?: string
}

const BLOCK_TYPES = [
  {
    type: 'text' as const,
    label: 'Text Block',
    description: 'Add paragraphs, lists, and formatted text',
    icon: Type,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20'
  },
  {
    type: 'image' as const,
    label: 'Image Block',
    description: 'Add images with captions and alt text',
    icon: Image,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20'
  },
  {
    type: 'code' as const,
    label: 'Code Block',
    description: 'Add syntax-highlighted code snippets',
    icon: Code,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20'
  },
  {
    type: 'video' as const,
    label: 'Video Block',
    description: 'Embed videos from YouTube, Vimeo, etc.',
    icon: Video,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20'
  }
]

export function AddBlockMenu({ onAddBlock, className }: AddBlockMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleAddBlock = (blockType: Block['type']) => {
    onAddBlock(blockType)
    setIsOpen(false)
  }

  return (
    <div className={cn("flex justify-center py-4", className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "group border-dashed border-2 hover:border-primary/50 transition-all duration-200",
              "hover:bg-primary/5 hover:shadow-sm",
              isOpen && "border-primary bg-primary/5"
            )}
          >
            <Plus className={cn(
              "mr-2 h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-45"
            )} />
            Add Block
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="center" 
          className="w-80 p-2"
          sideOffset={8}
        >
          <div className="space-y-1">
            {BLOCK_TYPES.map((blockType) => {
              const Icon = blockType.icon
              return (
                <DropdownMenuItem
                  key={blockType.type}
                  onClick={() => handleAddBlock(blockType.type)}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer rounded-md",
                    "hover:bg-muted/50 focus:bg-muted/50 transition-colors duration-200"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-md shrink-0 transition-colors duration-200",
                    blockType.bgColor
                  )}>
                    <Icon className={cn("h-4 w-4", blockType.color)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm mb-1">
                      {blockType.label}
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {blockType.description}
                    </div>
                  </div>
                </DropdownMenuItem>
              )
            })}
          </div>
          
          <div className="border-t mt-2 pt-2">
            <div className="text-xs text-muted-foreground px-3 py-2">
              More block types coming soon...
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}