import { NavLink, Link } from 'react-router-dom';
import { LogOut, Plus, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Brand } from './WorkspaceUI';
import { destinations } from '../constants/navigation';
export default function Sidebar({ expanded, toggle, onNavigate, mobile=false }: {
    expanded: boolean;
    mobile?: boolean;
    toggle: () => void;
    onNavigate: () => void;
}) {
    const { user, logout } = useAuth();
    return <aside role={mobile?'dialog':undefined} aria-modal={mobile||undefined} aria-label={mobile?'Navigation':undefined} className={`workspace-sidebar ${expanded ? 'expanded' : ''}`}>
    <div className="sidebar-brand">
    <Brand compact={!expanded}/>
    </div>
    <nav aria-label="Main navigation">{destinations.map(({ to, label, Icon }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`} aria-label={label}>
        <Icon size={19} strokeWidth={1.65}/>
        <span className="rail-label">{label}</span>
        <span className="rail-tooltip" aria-hidden="true">{label}</span>
        </NavLink>)}</nav>
    <div className="rail-bottom">
    <Link to="/trades/new" onClick={onNavigate} className="rail-add" aria-label="Quick add trade">
    <Plus size={22}/>
    <span className="rail-label">New trade</span>
    </Link>
    <button className="rail-link" onClick={toggle} aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={expanded}>{expanded ? <PanelLeftClose size={19}/> : <PanelLeftOpen size={19}/>}<span className="rail-label">Collapse</span>
    </button>
    <button className="rail-link" title="Logout" aria-label="Logout" onClick={logout}>
    <LogOut size={19}/>
    <span className="rail-label">Sign out</span>
    </button>
    <Link to="/settings" className="rail-avatar" title={user?.name} aria-label="Profile settings"><ProfileAvatar/></Link>
    </div>
    </aside>;
}
import ProfileAvatar from './ProfileAvatar';
