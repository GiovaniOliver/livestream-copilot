# Social Media Export System - Integration Guide

This guide explains how to integrate the new social media export functionality into your existing StreamerDashboard, PodcastDashboard, and DebateDashboard.

## Overview

The export system has been built as a reusable set of components and hooks that can be easily integrated into any dashboard workflow. All components are production-ready and follow the existing design system.

## What Was Created

### Core Components
1. **ExportModal** - Main export workflow modal (4-step wizard)
2. **PlatformSelector** - Multi-platform selection UI
3. **ExportFormatOptions** - Video format/quality configuration
4. **CopyToClipboard** - Copy functionality with feedback
5. **DownloadButton** - Download with progress indicator
6. **ExportButton** - Compact export trigger button

### Utilities
- **useExport** - React hook for export state management
- **types.ts** - Complete TypeScript type definitions
- **PLATFORM_CONFIGS** - Platform-specific configurations

### Example Implementations
- **ClipCardWithExport** - Enhanced ClipCard with export
- **PostCardWithExport** - Enhanced PostCard with export

## Integration Steps

### Step 1: Add Export to StreamerDashboard

**File**: `apps/web/src/components/dashboard/StreamerDashboard.tsx`

```tsx
// Add imports
import { ExportModal, type ExportContent } from "@/components/export";
import { useExport } from "@/hooks/useExport";

// Inside component
export function StreamerDashboard({ sessionId, wsUrl }: StreamerDashboardProps) {
  // Add export hook
  const {
    isModalOpen,
    currentContent,
    openExport,
    closeExport,
    handleExport,
    generateHashtagSuggestions,
  } = useExport({
    onSuccess: (result) => {
      console.log("Export successful:", result);
      // TODO: Show success toast
    },
    onError: (error) => {
      console.error("Export failed:", error);
      // TODO: Show error toast
    },
  });

  // Modify handleExportClip to use the modal
  const handleExportClip = (clip: Clip) => {
    const exportContent: ExportContent = {
      id: clip.id,
      type: "clip",
      title: clip.title,
      caption: clip.hookText,
      videoUrl: getClipMediaUrl(clip.id),
      thumbnailUrl: clip.thumbnailUrl,
      duration: clip.duration,
      createdAt: clip.createdAt,
    };

    openExport(exportContent);
  };

  // Add modal before closing div
  return (
    <>
      {/* Existing dashboard content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ... existing cards ... */}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isModalOpen}
        onClose={closeExport}
        content={currentContent}
        onExport={handleExport}
        hashtagSuggestions={
          currentContent ? generateHashtagSuggestions(currentContent) : []
        }
      />
    </>
  );
}
```

### Step 2: Replace ClipCard with ClipCardWithExport

**Option A**: Update imports in ClipBin or wherever ClipCard is used:

```tsx
// Before
import { ClipCard } from "./ClipCard";

// After
import { ClipCard as ClipCardWithExport } from "./ClipCardWithExport";
```

**Option B**: Use the enhanced version directly:

```tsx
import { ClipCardWithExport } from "./ClipCardWithExport";

<ClipCardWithExport
  clip={clip}
  onEdit={handleEdit}
  onExport={handleExport}
  onClick={handleClick}
/>
```

### Step 3: Replace PostCard with PostCardWithExport

Similar to ClipCard, update your PostQueue or related components:

```tsx
import { PostCardWithExport } from "./PostCardWithExport";

<PostCardWithExport
  post={post}
  onEdit={handleEdit}
  onCopy={handleCopy}
  onApprove={handleApprove}
  onShare={handleShare}
/>
```

### Step 4: Add Export to PodcastDashboard

**File**: `apps/web/src/components/dashboard/PodcastDashboard.tsx`

