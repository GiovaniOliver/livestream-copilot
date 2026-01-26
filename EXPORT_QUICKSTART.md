# Export System - Quick Start

Get the export system up and running in 5 minutes.

## Minimal Integration (3 Steps)

### Step 1: Import Components

```tsx
import { ExportModal, ExportButton } from "@/components/export";
import { useExport } from "@/hooks/useExport";
import type { ExportContent } from "@/components/export";
```

### Step 2: Add Hook to Component

```tsx
export function MyDashboard() {
  const {
    isModalOpen,
    currentContent,
    openExport,
    closeExport,
    handleExport,
  } = useExport();

  // Your existing code...
}
```

### Step 3: Add Export Button & Modal

```tsx
export function MyDashboard() {
  const { isModalOpen, currentContent, openExport, closeExport, handleExport } = useExport();

  const handleExportClick = () => {
    const content: ExportContent = {
      id: "item-123",
      type: "clip", // or "post", "quote", "chapter"
      title: "My Content Title",
      caption: "This is the caption text",
      createdAt: new Date(),
    };

    openExport(content);
  };

  return (
    <div>
      {/* Your existing dashboard content */}

      <ExportButton onClick={handleExportClick} />

      <ExportModal
        isOpen={isModalOpen}
        onClose={closeExport}
        content={currentContent}
        onExport={handleExport}
      />
    </div>
  );
}
```

## Complete Working Example

Here's a complete, copy-paste ready example:

```tsx
"use client";

import { ExportModal, ExportButton, type ExportContent } from "@/components/export";
import { useExport } from "@/hooks/useExport";

export function SimpleExportExample() {
  const {
    isModalOpen,
    currentContent,
    openExport,
    closeExport,
    handleExport,
    generateHashtagSuggestions,
  } = useExport({
    onSuccess: (result) => {
      console.log("✓ Export successful!", result);
      alert(`Export complete: ${result.filename}`);
    },
    onError: (error) => {
      console.error("✗ Export failed:", error);
      alert(`Export failed: ${error.message}`);
    },
  });

  const handleExportClip = () => {
    const content: ExportContent = {
      id: "clip-001",
      type: "clip",
      title: "Amazing Gaming Moment",
      caption: "Check out this incredible highlight from today's stream!",
      videoUrl: "/videos/clip-001.mp4",
      thumbnailUrl: "/thumbnails/clip-001.jpg",
      duration: 30,
      createdAt: new Date(),
    };

    openExport(content);
  };

  const handleExportPost = () => {
    const content: ExportContent = {
      id: "post-001",
      type: "post",
      title: "Social Media Post",
      caption: "Just finished an epic stream! Thanks everyone for watching! 🎮",
      createdAt: new Date(),
    };

    openExport(content);
  };

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Export Examples</h1>

      <div className="flex gap-4">
        <ExportButton
          onClick={handleExportClip}
          variant="primary"
          label="Export Clip"
        />

        <ExportButton
          onClick={handleExportPost}
          variant="default"
          label="Export Post"
        />
      </div>

      <ExportModal
        isOpen={isModalOpen}
        onClose={closeExport}
        content={currentContent}
        onExport={handleExport}
        hashtagSuggestions={
          currentContent ? generateHashtagSuggestions(currentContent) : []
        }
      />
    </div>
  );
}
```

## Add to Existing Card Component

If you have an existing card component, just add the export button:

### Before
```tsx
export function ClipCard({ clip }) {
  return (
    <div className="clip-card">
      <img src={clip.thumbnail} alt={clip.title} />
      <h3>{clip.title}</h3>
      <p>{clip.description}</p>

      <button onClick={() => onEdit(clip)}>Edit</button>
      <button onClick={() => onPlay(clip)}>Play</button>
    </div>
  );
}
```

