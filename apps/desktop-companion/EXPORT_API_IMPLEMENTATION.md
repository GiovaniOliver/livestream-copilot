# Social Media Export API Implementation

## Overview

Complete backend API implementation for social media export functionality in the desktop companion application. This system provides comprehensive export capabilities for social media posts and video clips with platform-specific optimizations.

## Implementation Status

### Completed Components

1. **Database Schema** (`prisma/schema.prisma`)
   - Added `Export` model with comprehensive tracking
   - Added enums: `ExportType`, `ExportStatus`, `SocialPlatform`, `ExportFormat`
   - Supports export history, metadata, and file management

2. **Type Definitions** (`src/export/types.ts`)
   - Platform constraints configuration
   - Request/response interfaces
   - Format options and conversion settings
   - Complete TypeScript type safety

3. **Platform Formatters** (`src/export/formatters.ts`)
   - Platform-specific text formatting
   - Character limit enforcement
   - Thread splitting for Twitter/Bluesky
   - Hashtag optimization
   - Professional/casual tone adjustments
   - YouTube timestamp generation

4. **Video Converter** (`src/export/video-converter.ts`)
   - FFmpeg-based video conversion
   - Support for MP4, WebM, GIF, MOV formats
   - Quality presets (low, medium, high, original)
   - Aspect ratio transformation
   - Platform-specific optimizations
   - Watermark support
   - Thumbnail generation

5. **Database Service** (`src/db/services/export.service.ts`)
   - CRUD operations for exports
   - Export history tracking
   - Statistics aggregation
   - Filtering and pagination
   - Cleanup utilities

6. **Export Service** (`src/export/service.ts`)
   - Orchestrates export operations
   - Post formatting and export
   - Clip conversion and export
   - Batch export support
   - Preview functionality
   - Error handling

7. **API Routes** (`src/export/routes.ts`)
   - POST `/api/v1/export/post` - Export social post
   - POST `/api/v1/export/clip` - Export clip
   - POST `/api/v1/export/batch` - Batch export
   - GET `/api/v1/export/history` - Get history
   - GET `/api/v1/export/stats` - Get statistics
   - DELETE `/api/v1/export/:id` - Delete export
   - POST `/api/v1/export/preview` - Preview post

## Platform Support

### Supported Platforms

| Platform | Character Limit | Threads | Video Formats | Max Video Size | Max Duration |
|----------|----------------|---------|---------------|----------------|--------------|
| Twitter/X | 280 | Yes | MP4, MOV | 512 MB | 140s |
| LinkedIn | 3000 | No | MP4, MOV | 5 GB | 600s |
| Instagram | 2200 | No | MP4, MOV | 100 MB | 60s |
| TikTok | 2200 | No | MP4, WEBM, MOV | 500 MB | 600s |
| YouTube | 5000 | No | MP4, MOV, WEBM | 256 GB | 12 hours |
| Facebook | 63206 | No | MP4, MOV | 10 GB | 2 hours |
| Threads | 500 | No | MP4, MOV | 500 MB | 300s |
| Bluesky | 300 | Yes | MP4 | 50 MB | 60s |

### Platform-Specific Features

#### Twitter/X
- Auto-thread splitting for longer content
- 2-3 hashtags for optimal engagement
- Continuation markers ("...")
- Numbered threads (1/5, 2/5, etc.)

#### LinkedIn
- Professional tone enhancement
- 3-5 hashtags optimal
- Call-to-action generation
- Line break optimization for readability

#### Instagram
- Casual tone enhancement
- Up to 15 hashtags
- Emoji-friendly formatting
- Visual appeal optimization

#### TikTok
- Punchy, short-form content
- Trending hashtag focus
- Up to 10 hashtags
- 9:16 vertical video optimization

#### YouTube
- Chapter timestamp generation
- Up to 5 hashtags (first 3 show above title)
- Subscribe call-to-action
- Long-form description support

## API Endpoints

### Export Post

