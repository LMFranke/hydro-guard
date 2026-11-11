import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

export type ButtonVariant =
    | 'primary'
    | 'dark'
    | 'success'
    | 'danger-soft'
    | 'outline';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    leftIcon?: ReactNode;
    children: ReactNode;
}

export function Button({
                           variant = 'primary',
                           size = 'md',
                           fullWidth = false,
                           leftIcon,
                           className = '',
                           children,
                           type = 'button',
                           ...rest
                       }: ButtonProps) {
    const classes = [
        'hg-btn',
        `hg-btn-${variant}`,
        `hg-btn-${size}`,
        fullWidth ? 'hg-btn-full' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button type={type} className={classes} {...rest}>
            {leftIcon}
            <span>{children}</span>
        </button>
    );
}