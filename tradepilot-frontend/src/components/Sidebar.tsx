import { NavLink, Link } from 'react-router-dom';
import { Plus, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Brand } from './WorkspaceUI';
import { destinations } from '../constants/navigation';
import ProfileAvatar from './ProfileAvatar';
export default function Sidebar({ expanded, onNavigate, mobile=false }: {
    expanded: boolean;
    mobile?: boolean;
    toggle: () => void;
    onNavigate: () => void;
}) {
    const { user } = useAuth();
    return <aside role={mobile?'dialog':undefined} aria-modal={mobile||undefined} aria-label={mobile?'Navigation':undefined} className={`workspace-sidebar ${expanded ? 'expanded' : ''}`}>
    <div className="sidebar-brand">
    <Brand compact={!expanded}/>
    </div>
    <nav aria-label="Main navigation">{[['Workspace',destinations.slice(0,4)],['Your journal',destinations.filter(d=>['Notes','Gameplans','Strategies'].includes(d.label))],['Manage',destinations.filter(d=>['Accounts','Settings'].includes(d.label))]].map(([group,items])=><div className="nav-group" key={group as string}><span className="nav-group-label">{group as string}</span>{(items as typeof destinations).map(({ to, label, Icon }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`} aria-label={label}>
        <Icon size={19} strokeWidth={1.65}/>
        <span className="rail-label">{label}</span>
        <span className="rail-tooltip" aria-hidden="true">{label}</span>
        </NavLink>)}</div>)}</nav>
    <div className="rail-bottom">
    <Link to="/trades/new" onClick={onNavigate} className="rail-add" aria-label="Quick add trade">
    <Plus size={22}/>
    <span className="rail-label">New trade</span>
    </Link>
    <Link to="/settings" className="workspace-person" title={user?.name} aria-label="Profile settings"><span className="rail-avatar"><ProfileAvatar/></span><span className="rail-label"><strong>Personal trading</strong><small>{user?.name??'Your workspace'}</small></span><ChevronDown size={12}/></Link>
    </div>
    </aside>;
}