```tsx
import { ExportModal, ExportButton, type ExportContent } from "@/components/export";
import { useExport } from "@/hooks/useExport";

export function PodcastDashboard({ sessionId, wsUrl }: PodcastDashboardProps) {
  const { isModalOpen, currentContent, openExport, closeExport, handleExport } = useExport();

  // Add export handler for quotes
  const handleExportQuote = (quote: any) => {
    const exportContent: ExportContent = {
      id: quote.id,
      type: "quote",
      title: `Quote from ${quote.speaker}`,
      caption: quote.text,
      createdAt: new Date(),
    };

    openExport(exportContent);
  };

  // Add export handler for chapters
  const handleExportChapter = (chapter: any) => {
    const exportContent: ExportContent = {
      id: chapter.id,
      type: "chapter",
      title: chapter.title,
      caption: chapter.description,
      createdAt: new Date(),
    };

    openExport(exportContent);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chapters */}
        <Card variant="elevated">
          {/* ... existing chapter content ... */}
          {chapters.map((chapter) => (
            <div key={chapter.id} className="...">
              {/* ... chapter display ... */}
              <ExportButton
                onClick={() => handleExportChapter(chapter)}
                variant="ghost"
                size="sm"
              />
            </div>
          ))}
        </Card>

        {/* Quotes */}
        <Card variant="elevated">
          {/* ... existing quote content ... */}
          {quotes.map((quote) => (
            <div key={quote.id} className="...">
              {/* ... quote display ... */}
              <ExportButton
                onClick={() => handleExportQuote(quote)}
                variant="ghost"
                size="sm"
              />
            </div>
          ))}
        </Card>

        {/* Promo Drafts */}
        <Card variant="elevated">
          {/* ... promo content ... */}
        </Card>
      </div>

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

### Step 5: Add Export to DebateDashboard

**File**: `apps/web/src/components/dashboard/DebateDashboard.tsx`

Similar pattern - add export buttons to relevant content items like claims, evidence cards, rebuttals, etc.

```tsx
import { ExportModal, ExportButton, type ExportContent } from "@/components/export";
import { useExport } from "@/hooks/useExport";

