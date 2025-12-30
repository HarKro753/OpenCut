# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Important Note

**This repository is currently in active development and partially misleading.** Some code, documentation, or features may reference functionality that is not fully implemented or has been temporarily disabled. Always verify the current state of the codebase before making assumptions about what is working.

## Project Overview

OpenCut is a free, open-source video editor built with Next.js, focusing on privacy (no server processing), multi-track timeline editing, and real-time preview. The project is a monorepo using Turborepo with multiple apps including a web application, desktop app (Tauri), background remover tools, and transcription services.

## Essential Commands

**Commands Actually Used in This Project:**

```bash
# Development (run from project root /Users/harrokrog/Desktop/OpenCut/apps/web)
bun dev                    # Start Next.js development server

# Database operations (run from project root /Users/harrokrog/Desktop/OpenCut/apps/web)
bun run db:push:local      # Push schema changes to the database
```

**⚠️ Note:** Other commands may exist in package.json but are not actively used. Only use the commands listed above unless you have a specific reason to deviate.

## Architecture & Key Components

### State Management

The application uses **Zustand** for state management with separate stores for different concerns:

- **editor-store.ts**: Canvas presets, layout guides, app initialization
- **timeline-store.ts**: Timeline tracks, elements, playback state
- **media-store.ts**: Media files and asset management
- **playback-store.ts**: Video playback controls and timing
- **project-store.ts**: Project-level data and persistence
- **panel-store.ts**: UI panel visibility and layout
- **keybindings-store.ts**: Keyboard shortcut management
- **sounds-store.ts**: Audio effects and sound management
- **stickers-store.ts**: Sticker/graphics management

### Storage System

**Multi-layer storage approach:**

- **PostgreSQL**: Projects (server-side storage)
- **IndexedDB**: Saved sounds, media metadata, and timeline data
- **OPFS (Origin Private File System)**: Large media files for better performance
- **Storage Service** (`lib/storage/`): Abstraction layer managing all storage types
  - Projects are persisted to the server via REST API (`/api/projects`)
  - Media files and timelines remain client-side for performance

### Editor Architecture

**Core editor components:**

- **Timeline Canvas**: Custom canvas-based timeline with tracks and elements
- **Preview Panel**: Real-time video preview (currently DOM-based, planned binary refactor)
- **Media Panel**: Asset management with drag-and-drop support
- **Properties Panel**: Context-sensitive element properties

### Media Processing

- **FFmpeg Integration**: Client-side video processing using @ffmpeg/ffmpeg
- **Background Removal**: Python-based tools with multiple AI models (U2Net, SAM, Gemini)
- **Transcription**: Separate service for audio-to-text conversion

## Development Focus Areas

**✅ Recommended contribution areas:**

- Timeline functionality and UI improvements
- Project management features
- Performance optimizations
- Bug fixes in existing functionality
- UI/UX improvements outside preview panel
- Documentation and testing

**⚠️ Areas to avoid (pending refactor):**

- Preview panel enhancements (fonts, stickers, effects)
- Export functionality improvements
- Preview rendering optimizations

**Reason:** The preview system is planned for a major refactor from DOM-based rendering to binary rendering for consistency with export and better performance.

## Code Quality Standards

**Linting & Formatting:**

- Uses **Biome** for JavaScript/TypeScript linting and formatting
- Extends **Ultracite** configuration for strict type safety and AI-friendly code
- Comprehensive accessibility (a11y) rules enforced
- Zero configuration approach with subsecond performance

**Key coding standards from Ultracite:**

- Strict TypeScript with no `any` types
- No React imports (uses automatic JSX runtime)
- Comprehensive accessibility requirements
- Use `for...of` instead of `Array.forEach`
- No TypeScript enums, use const objects
- Always include error handling with try-catch

## Environment Setup

**Required environment variables (apps/web/.env.local):**

```bash
# Database (REQUIRED - projects are stored in PostgreSQL)
# Use standard PostgreSQL format: postgresql://user:password@host:port/database
DATABASE_URL="postgresql://myuser:mypassword@192.168.1.100:5432/opencut"

# Content Management (Optional)
MARBLE_WORKSPACE_KEY="workspace-key"
NEXT_PUBLIC_MARBLE_API_URL="https://api.marblecms.com"

# Freesound API (Optional)
FREESOUND_CLIENT_ID="..."
FREESOUND_API_KEY="..."

# Cloudflare R2 for transcription (Optional)
CLOUDFLARE_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="opencut-transcription"

# Modal transcription endpoint (Optional)
MODAL_TRANSCRIPTION_URL="https://your-modal-endpoint.modal.run"
```

**Database setup:**

```bash
# After making schema changes, push to your database
bun run db:push:local
```

**Important:**

- Projects are stored server-side in PostgreSQL
- Ensure your DATABASE_URL points to a running PostgreSQL instance
- Use standard PostgreSQL connection string format (NOT JDBC format)

## Project Structure

**Monorepo layout:**

- `apps/web/` - Main Next.js application
- `apps/desktop/` - Tauri desktop application
- `apps/bg-remover/` - Python background removal tools
- `apps/transcription/` - Audio transcription service
- `packages/` - Shared packages (database)

**Web app structure:**

- `src/components/` - React components organized by feature
- `src/stores/` - Zustand state management
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and services
- `src/types/` - TypeScript type definitions
- `src/app/` - Next.js app router pages and API routes

## Common Patterns

**Error handling:**

```typescript
try {
  const result = await processData();
  return { success: true, data: result };
} catch (error) {
  console.error("Operation failed:", error);
  return { success: false, error: error.message };
}
```

**Store usage:**

```typescript
const { tracks, addTrack, updateTrack } = useTimelineStore();
```

**Media processing:**

```typescript
import { processVideo } from "@/lib/ffmpeg-utils";
const processedVideo = await processVideo(inputFile, options);
```
