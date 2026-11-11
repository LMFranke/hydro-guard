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
    | 'solid-warning'
    | 'solid-critical';

export interface BadgeProps {
    variant: BadgeVariant;
    block?: boolean;
    className?: string;
    children: ReactNode;
}

export function Badge({
                          variant,
                          block = false,
                          className = '',
                          children,
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