```http
POST /api/v1/export/post
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Your social media post content here",
  "platform": "TWITTER",
  "sessionId": "optional-session-id",
  "clipId": "optional-clip-id",
  "options": {
    "copyToClipboard": true,
    "saveToFile": true,
    "optimizeHashtags": true,
    "createThread": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "export-id",
    "type": "POST",
    "status": "COMPLETED",
    "content": "Formatted post content",
    "filePath": "/path/to/export.txt",
    "metadata": {
      "isThread": true,
      "threadParts": ["Part 1/2", "Part 2/2"],
      "characterCount": 280,
      "hashtags": ["#hashtag1", "#hashtag2"],
      "warnings": []
    },
    "createdAt": "2026-01-13T...",
    "completedAt": "2026-01-13T..."
  }
}
```

### Export Clip

```http
POST /api/v1/export/clip
Authorization: Bearer <token>
Content-Type: application/json

{
  "clipId": "artifact-id-from-clip",
  "format": "MP4",
  "platform": "TIKTOK",
  "options": {
    "quality": "high",
    "generateThumbnail": true,
    "optimizeForPlatform": true,
    "targetAspectRatio": "9:16"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "export-id",
    "type": "CLIP",
    "status": "COMPLETED",
    "filePath": "/path/to/clip_tiktok.mp4",
    "fileSize": 15728640,
    "thumbnailPath": "/path/to/clip_tiktok_thumb.jpg",
    "createdAt": "2026-01-13T...",
    "completedAt": "2026-01-13T..."
  }
}
```

### Batch Export

```http
POST /api/v1/export/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "type": "post",
      "data": { "text": "...", "platform": "TWITTER" }
    },
    {
      "type": "clip",
      "data": { "clipId": "...", "format": "MP4" }
    }
  ],
  "options": {
    "zipOutput": true,
    "includeMetadata": true
  }
}
```

### Get Export History

```http
GET /api/v1/export/history?limit=50&offset=0
Authorization: Bearer <token>
```

### Get Export Statistics

```http
GET /api/v1/export/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byType": {
      "POST": 100,
      "CLIP": 45,
      "BATCH": 5
    },
    "byPlatform": {
      "TWITTER": 50,
      "LINKEDIN": 30,
      "INSTAGRAM": 25,
      ...
    },
    "byStatus": {
      "COMPLETED": 145,
      "FAILED": 3,
      "PROCESSING": 2
    },
    "totalFileSize": "1073741824",
    "averageFileSize": 7158278
  }
}
```

### Delete Export

```http
DELETE /api/v1/export/:id
Authorization: Bearer <token>
```

### Preview Post

```http
POST /api/v1/export/preview
Content-Type: application/json

{
  "text": "Your post content to preview",
  "platforms": ["TWITTER", "LINKEDIN", "INSTAGRAM"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "previews": {
      "TWITTER": {
        "platform": "TWITTER",
        "content": "Formatted content for Twitter",
        "isThread": false,
        "hashtags": ["#hashtag1"],
        "characterCount": 120,
        "truncated": false,
        "warnings": []
      },
      "LINKEDIN": { ... },
      "INSTAGRAM": { ... }
    }
  }
}
```

## Installation & Setup

### 1. Database Migration

```bash
cd apps/desktop-companion
npm run db:migrate
```

This will create the `Export` table and related enums.

### 2. Required Dependencies

All dependencies are already included in `package.json`:
- `fluent-ffmpeg` - Video conversion
- `zod` - Validation
- `express` - HTTP server

### 3. Configuration

Add to `.env` if needed:
```env
# FFmpeg paths (optional, uses system ffmpeg if not specified)
FFMPEG_PATH=/path/to/ffmpeg
FFPROBE_PATH=/path/to/ffprobe

# Export directory (optional, defaults to ./exports)
EXPORT_DIR=./exports
```

### 4. Mount Routes

The export router is automatically mounted at `/api/v1/export` when the server starts.

## Usage Examples

### Node.js/TypeScript Client

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});

// Export a post
const exportPost = await apiClient.post('/export/post', {
  text: 'Check out this amazing livestream clip! #streaming #content',
  platform: 'TWITTER',
  options: {
    optimizeHashtags: true,
    createThread: true
  }
});

// Export a clip for TikTok
const exportClip = await apiClient.post('/export/clip', {
  clipId: 'artifact-123',
  format: 'MP4',
  platform: 'TIKTOK',
  options: {
    quality: 'high',
    optimizeForPlatform: true,
    targetAspectRatio: '9:16'
  }
});

