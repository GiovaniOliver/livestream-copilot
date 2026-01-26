# Video Player Components

A comprehensive set of video preview and playback components for the Livestream Copilot web application.

## Components

### VideoPlayer

A fully-featured HTML5 video player with custom controls, keyboard shortcuts, and accessibility features.

**Features:**
- Custom video controls (play/pause, seek, volume, fullscreen)
- Keyboard shortcuts (Space/K to play/pause, arrows to seek, M to mute, F for fullscreen)
- Progress bar with click/drag seeking
- Volume control with click/drag adjustment
- Loading states and error handling
- Responsive design
- Fullscreen support
- Auto-hide controls on inactivity
- Support for multiple video formats (mp4, webm, etc.)

**Usage:**
```tsx
import { VideoPlayer } from '@/components/video';

<VideoPlayer
  src="https://example.com/video.mp4"
  poster="https://example.com/thumbnail.jpg"
  autoPlay={false}
  loop={false}
  muted={false}
  onTimeUpdate={(currentTime, duration) => {
    console.log(`${currentTime}/${duration}`);
  }}
  onEnded={() => console.log('Video ended')}
  onError={(error) => console.error('Playback error:', error)}
/>
```

**Props:**
- `src` (string, required): Video source URL
- `className` (string): Additional CSS classes
- `autoPlay` (boolean): Auto-play on mount
- `loop` (boolean): Loop video playback
- `muted` (boolean): Start muted
- `poster` (string): Poster image URL
- `controls` (boolean): Show custom controls (default: true)
- `onTimeUpdate` (function): Called during playback with current time and duration
- `onEnded` (function): Called when video ends
- `onError` (function): Called on playback error
- `onLoadedMetadata` (function): Called when video metadata loads

**Keyboard Shortcuts:**
- `Space` or `K`: Play/Pause
- `Arrow Left`: Seek backward 5 seconds
- `Arrow Right`: Seek forward 5 seconds
- `Arrow Up`: Increase volume
- `Arrow Down`: Decrease volume
- `M`: Toggle mute
- `F`: Toggle fullscreen
- `0` or `Home`: Seek to start
- `End`: Seek to end

---

### VideoThumbnail

A component for displaying video thumbnails with optional duration, timestamp, and play icon overlay.

**Features:**
- Lazy loading support
- Error handling with fallback UI
- Hover effects
- Configurable aspect ratios (video, square, wide)
- Optional play icon overlay
- Duration and timestamp badges
- Click handling for preview

**Usage:**
```tsx
import { VideoThumbnail } from '@/components/video';

<VideoThumbnail
  src="https://example.com/thumbnail.jpg"
  alt="Video thumbnail"
  duration={120}
  timestamp={300}
  aspectRatio="video"
  showPlayIcon={true}
  showDuration={true}
  showTimestamp={false}
  onClick={() => console.log('Thumbnail clicked')}
/>
```

**Props:**
- `src` (string, required): Thumbnail image URL
- `alt` (string): Image alt text
- `duration` (number): Video duration in seconds
- `timestamp` (number): Video timestamp in seconds
- `className` (string): Additional CSS classes
- `onClick` (function): Click handler
- `showPlayIcon` (boolean): Show play icon overlay (default: true)
- `showDuration` (boolean): Show duration badge (default: true)
- `showTimestamp` (boolean): Show timestamp badge (default: false)
- `aspectRatio` ("video" | "square" | "wide"): Thumbnail aspect ratio (default: "video")
- `loading` ("lazy" | "eager"): Image loading strategy (default: "lazy")

---

### ClipPreviewModal

A full-screen modal for previewing clips with video playback, metadata, and actions.

**Features:**
- Full-screen video preview
- Navigation between clips (previous/next)
- Edit and export actions
- Metadata display (title, duration, timestamp, hook text)
- Keyboard shortcuts (Escape to close, arrows to navigate)
- Click outside to close
- Responsive design

**Usage:**
```tsx
import { ClipPreviewModal } from '@/components/video';

<ClipPreviewModal
  clip={clip}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onEdit={(clip) => console.log('Edit clip:', clip.id)}
  onExport={(clip) => console.log('Export clip:', clip.id)}
  onNext={() => console.log('Next clip')}
  onPrevious={() => console.log('Previous clip')}
  hasNext={true}
  hasPrevious={false}
  videoSrc={getClipMediaUrl(clip.id)}
/>
```

**Props:**
- `clip` (Clip | null, required): Clip data
- `isOpen` (boolean, required): Modal open state
- `onClose` (function, required): Close handler
- `onEdit` (function): Edit clip handler
- `onExport` (function): Export clip handler
- `onNext` (function): Next clip handler
- `onPrevious` (function): Previous clip handler
- `hasNext` (boolean): Has next clip
- `hasPrevious` (boolean): Has previous clip
- `videoSrc` (string): Video source URL (overrides clip.thumbnailUrl)

**Keyboard Shortcuts:**
- `Escape`: Close modal
- `Arrow Left`: Previous clip
- `Arrow Right`: Next clip

---

