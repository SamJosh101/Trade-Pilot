import { useState, useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, Command, ChevronDown, Plus, ArrowUpRight, UserRound } from 'lucide-react';
import { useAccounts } from '../context/AccountContext';
import { destinations } from '../constants/navigation';
import { Dialog } from './WorkspaceUI';
export default function Navbar({ onMenu }: {
    onMenu: () => void;
}) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { accounts, activeAccountId, setActiveAccount, isLoading } = useAccounts();
    const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [error, setError] = useState('');
    const current = destinations.find(d => pathname.startsWith(d.to));
    useLayoutEffect(() => { const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(v => !v);
    } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);
    return <>
    <header className="workspace-header">
    <div className="header-location">
    <button className="icon-button mobile-menu" onClick={onMenu} aria-label="Open navigation">
    <Menu size={20}/>
    </button>
    <span className="header-wordmark">TradePilot</span>
    <span className="header-divider">/</span>
    <span>{pathname.includes('/edit') ? 'Edit trade' : pathname.endsWith('/new') ? 'New trade' : current?.label ?? 'Workspace'}</span>
    </div>
    <div className="header-tools">
    <button className="command-trigger" onClick={() => setOpen(true)} aria-label="Open command menu">
    <Search size={16}/>
    <span>Jump to…</span>
    <kbd>
    <Command size={11}/>K</kbd>
    </button>
    <label className="account-switcher">
    <span className="account-selector-label">Account</span>
    <span className="account-status"/>
    <select aria-label="Trading account" value={activeAccountId ?? ''} disabled={isLoading || !accounts.length} onChange={async (e) => { setError(''); try {
        await setActiveAccount(e.target.value);
    }
    catch {
        setError('Account switch failed. Retry.');
    } }}>{!accounts.length && <option value="">No account</option>}{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
    <ChevronDown size={13}/>
    </label>
    <Link className="icon-button header-add" to="/trades/new" aria-label="New trade">
    <Plus size={18}/>
    </Link>
    <Link className="icon-button header-profile" to="/settings" aria-label="Profile and preferences"><UserRound size={17}/></Link>
    </div>
    </header>{error && <div className="notice error" role="alert">{error}</div>}{open && <Dialog title="Go anywhere" onClose={() => setOpen(false)} className="command-dialog">
        <input autoFocus aria-label="Search destinations" placeholder="Search pages and actions…" value={query} onChange={e => setQuery(e.target.value)}/>
        <div className="command-results">{[...destinations, { to: '/trades/new', label: 'Add a trade', Icon: Plus }].filter(d => d.label.toLowerCase().includes(query.toLowerCase())).map(({ to, label, Icon }) => <button key={to} onClick={() => { navigate(to); setOpen(false); setQuery(''); }}>
            <Icon size={18}/>{label}<ArrowUpRight size={15}/>
            </button>)}</div>
        <p className="muted">Only available TradePilot pages and actions. Esc to close.</p>
        </Dialog>}</>;
}
