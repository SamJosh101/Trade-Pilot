import { useEffect, useRef, type ReactNode } from 'react';
import { X, ArrowUpRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Brand({ compact = false }: {
    compact?: boolean;
}) {
    return <Link to="/dashboard" aria-label="TradePilot home" className="brand">
    <span className="brand-mark">
    <svg viewBox="0 0 28 28" aria-hidden="true">
    <path d="M6 21V7h9a5 5 0 0 1 0 10H9M11 23 22 5M16 5h6v6"/>
    </svg>
    </span>{!compact && <span>TradePilot<span className="brand-dot">.</span>
        </span>}</Link>;
}
export function Panel({ title, action, children, className = '', surface = 'ash' }: {
    surface?: 'ash' | 'edge' | 'wash' | 'quiet';
    title?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return <section className={`panel surface-${surface} ${className}`}>{(title || action) && <div className="panel-heading">
        <h2>{title}</h2>{action}</div>}{children}</section>;
}
export function PageHeading({ title, description, children }: {
    title: string;
    description?: string;
    children?: ReactNode;
}) {
    return <div className="page-heading">
    <div>
    <h1>{title}</h1>{description && <p>{description}</p>}</div>
    <div className="page-actions">{children}</div>
    </div>;
}
export function NewTrade() {
    return <Link className="button primary" to="/trades/new">
    <Plus size={16}/>New trade</Link>;
}
export function EmptyState({ title, description, action }: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return <div className="empty-state">
    <span className="empty-symbol">
    <ArrowUpRight size={24}/>
    </span>
    <h3>{title}</h3>{description && <p>{description}</p>}{action}</div>;
}
export function Skeleton() {
    return <div aria-label="Loading workspace" role="status" className="skeleton-grid">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton"/>)}</div>;
}
export function Badge({ children, tone = 'neutral' }: {
    children: ReactNode;
    tone?: string;
}) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Dialog({ title, children, onClose, className = '' }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
    className?: string;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => { const previous = document.activeElement as HTMLElement | null; const d = ref.current; d?.showModal(); return () => { d?.close(); previous?.focus(); }; }, []);
    return <dialog ref={ref} className={`workspace-dialog ${className}`} aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget)
        onClose(); }}>
    <div className="dialog-heading">
    <h2>{title}</h2>
    <button className="icon-button" aria-label="Close" onClick={onClose}>
    <X size={20}/>
    </button>
    </div>{children}</dialog>;
}