### After
```tsx
import { ExportButton, ExportModal, type ExportContent } from "@/components/export";
import { useExport } from "@/hooks/useExport";

export function ClipCard({ clip }) {
  const { isModalOpen, currentContent, openExport, closeExport, handleExport } = useExport();

  const handleExportClick = () => {
    const content: ExportContent = {
      id: clip.id,
      type: "clip",
      title: clip.title,
      caption: clip.description,
      videoUrl: clip.videoUrl,
      thumbnailUrl: clip.thumbnail,
      duration: clip.duration,
      createdAt: clip.createdAt,
    };

    openExport(content);
  };

  return (
    <>
      <div className="clip-card">
        <img src={clip.thumbnail} alt={clip.title} />
        <h3>{clip.title}</h3>
        <p>{clip.description}</p>

        <button onClick={() => onEdit(clip)}>Edit</button>
        <button onClick={() => onPlay(clip)}>Play</button>
        <ExportButton onClick={handleExportClick} variant="ghost" size="sm" />
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

## Common Use Cases

### Use Case 1: Export Clip with Video
```tsx
const content: ExportContent = {
  id: clip.id,
  type: "clip",
  title: clip.title,
  caption: clip.hookText,
  videoUrl: `/api/clips/${clip.id}/video`,
  thumbnailUrl: clip.thumbnailUrl,
  duration: clip.duration,
  createdAt: clip.createdAt,
};
```

### Use Case 2: Export Social Post (Text Only)
```tsx
const content: ExportContent = {
  id: post.id,
  type: "post",
  title: "Social Post",
  caption: post.content,
  createdAt: post.createdAt,
};
```

### Use Case 3: Export Quote
```tsx
const content: ExportContent = {
  id: quote.id,
  type: "quote",
  title: `Quote from ${quote.speaker}`,
  caption: quote.text,
  createdAt: new Date(),
};
```

### Use Case 4: Export Chapter/Timestamp
```tsx
const content: ExportContent = {
  id: chapter.id,
  type: "chapter",
  title: chapter.title,
  caption: chapter.description,
  createdAt: new Date(),
};
```

## Customization Options

### Custom Success/Error Handling
```tsx
const { ... } = useExport({
  onSuccess: (result) => {
    // Show success toast
    toast.success(`Exported to ${result.platform}`);

    // Track analytics
    analytics.track('export_success', { platform: result.platform });
  },
  onError: (error) => {
    // Show error toast
    toast.error(`Export failed: ${error.message}`);

    // Log to error tracking
    Sentry.captureException(error);
  },
});
```

### Custom Hashtag Suggestions
```tsx
const customSuggestions: HashtagSuggestion[] = [
  { tag: "gaming", relevance: 0.9, popularity: "high", platforms: ["x", "instagram"] },
  { tag: "twitch", relevance: 0.85, popularity: "high", platforms: ["x", "tiktok"] },
  { tag: "streamer", relevance: 0.8, popularity: "medium", platforms: ["instagram"] },
];

<ExportModal
  {...props}
  hashtagSuggestions={customSuggestions}
/>
```

### Custom Caption Templates
```tsx
const customTemplates: CaptionTemplate[] = [
  {
    id: "gaming",
    name: "Gaming Style",
    template: "🎮 {title}\n\nGG! 🔥\n\n{hashtags}",
    platforms: ["x", "instagram", "tiktok"],
    variables: ["title", "hashtags"],
  },
];

<ExportModal
  {...props}
  captionTemplates={customTemplates}
/>
```

## Styling

### Change Button Appearance
```tsx
// Primary gradient button
<ExportButton variant="primary" size="lg" />

// Ghost button (minimal)
<ExportButton variant="ghost" size="sm" />

// Icon only
<ExportButton variant="icon" showIcon />

// Custom styling
<ExportButton
  variant="default"
  className="bg-purple hover:bg-purple-600"
/>
```

## Next Steps

1. **Test the integration**: Click the export button and go through the workflow
2. **Add to other components**: Integrate into more cards/items
3. **Connect to API**: Replace mock in `useExport` with real API calls
4. **Customize**: Add your hashtags, templates, and branding
5. **Add batch export**: Allow selecting multiple items
6. **Track analytics**: Monitor export usage and success rates

## Troubleshooting

### Modal doesn't open
- Check that `isModalOpen` is properly managed
- Ensure `openExport()` is called with valid content

### Export button not visible
- Check that component is imported correctly
- Verify button has proper styling/size

### Character count validation fails
- Ensure content has `caption` property
- Check that platform is selected

### Download doesn't work
- Verify `videoUrl` or `url` is provided
- Check CORS settings if loading external URLs
- Ensure browser supports download API

## Getting Help

- Full documentation: `/components/export/README.md`
- Integration guide: `/EXPORT_INTEGRATION_GUIDE.md`
- Component showcase: `/components/export/COMPONENT_SHOWCASE.md`
- Type definitions: `/components/export/types.ts`

---

That's it! You now have a fully functional export system integrated into your dashboard. The modal provides a guided 4-step workflow that handles platform selection, format options, caption editing, and export/download.