## Integration Examples

### Basic Integration with ClipCard

```tsx
import { useState } from 'react';
import { ClipCard } from '@/components/dashboards/streamer';
import { ClipPreviewModal } from '@/components/video';
import { getClipMediaUrl } from '@/lib/api/clips';

function MyComponent() {
  const [selectedClip, setSelectedClip] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleClipClick = (clip) => {
    setSelectedClip(clip);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <ClipCard
        clip={clip}
        onClick={handleClipClick}
      />

      <ClipPreviewModal
        clip={selectedClip}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        videoSrc={selectedClip ? getClipMediaUrl(selectedClip.id) : undefined}
      />
    </>
  );
}
```

### Integration with WebSocket Events

```tsx
import { useVideoArtifacts } from '@/hooks/useVideoArtifacts';

function StreamerDashboard({ sessionId }) {
  const { clips, frames, isConnected } = useVideoArtifacts(sessionId);

  return (
    <div>
      {clips.map(clip => (
        <ClipCard
          key={clip.id}
          clip={clip}
          onClick={handleClipClick}
        />
      ))}
    </div>
  );
}
```

### Using the VideoPlayer Directly

```tsx
import { VideoPlayer } from '@/components/video';

function CustomVideoView() {
  return (
    <VideoPlayer
      src="/api/clips/abc123/media"
      poster="/api/clips/abc123/thumbnail"
      onTimeUpdate={(currentTime, duration) => {
        // Update UI with playback progress
      }}
      onError={(error) => {
        // Handle playback errors
      }}
    />
  );
}
```

---

## Video URL Construction

The application provides utility functions to construct video URLs from artifact IDs:

```tsx
import { getClipMediaUrl, getClipThumbnailUrl } from '@/lib/api/clips';

const videoUrl = getClipMediaUrl(artifactId);
// => http://localhost:3123/api/clips/{artifactId}/media

const thumbnailUrl = getClipThumbnailUrl(artifactId);
// => http://localhost:3123/api/clips/{artifactId}/thumbnail
```

The base URL is configured via the `NEXT_PUBLIC_API_URL` environment variable (defaults to `http://localhost:3123`).

---

## Supported Video Formats

The VideoPlayer component supports all HTML5 video formats:
- **MP4** (H.264/H.265): Best browser compatibility
- **WebM** (VP8/VP9): Good performance, smaller file sizes
- **OGG** (Theora): Legacy support

The desktop companion API (port 3123) should serve videos with appropriate MIME types:
- `video/mp4` for MP4 files
- `video/webm` for WebM files
- `video/ogg` for OGG files

---

## Error Handling

All video components include comprehensive error handling:

### VideoPlayer
- Displays error overlay with message on playback failure
- Fires `onError` callback with error details
- Shows loading spinner during buffering

### VideoThumbnail
- Shows fallback UI if thumbnail fails to load
- Graceful degradation with placeholder icon

### ClipPreviewModal
- Handles missing clip data gracefully
- Passes errors through to VideoPlayer
- Closes modal on critical errors

---

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **VideoPlayer**: Keyboard navigation, ARIA labels, focus management
- **VideoThumbnail**: Alt text, keyboard navigation, proper roles
- **ClipPreviewModal**: Focus trap, Escape to close, ARIA modal attributes

---

## Performance Considerations

- **Lazy Loading**: VideoThumbnail uses lazy loading by default
- **Code Splitting**: Components can be lazy loaded with React.lazy()
- **Memory Management**: Proper cleanup of event listeners and timers
- **Optimized Re-renders**: Memoized callbacks and state updates

---

## Styling

Components use Tailwind CSS and follow the application's design system:

- **Colors**: Uses design tokens (teal, purple, success, warning, error)
- **Typography**: Follows text hierarchy (text-text, text-muted, text-dim)
- **Spacing**: Consistent spacing scale
- **Animations**: Smooth transitions and hover effects
- **Dark Mode**: Fully compatible with dark/light themes

---

## Future Enhancements

Potential improvements for future versions:

1. **Picture-in-Picture**: Support for PiP mode
2. **Playback Speed**: Variable playback speed control
3. **Subtitles**: Support for WebVTT subtitle tracks
4. **Quality Selection**: Multiple quality/bitrate options
5. **Download Progress**: Visual download progress indicator
6. **Thumbnail Preview**: Hover scrubbing with thumbnail previews
7. **Chapters**: Support for video chapters/markers
8. **Analytics**: Playback analytics and engagement tracking

---

## Troubleshooting

### Video won't play
- Check video URL is accessible
- Verify video format is supported by browser
- Check CORS headers on video server
- Ensure desktop companion API is running

### Controls not responding
- Check for JavaScript errors in console
- Verify event handlers are properly bound
- Test keyboard shortcuts in different browsers

### Thumbnails not loading
- Check image URL is correct
- Verify CORS headers on image server
- Check network tab for 404/500 errors

### Performance issues
- Enable lazy loading for thumbnails
- Limit number of simultaneous video players
- Use code splitting for large components
- Optimize video encoding and file sizes
