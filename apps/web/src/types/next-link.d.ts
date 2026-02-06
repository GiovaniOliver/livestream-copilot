// Fix for Next.js Link type compatibility with React 19
// This resolves type errors with Link component

import type { LinkProps as NextLinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

declare module 'next/link' {
  export interface LinkProps<RouteType = any> extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
    href: NextLinkProps<RouteType>['href'];
    as?: NextLinkProps<RouteType>['as'];
    replace?: NextLinkProps<RouteType>['replace'];
    scroll?: NextLinkProps<RouteType>['scroll'];
    shallow?: NextLinkProps<RouteType>['shallow'];
    passHref?: NextLinkProps<RouteType>['passHref'];
    prefetch?: NextLinkProps<RouteType>['prefetch'];
    locale?: NextLinkProps<RouteType>['locale'];
    legacyBehavior?: NextLinkProps<RouteType>['legacyBehavior'];
    children?: ReactNode;
  }

  export default function Link<RouteType = any>(props: LinkProps<RouteType>): JSX.Element;
}
