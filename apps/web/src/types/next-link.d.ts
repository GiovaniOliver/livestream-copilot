// Fix for Next.js Link type compatibility with React 19
// This resolves type errors with Link component

import 'react';

declare module 'react' {
  // Extend ReactNode to include Promise<ReactNode> for async components
  type ReactNode =
    | React.ReactElement
    | string
    | number
    | Iterable<React.ReactNode>
    | React.ReactPortal
    | boolean
    | null
    | undefined
    | Promise<React.ReactNode>;
}
