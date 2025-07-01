"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';

interface ImageUploaderProps {
  onImageChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImageUploader({ onImageChange, disabled }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation
    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 4MB.');
      setPreview(null);
      onImageChange(null);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload a JPG, PNG, or WebP image.');
      setPreview(null);
      onImageChange(null);
      return;
    }

    setError(null);

    // Read and convert to data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      onImageChange(dataUrl);
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
      setPreview(null);
      onImageChange(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setError(null);
    onImageChange(null);
    // Reset the input field
    const input = document.getElementById('image-upload') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <ImageIcon className="h-4 w-4" /> Upload Handwritten Work (Optional)
      </h4>
      <div className="p-4 border-2 border-dashed rounded-lg">
        {!preview ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Label htmlFor="image-upload" className="cursor-pointer">
              <Button type="button" variant="outline" asChild>
                <span className="pointer-events-none">Choose Image</span>
              </Button>
              <Input
                id="image-upload"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                disabled={disabled}
              />
            </Label>
            <p className="text-xs">JPG, PNG, or WebP. Max 4MB.</p>
          </div>
        ) : (
          <div className="space-y-3">
             <Card>
                <CardContent className="p-2">
                     <Image
                        src={preview}
                        alt="Solution preview"
                        width={400}
                        height={300}
                        className="rounded-md object-contain max-h-60 w-full"
                    />
                </CardContent>
             </Card>
            <Button type="button" variant="destructive" size="sm" onClick={handleRemoveImage} disabled={disabled}>
              <Trash2 className="mr-2 h-4 w-4" /> Remove Image
            </Button>
          </div>
        )}
      </div>
      {error && (
        <div className="text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
