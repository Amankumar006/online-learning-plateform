"use client"

import React, { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Section, Block, TextBlock, CodeBlock, VideoBlock, ImageBlock } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Plus, 
  GripVertical, 
  Type, 
  Code, 
  Video, 
  Trash2,
  Edit3,
  Check,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockEditor } from './BlockEditor'
import { AddBlockMenu } from './AddBlockMenu'

interface LessonContentEditorProps {
  sections: Section[]
  onChange: (sections: Section[]) => void
  disabled?: boolean
}

export function LessonContentEditor({ sections, onChange, disabled = false }: LessonContentEditorProps) {
  const [editingBlock, setEditingBlock] = useState<{ sectionIndex: number; blockIndex: number } | null>(null)
  const [editingSectionTitle, setEditingSectionTitle] = useState<number | null>(null)

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return

    const { source, destination, type } = result

    if (type === 'section') {
      // Reorder sections
      const newSections = Array.from(sections)
      const [reorderedSection] = newSections.splice(source.index, 1)
      newSections.splice(destination.index, 0, reorderedSection)
      onChange(newSections)
    } else if (type === 'block') {
      // Reorder blocks within a section
      const sectionIndex = parseInt((result.destination?.droppableId || '').split('-')[1])
      const newSections = [...sections]
      const section = { ...newSections[sectionIndex] }
      const newBlocks = Array.from(section.blocks)
      const [reorderedBlock] = newBlocks.splice(source.index, 1)
      newBlocks.splice(destination.index, 0, reorderedBlock)
      
      section.blocks = newBlocks
      newSections[sectionIndex] = section
      onChange(newSections)
    }
  }, [sections, onChange])

  const addSection = useCallback(() => {
    const newSection: Section = {
      title: 'New Section',
      blocks: []
    }
    onChange([...sections, newSection])
  }, [sections, onChange])

  const updateSectionTitle = useCallback((sectionIndex: number, title: string) => {
    const newSections = [...sections]
    newSections[sectionIndex] = { ...newSections[sectionIndex], title }
    onChange(newSections)
  }, [sections, onChange])

  const deleteSection = useCallback((sectionIndex: number) => {
    const newSections = sections.filter((_, index) => index !== sectionIndex)
    onChange(newSections)
  }, [sections, onChange])

  const addBlock = useCallback((sectionIndex: number, blockType: Block['type']) => {
    const newSections = [...sections]
    const section = { ...newSections[sectionIndex] }
    
    let newBlock: Block
    switch (blockType) {
      case 'text':
        newBlock = { type: 'text', content: 'Start typing...' }
        break
      case 'image':
        newBlock = { type: 'image', url: '', alt: '', caption: '' }
        break
      case 'code':
        newBlock = { type: 'code', language: 'javascript', code: '// Your code here' }
        break
      case 'video':
        newBlock = { type: 'video', url: 'https://example.com/video' }
        break
      default:
        return
    }
    
    section.blocks = [...section.blocks, newBlock]
    newSections[sectionIndex] = section
    onChange(newSections)
    
    // Auto-focus the new block for editing
    setEditingBlock({ sectionIndex, blockIndex: section.blocks.length - 1 })
  }, [sections, onChange])

  const updateBlock = useCallback((sectionIndex: number, blockIndex: number, updatedBlock: Block) => {
    const newSections = [...sections]
    const section = { ...newSections[sectionIndex] }
    const newBlocks = [...section.blocks]
    newBlocks[blockIndex] = updatedBlock
    section.blocks = newBlocks
    newSections[sectionIndex] = section
    onChange(newSections)
  }, [sections, onChange])

  const deleteBlock = useCallback((sectionIndex: number, blockIndex: number) => {
    const newSections = [...sections]
    const section = { ...newSections[sectionIndex] }
    section.blocks = section.blocks.filter((_, index) => index !== blockIndex)
    newSections[sectionIndex] = section
    onChange(newSections)
  }, [sections, onChange])

  const startEditingBlock = useCallback((sectionIndex: number, blockIndex: number) => {
    setEditingBlock({ sectionIndex, blockIndex })
  }, [])

  const stopEditingBlock = useCallback(() => {
    setEditingBlock(null)
  }, [])

  if (disabled) {
    return (
      <div className="space-y-6">
        {sections.map((section, sectionIndex) => (
          <Card key={sectionIndex} className="p-6">
            <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
            <div className="space-y-4">
              {section.blocks.map((block, blockIndex) => (
                <div key={blockIndex} className="p-4 bg-muted/30 rounded-lg">
                  <BlockEditor
                    block={block}
                    isEditing={false}
                    onUpdate={() => {}}
                    onStartEdit={() => {}}
                    onStopEdit={() => {}}
                    disabled={true}
                    sectionTitle={section.title}
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections" type="section">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={cn(
                "space-y-6 transition-colors duration-200",
                snapshot.isDraggingOver && "bg-muted/20 rounded-lg p-4"
              )}
            >
              {sections.map((section, sectionIndex) => (
                <Draggable
                  key={sectionIndex}
                  draggableId={`section-${sectionIndex}`}
                  index={sectionIndex}
                >
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "p-6 transition-all duration-200",
                        snapshot.isDragging && "shadow-lg rotate-1 scale-105"
                      )}
                    >
                      {/* Section Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div
                          {...provided.dragHandleProps}
                          className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        
                        {editingSectionTitle === sectionIndex ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={section.title}
                              onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                              className="flex-1 text-lg font-semibold bg-transparent border-b-2 border-primary focus:outline-none"
                              onBlur={() => setEditingSectionTitle(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingSectionTitle(null)
                                if (e.key === 'Escape') setEditingSectionTitle(null)
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingSectionTitle(null)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <h3
                            className="flex-1 text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setEditingSectionTitle(sectionIndex)}
                          >
                            {section.title}
                          </h3>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSection(sectionIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Section Blocks */}
                      <Droppable droppableId={`section-${sectionIndex}`} type="block">
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={cn(
                              "space-y-4 min-h-[100px] transition-colors duration-200",
                              snapshot.isDraggingOver && "bg-muted/10 rounded-lg p-2"
                            )}
                          >
                            {section.blocks.map((block, blockIndex) => (
                              <Draggable
                                key={blockIndex}
                                draggableId={`block-${sectionIndex}-${blockIndex}`}
                                index={blockIndex}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={cn(
                                      "group relative transition-all duration-200",
                                      snapshot.isDragging && "shadow-md rotate-1 scale-105 z-10"
                                    )}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="mt-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded cursor-grab active:cursor-grabbing transition-opacity"
                                      >
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      
                                      <div className="flex-1">
                                        <BlockEditor
                                          block={block}
                                          isEditing={editingBlock?.sectionIndex === sectionIndex && editingBlock?.blockIndex === blockIndex}
                                          onUpdate={(updatedBlock: Block) => updateBlock(sectionIndex, blockIndex, updatedBlock)}
                                          onStartEdit={() => startEditingBlock(sectionIndex, blockIndex)}
                                          onStopEdit={stopEditingBlock}
                                          sectionTitle={section.title}
                                          lessonContext={`Section: ${section.title}. Other blocks in section: ${section.blocks.filter(b => b.type === 'text').map(b => (b as any).content).join(' ').substring(0, 200)}...`}
                                        />
                                      </div>
                                      
                                      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => deleteBlock(sectionIndex, blockIndex)}
                                          className="text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            
                            {/* Add Block Menu */}
                            <AddBlockMenu
                              onAddBlock={(blockType) => addBlock(sectionIndex, blockType)}
                            />
                          </div>
                        )}
                      </Droppable>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Section Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={addSection}
          className="w-full max-w-md"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Section
        </Button>
      </div>
    </div>
  )
}