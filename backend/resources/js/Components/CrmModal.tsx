import Icon from '@/Components/Icon';
import { PropsWithChildren, ReactNode, useEffect } from 'react';

type Props = PropsWithChildren<{
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    footer?: ReactNode;
    large?: boolean;
}>;

export default function CrmModal({ open, onClose, title, description, footer, large, children }: Props) {
    useEffect(() => {
        if (!open) return;

        function handleKey(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose();
        }

        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="modal-backdrop open" onClick={onClose}>
            <div className={`modal ${large ? 'modal-lg' : ''}`} onClick={(event) => event.stopPropagation()}>
                <div className="modal-head">
                    <div>
                        <h2>{title}</h2>
                        {description && <p>{description}</p>}
                    </div>
                    <button className="icon-btn" onClick={onClose} aria-label="Tutup">
                        <Icon name="x" />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </div>
        </div>
    );
}
