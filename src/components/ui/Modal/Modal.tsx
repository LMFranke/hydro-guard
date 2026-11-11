import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Modal.css';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const titleId = useId();

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="hg-modal-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="hg-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <header className="hg-modal-header">
                    <h3 id={titleId}>{title}</h3>
                    <button
                        type="button"
                        className="hg-modal-close-btn"
                        onClick={onClose}
                        aria-label="Fechar janela"
                    >
                        <X size={20} />
                    </button>
                </header>
                <div className="hg-modal-body">{children}</div>
            </div>
        </div>,
        document.body
    );
}