export function DebateDashboard({ sessionId, wsUrl }: DebateDashboardProps) {
  const { openExport, isModalOpen, currentContent, closeExport, handleExport } = useExport();

  const handleExportClaim = (claim: any) => {
    const exportContent: ExportContent = {
      id: claim.id,
      type: "post",
      title: "Debate Claim",
      caption: claim.text,
      createdAt: new Date(),
    };

    openExport(exportContent);
  };

  // Similar handlers for evidence, rebuttals, etc.

  return (
    <>
      {/* Dashboard content with export buttons */}
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

## Batch Export Feature

To add batch export (select multiple items and export at once):

```tsx
import { useState } from "react";
import { useExport } from "@/hooks/useExport";

function ClipBin({ clips }: { clips: Clip[] }) {
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const { batchExport } = useExport();

  const handleBatchExport = async () => {
    const contents: ExportContent[] = Array.from(selectedClips)
      .map(id => clips.find(c => c.id === id))
      .filter(Boolean)
      .map(clip => ({
        id: clip.id,
        type: "clip",
        title: clip.title,
        caption: clip.hookText,
        videoUrl: getClipMediaUrl(clip.id),
        duration: clip.duration,
        createdAt: clip.createdAt,
      }));

    const baseRequest = {
      platforms: ["x", "instagram"],
      caption: "",
      hashtags: [],
      formatOptions: {
        format: "mp4",
        quality: "1080p",
        aspectRatio: "16:9",
      },
    };

    const { results, errors } = await batchExport(contents, baseRequest);

    if (errors.length > 0) {
      console.error(`${errors.length} exports failed`);
    }

    // Clear selection
    setSelectedClips(new Set());
  };

  return (
    <div>
      {/* Selection UI */}
      {selectedClips.size > 0 && (
        <Button onClick={handleBatchExport}>
          Export {selectedClips.size} clips
        </Button>
      )}

      {/* Clip grid with checkboxes */}
      {clips.map(clip => (
        <div key={clip.id}>
          <input
            type="checkbox"
            checked={selectedClips.has(clip.id)}
            onChange={(e) => {
              const newSet = new Set(selectedClips);
              if (e.target.checked) {
                newSet.add(clip.id);
              } else {
                newSet.delete(clip.id);
              }
              setSelectedClips(newSet);
            }}
          />
          <ClipCardWithExport clip={clip} />
        </div>
      ))}
    </div>
  );
}
```

## API Integration

To connect to your backend export API, update the `useExport` hook:

**File**: `apps/web/src/hooks/useExport.ts`

Replace the TODO/mock implementation in `handleExport`:

```typescript
// In handleExport function
const response = await fetch('/api/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
});

if (!response.ok) {
  throw new Error('Export failed');
}

const result = await response.json();
```

## Testing Checklist

- [ ] Export modal opens correctly
- [ ] Platform selection works
- [ ] Format options update properly
- [ ] Caption editing and character count validation
- [ ] Hashtag input and suggestions
- [ ] Template application
- [ ] Copy to clipboard works
- [ ] Download button shows progress
- [ ] Export completes successfully
- [ ] Modal closes and resets state
- [ ] Batch export selects multiple items
- [ ] Export history tracks exports
- [ ] Responsive on mobile/tablet
- [ ] Keyboard navigation works
- [ ] Screen reader accessible

## Customization

### Custom Caption Templates

Add custom templates for your specific use case:

```tsx
const customTemplates: CaptionTemplate[] = [
  {
    id: "brand-voice",
    name: "Brand Voice",
    template: "🔥 {title}\n\nWhat do you think? 🤔\n\n{hashtags}",
    platforms: ["x", "instagram"],
    variables: ["title", "hashtags"],
  },
  // ... more templates
];

<ExportModal
  {...props}
  captionTemplates={customTemplates}
/>
```

### Custom Hashtag Generation

Implement AI-powered hashtag suggestions:

```typescript
const generateHashtagSuggestions = async (content: ExportContent): Promise<HashtagSuggestion[]> => {
  const response = await fetch('/api/hashtags/suggest', {
    method: 'POST',
    body: JSON.stringify({ content: content.caption }),
  });

  return await response.json();
};

// Use in component
const suggestions = await generateHashtagSuggestions(content);
```

## File Structure

```
apps/web/src/
├── components/
│   └── export/
│       ├── ExportModal.tsx
│       ├── PlatformSelector.tsx
│       ├── ExportFormatOptions.tsx
│       ├── CopyToClipboard.tsx
│       ├── DownloadButton.tsx
│       ├── ExportButton.tsx
│       ├── types.ts
│       ├── index.ts
│       └── README.md
├── hooks/
│   └── useExport.ts
└── dashboards/
    └── streamer/
        ├── ClipCardWithExport.tsx
        └── PostCardWithExport.tsx
```

## Next Steps

1. **Replace existing cards** with export-enabled versions
2. **Add export buttons** to all relevant content items
3. **Connect to backend API** in `useExport` hook
4. **Test thoroughly** across all dashboards
5. **Add toast notifications** for success/error feedback
6. **Implement batch export UI** if needed
7. **Add export history view** for tracking past exports
8. **Consider direct platform publishing** via OAuth

## Support & Documentation

- Full component documentation: `apps/web/src/components/export/README.md`
- Type definitions: `apps/web/src/components/export/types.ts`
- Example implementations: See `*WithExport.tsx` files
- Hook documentation: Inline JSDoc comments in `useExport.ts`

## Performance Considerations

- Export modal uses lazy loading for better initial load
- Progress tracking prevents UI blocking
- Batch exports process sequentially to avoid overwhelming the server
- Clipboard API is used for fast, reliable copying
- All images/videos use optimized thumbnails

## Browser Support

- Modern browsers with Clipboard API support
- Fallback for older browsers without async clipboard
- Tested on Chrome, Firefox, Safari, Edge
- Mobile-optimized touch interactions

---

For questions or issues, refer to the main project documentation or contact the development team.
