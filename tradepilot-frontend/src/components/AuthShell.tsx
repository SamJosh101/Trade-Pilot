import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Brand } from './WorkspaceUI';
export default function AuthShell({ children }: {
    children: ReactNode;
}) {
    return <main className="auth-shell">
    <aside className="auth-story">
    <Brand />
    <div>
    <blockquote>Better decisions begin with an honest record.</blockquote>
    <p>Your plan, your process, and what actually happened. In one focused workspace.</p>
    </div>
    <p>TradePilot is a journal. It does not execute trades.</p>
    </aside>
    <div className="auth-main">
    <section>
    <Link className="muted" to="/">← Back to TradePilot</Link>
    <div className="section-gap">{children}</div>
    </section>
    </div>
    </main>;
}