// Get export history
const history = await apiClient.get('/export/history?limit=20');
```

### cURL Examples

```bash
# Export post
curl -X POST http://localhost:3000/api/v1/export/post \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "My post content",
    "platform": "LINKEDIN",
    "options": {"saveToFile": true}
  }'

# Export clip
curl -X POST http://localhost:3000/api/v1/export/clip \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clipId": "clip-123",
    "format": "MP4",
    "platform": "YOUTUBE"
  }'

# Get statistics
curl -X GET http://localhost:3000/api/v1/export/stats \
  -H "Authorization: Bearer $TOKEN"
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid request data
- `CLIP_NOT_FOUND` - Requested clip doesn't exist
- `CLIP_FILE_NOT_FOUND` - Clip file missing on disk
- `EXPORT_NOT_FOUND` - Export record not found
- `UNAUTHORIZED` - User not authorized for this operation
- `POST_EXPORT_FAILED` - Post export failed
- `CLIP_EXPORT_FAILED` - Clip export failed
- `CONVERSION_FAILED` - Video conversion failed
- `DURATION_EXCEEDED` - Video too long for platform
- `SIZE_EXCEEDED` - File too large for platform
- `UNSUPPORTED_FORMAT` - Format not supported
- `INTERNAL_ERROR` - Unexpected server error

## File Structure

```
apps/desktop-companion/
├── prisma/
│   └── schema.prisma                 # Updated with Export model
├── src/
│   ├── export/
│   │   ├── index.ts                  # Module exports
│   │   ├── types.ts                  # Type definitions
│   │   ├── formatters.ts             # Platform formatters
│   │   ├── video-converter.ts        # Video conversion
│   │   ├── service.ts                # Business logic
│   │   └── routes.ts                 # API routes
│   ├── db/services/
│   │   ├── export.service.ts         # Database operations
│   │   └── index.ts                  # Updated exports
│   └── index.ts                      # Updated to mount routes
└── exports/                          # Generated exports directory
    ├── posts/                        # Text exports
    └── clips/                        # Video exports
```

## Testing

### Manual Testing

1. Start the server:
```bash
npm run dev
```

2. Authenticate and get access token
3. Test endpoints using Postman or cURL
4. Check database for export records
5. Verify exported files in `exports/` directory

### Integration Tests (TODO)

```typescript
describe('Export API', () => {
  test('should export post to Twitter format', async () => {
    const response = await request(app)
      .post('/api/v1/export/post')
      .set('Authorization', `Bearer ${token}`)
      .send({
        text: 'Test post content',
        platform: 'TWITTER'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe('POST');
  });

  test('should convert clip to MP4', async () => {
    // Test implementation
  });
});
```

## Performance Considerations

1. **Video Conversion**: CPU-intensive, consider:
   - Queue system for batch conversions
   - Background job processing
   - Progress tracking via WebSockets

2. **Large Files**: Handle carefully:
   - Stream processing for large videos
   - Chunk uploads/downloads
   - Temporary file cleanup

3. **Database**: Optimize queries:
   - Indexes on userId, platform, createdAt
   - Pagination for history
   - Archive old exports

## Security

1. **Authentication**: All routes require valid JWT token
2. **Authorization**: Users can only access their own exports
3. **File Access**: Validate file paths to prevent directory traversal
4. **Input Validation**: Zod schemas validate all inputs
5. **Rate Limiting**: Implement at API gateway level

## Future Enhancements

1. **Direct Platform Integration**
   - OAuth integration with platforms
   - Direct posting to Twitter, LinkedIn, etc.
   - Schedule posts for later

2. **Advanced Video Features**
   - Transitions and effects
   - Text overlays and captions
   - Audio normalization
   - Subtitle generation

3. **Analytics**
   - Track export performance
   - Popular platforms
   - Conversion success rates

4. **Batch Processing**
   - Queue system integration
   - Progress tracking
   - Email notifications

5. **Cloud Storage**
   - Upload to S3/CloudFlare R2
   - CDN integration for delivery
   - Share links generation

## Support & Documentation

- API Documentation: Auto-generated from OpenAPI specs
- Code Documentation: JSDoc comments throughout
- Type Safety: Complete TypeScript coverage
- Error Messages: Descriptive and actionable

## License

Same as parent project.
