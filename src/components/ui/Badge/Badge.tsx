import type { ReactNode } from 'react';
import './Badge.css';

export type BadgeVariant =
    | 'normal'
    | 'watch'
    | 'warning'
    | 'critical'
    | 'danger'
    | 'below'
    | 'neutral'
    | 'solid-normal'
    | 'solid-watch'
    | 'solid-warning'
    | 'solid-critical'
    | 'solid-neutral';

export interface BadgeProps {
    variant?: BadgeVariant;
    block?: boolean;
    children: ReactNode;
    className?: string;
}

export function Badge({
                          variant = 'normal',
                          block = false,
                          children,
                          className = '',
                      }: BadgeProps) {
    const classes = [
        'hg-badge',
        `hg-badge-${variant}`,
        block ? 'hg-badge-block' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return <span className={classes}>{children}</span>;
}