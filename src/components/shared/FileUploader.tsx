"use client";

import { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, FileText, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image'; // For image preview

interface FileUploaderProps {
  onFileUpload: (file: File, dataUri: string) => void;
  acceptedFileTypes?: string[]; // e.g., ["image/jpeg", "image/png", "application/pdf"]
  maxFileSize?: number; // in bytes
  isProcessing?: boolean;
}

export function FileUploader({
  onFileUpload,
  acceptedFileTypes = ["image/jpeg", "image/png", "application/pdf"],
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  isProcessing = false,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const processFile = (file: File) => {
    setError(null);
    if (!acceptedFileTypes.includes(file.type)) {
      setError(`Invalid file type. Accepted types: ${acceptedFileTypes.join(', ')}`);
      return;
    }
    if (file.size > maxFileSize) {
      setError(`File is too large. Max size: ${maxFileSize / (1024 * 1024)}MB`);
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      onFileUpload(file, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    // Reset the input field value if needed
    const input = document.getElementById('file-upload-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  return (
    <div className="space-y-4">
      <div
        className={`w-full p-6 border-2 border-dashed rounded-lg cursor-pointer
                    border-border hover:border-primary transition-colors
                    flex flex-col items-center justify-center text-center
                    ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById('file-upload-input')?.click()}
      >
        <Input
          id="file-upload-input"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept={acceptedFileTypes.join(',')}
          disabled={isProcessing}
        />
        {isProcessing ? (
          <>
            <Loader2 className="h-10 w-10 mb-3 text-primary animate-spin" />
            <p className="text-muted-foreground">Processing document...</p>
          </>
        ) : selectedFile && preview ? (
          <div className="space-y-2">
             {selectedFile.type.startsWith("image/") ? (
                <Image src={preview} alt={selectedFile.name} width={150} height={150} className="max-h-40 rounded-md object-contain" data-ai-hint="document preview" />
              ) : (
                <FileText className="h-16 w-16 text-primary" />
              )}
            <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(2)} KB</p>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); clearSelection(); }} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90">
              <XCircle className="mr-2 h-4 w-4" /> Clear Selection
            </Button>
          </div>
        ) : (
          <>
            <UploadCloud className="h-10 w-10 mb-3 text-primary" />
            <p className="font-semibold text-foreground">Click to upload or drag and drop</p>
            <p className="text-sm text-muted-foreground">
              Supported: {acceptedFileTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}. Max {maxFileSize / (1024*1024)}MB.
            </p>
          </>
        )}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
