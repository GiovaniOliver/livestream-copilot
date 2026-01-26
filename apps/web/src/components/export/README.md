# Social Media Export System

A comprehensive, reusable export system for sharing content across multiple social media platforms with platform-specific optimizations.

## Overview

The export system provides a complete solution for exporting clips, posts, quotes, and other content to social media platforms including X (Twitter), LinkedIn, Instagram, TikTok, and YouTube Shorts.

### Key Features

- **Platform Selection**: Multi-platform export with platform-specific configurations
- **Format Options**: Video format, quality, and aspect ratio selection
- **Caption Management**: Caption templates, character count validation, and hashtag suggestions
- **Copy to Clipboard**: Quick copy functionality with visual feedback
- **Download Support**: Progress indicators and custom filenames
- **Batch Export**: Export multiple items simultaneously
- **Export History**: Track and manage previous exports
- **Responsive UI**: Works seamlessly across all dashboard workflows

## Components

### ExportModal

Main modal component that orchestrates the entire export workflow.

```tsx
import { ExportModal } from "@/components/export";

<ExportModal
  isOpen={isOpen}
  onClose={onClose}
  content={content}
  onExport={handleExport}
  hashtagSuggestions={suggestions}
  captionTemplates={templates}
/>
```

**Props:**
- `isOpen`: boolean - Controls modal visibility
- `onClose`: () => void - Close handler
- `content`: ExportContent | null - Content to export
- `onExport`: (request: ExportRequest) => Promise<void> - Export handler
- `hashtagSuggestions`: HashtagSuggestion[] - AI-generated hashtag suggestions
- `captionTemplates`: CaptionTemplate[] - Caption templates

**Workflow Steps:**
1. **Platforms**: Select target platforms
2. **Format**: Choose video format, quality, and aspect ratio
3. **Caption**: Write caption, add hashtags, apply templates
4. **Preview**: Review and export

### PlatformSelector

Platform selection component with visual platform icons.

```tsx
import { PlatformSelector } from "@/components/export";

<PlatformSelector
  selectedPlatforms={selectedPlatforms}
  onChange={setSelectedPlatforms}
  maxSelection={3}
  showLabels
  size="md"
/>
```

**Props:**
- `selectedPlatforms`: SocialPlatform[] - Selected platforms
- `onChange`: (platforms: SocialPlatform[]) => void - Selection handler
- `maxSelection`: number - Maximum allowed selections
- `disabled`: boolean - Disable interaction
- `showLabels`: boolean - Show platform names and character limits
- `size`: "sm" | "md" | "lg" - Component size
- `layout`: "grid" | "horizontal" - Layout style

**Supported Platforms:**
- X (Twitter) - 280 characters
- LinkedIn - 3000 characters
- Instagram - 2200 characters
- TikTok - 2200 characters
- YouTube Shorts - 5000 characters

### ExportFormatOptions

Video format and quality configuration.

```tsx
import { ExportFormatOptions } from "@/components/export";

<ExportFormatOptions
  options={formatOptions}
  onChange={setFormatOptions}
  availableAspectRatios={["16:9", "9:16", "1:1"]}
/>
```

**Props:**
- `options`: ExportFormatOptions - Current format options
- `onChange`: (options: ExportFormatOptions) => void - Change handler
- `availableAspectRatios`: AspectRatio[] - Available aspect ratios based on platforms
- `disabled`: boolean - Disable interaction

**Format Options:**
- **Format**: MP4, MOV, WebM
- **Quality**: 1080p, 720p, 480p
- **Aspect Ratio**: 16:9, 9:16, 1:1, 4:5
- **Include Captions**: Burn captions into video
- **Include Watermark**: Add branding/logo

### CopyToClipboard

Copy text to clipboard with success feedback.

```tsx
import { CopyToClipboard } from "@/components/export";

// Button variant
<CopyToClipboard text={content} variant="button" size="md" />

// Inline variant
<CopyToClipboard text={content} variant="inline" size="sm" />

// Textarea variant
<CopyToClipboard text={content} variant="textarea" showPreview />
```

**Props:**
- `text`: string - Text to copy
- `variant`: "button" | "inline" | "textarea" - Display style
- `size`: "sm" | "md" | "lg" - Component size
- `showPreview`: boolean - Show text preview (textarea only)
- `successDuration`: number - Success message duration (ms)
- `onCopy`: () => void - Copy success callback
- `disabled`: boolean - Disable interaction

### DownloadButton

Download button with progress indicator.

```tsx
import { DownloadButton } from "@/components/export";

<DownloadButton
  url={downloadUrl}
  filename="my-export.mp4"
  variant="primary"
  size="md"
  showProgress
  onDownload={handleDownload}
/>
```

**Props:**
- `url`: string - Download URL (optional if using onDownload)
- `filename`: string - Download filename
- `onDownload`: () => Promise<void> - Custom download handler
- `variant`: "primary" | "default" | "ghost" - Button style
- `size`: "sm" | "md" | "lg" - Button size
- `showProgress`: boolean - Show progress bar
- `disabled`: boolean - Disable button

### ExportButton

Compact export trigger button.

```tsx
import { ExportButton } from "@/components/export";

<ExportButton
  onClick={handleExport}
  variant="primary"
  size="md"
  label="Export"
  showIcon
/>
```

**Props:**
- `onClick`: () => void - Click handler
- `variant`: "default" | "primary" | "ghost" | "icon" - Button style
- `size`: "sm" | "md" | "lg" - Button size
- `label`: string - Button label
- `showIcon`: boolean - Show export icon
- `disabled`: boolean - Disable button

## Hook: useExport

Custom React hook for managing export state and functionality.

