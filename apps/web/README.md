# @livestream-copilot/web

The Next.js 14 web application for FluxBoard - a workflow-first copilot for live content creation.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **React**: 19.x (matching mobile app)

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── layout.tsx    # Root layout with dark theme
│   └── page.tsx      # Home page
├── components/       # Reusable components
│   ├── layout/       # Header, Footer, navigation
│   ├── sections/     # Page sections (Hero, Features, etc.)
│   └── ui/           # Base UI components (Button, Card, Badge)
├── lib/              # Utilities and constants
│   ├── utils.ts      # Helper functions
│   └── constants.ts  # App constants and theme colors
└── styles/           # Global styles
    └── globals.css   # Tailwind base, components, utilities
```

## Theme Colors

The app uses a dark theme matching the mobile app:

| Color     | Hex       | Usage                    |
|-----------|-----------|--------------------------|
| bg0       | `#0D0D12` | Deep background          |
| bg1       | `#16161D` | Card/elevated background |
| bg2       | `#1E1E26` | Hover states             |
| text      | `#EAEAF3` | Primary text             |
| muted     | `#6B6B7B` | Secondary text           |
| teal      | `#00D4C7` | Primary accent           |
| purple    | `#8B5CF6` | Secondary accent         |

## Scripts

```bash
# Development server
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## Dependencies

- Uses `@livestream-copilot/shared` workspace package for shared types and utilities
- Configured for the pnpm monorepo workspace

## Getting Started

1. Install dependencies from the root:
   ```bash
   pnpm install
   ```

2. Run the development server:
   ```bash
   pnpm --filter @livestream-copilot/web dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

## Notes

- The `public/` directory contains static assets including logos and workflow images
- Tailwind is configured with custom colors matching the mobile app theme
- Components use CSS custom properties for potential runtime theming