```tsx
import { useExport } from "@/hooks/useExport";

const {
  isModalOpen,
  currentContent,
  openExport,
  closeExport,
  handleExport,
  batchExport,
  generateHashtagSuggestions,
  progress,
  exportHistory,
} = useExport({
  onSuccess: (result) => console.log("Export successful", result),
  onError: (error) => console.error("Export failed", error),
});
```

**Returns:**
- `isModalOpen`: boolean - Modal visibility state
- `currentContent`: ExportContent | null - Current content being exported
- `openExport`: (content: ExportContent) => void - Open export modal
- `closeExport`: () => void - Close export modal
- `handleExport`: (request: ExportRequest) => Promise<ExportResult> - Execute export
- `batchExport`: (contents: ExportContent[], baseRequest) => Promise - Batch export
- `generateHashtagSuggestions`: (content: ExportContent) => HashtagSuggestion[] - Generate hashtags
- `progress`: ExportProgress - Export progress state
- `exportHistory`: ExportHistoryItem[] - Export history

## Integration Examples

### Basic Integration

```tsx
"use client";

import { useState } from "react";
import { ExportModal, ExportButton, type ExportContent } from "@/components/export";
import { useExport } from "@/hooks/useExport";

export function MyComponent() {
  const { isModalOpen, currentContent, openExport, closeExport, handleExport } = useExport();

  const handleExportClick = () => {
    const content: ExportContent = {
      id: "clip-123",
      type: "clip",
      title: "Amazing Moment",
      caption: "Check out this incredible moment!",
      videoUrl: "/videos/clip-123.mp4",
      thumbnailUrl: "/thumbnails/clip-123.jpg",
      duration: 30,
      createdAt: new Date(),
    };

    openExport(content);
  };

  return (
    <>
      <ExportButton onClick={handleExportClick} />

      <ExportModal
        isOpen={isModalOpen}
        onClose={closeExport}
        content={currentContent}
        onExport={handleExport}
      />
    </>
  );
}
```

### Dashboard Integration

See `ClipCardWithExport.tsx` and `PostCardWithExport.tsx` for complete examples of integrating export functionality into existing dashboard components.

### Batch Export

```tsx
const { batchExport } = useExport();

const handleBatchExport = async () => {
  const contents: ExportContent[] = selectedClips.map(clip => ({
    id: clip.id,
    type: "clip",
    title: clip.title,
    caption: clip.hookText,
    videoUrl: clip.videoUrl,
    duration: clip.duration,
    createdAt: clip.createdAt,
  }));

  const baseRequest = {
    platforms: ["x", "instagram"],
    caption: "",
    hashtags: ["content", "viral"],
    formatOptions: {
      format: "mp4",
      quality: "1080p",
      aspectRatio: "16:9",
    },
  };

  const { results, errors } = await batchExport(contents, baseRequest);
  console.log(`Exported ${results.length} items, ${errors.length} errors`);
};
```

## Types

### ExportContent

```typescript
interface ExportContent {
  id: string;
  type: "clip" | "post" | "quote" | "chapter";
  title: string;
  caption?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: Date;
}
```

### ExportRequest

```typescript
interface ExportRequest {
  contentId: string;
  platforms: SocialPlatform[];
  caption: string;
  hashtags: string[];
  formatOptions: ExportFormatOptions;
  customFilename?: string;
}
```

### ExportFormatOptions

```typescript
interface ExportFormatOptions {
  format: "mp4" | "mov" | "webm";
  quality: "1080p" | "720p" | "480p";
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  includeCaptions?: boolean;
  includeWatermark?: boolean;
}
```

### ExportResult

```typescript
interface ExportResult {
  id: string;
  contentId: string;
  platform: SocialPlatform;
  downloadUrl: string;
  filename: string;
  fileSize: number;
  createdAt: Date;
}
```

## Platform Configurations

Each platform has specific constraints and optimizations:

| Platform | Characters | Video Duration | Max Size | Aspect Ratios | Hashtag Limit |
|----------|-----------|----------------|----------|---------------|---------------|
| X | 280 | 140s | 512MB | 16:9, 1:1 | 2 |
| LinkedIn | 3000 | 600s | 5GB | 16:9, 1:1, 4:5 | 5 |
| Instagram | 2200 | 90s | 100MB | 9:16, 1:1, 4:5 | 30 |
| TikTok | 2200 | 180s | 287MB | 9:16 | 100 |
| YouTube | 5000 | 60s | 256MB | 9:16 | 15 |

## Caption Templates

Built-in caption templates for different use cases:

- **Simple**: Basic title + hashtags
- **Engaging**: Emoji-enhanced with description
- **Professional**: Formal with link and hashtags
- **Thread Starter**: X thread format

Custom templates can be provided via the `captionTemplates` prop.

## Accessibility

All components are fully accessible:
- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader announcements
- High contrast support

## Styling

Components use Tailwind CSS with custom theme tokens:
- `bg-*` - Background colors
- `text-*` - Text colors
- `border-*` - Border colors
- `shadow-*` - Shadow styles

All components respect the application's color scheme and theme.

## API Integration

To connect the export system to your backend API:

```typescript
// In useExport hook or custom implementation
const handleExport = async (request: ExportRequest) => {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return await response.json();
};
```

Expected API endpoint:
- **POST** `/api/export`
- **Body**: ExportRequest
- **Response**: ExportResult

## Future Enhancements

- [ ] Direct platform publishing (OAuth integration)
- [ ] AI-powered caption generation
- [ ] Advanced video editing (trim, filters)
- [ ] Scheduled publishing
- [ ] Analytics and performance tracking
- [ ] Template customization UI
- [ ] Multi-account support
- [ ] Export presets and favorites

## Support

For issues or questions, refer to the main project documentation or contact the development team.
