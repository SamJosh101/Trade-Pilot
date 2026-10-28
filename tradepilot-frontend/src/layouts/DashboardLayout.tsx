import { Outlet } from 'react-router-dom';
import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import AccountScope from '../components/AccountScope';
export default function DashboardLayout() {
    const [expanded, setExpanded] = useState(false), [mobile, setMobile] = useState(false);
    const {user}=useAuth();
    useEffect(()=>{try{document.documentElement.dataset.density=localStorage.getItem(`tradepilot:display:${user?.id}`)==='compact'?'compact':'comfortable';}catch{document.documentElement.dataset.density='comfortable';}},[user?.id]);
    useEffect(()=>{
      if(!mobile)return;
      const panel=document.querySelector<HTMLElement>('.workspace-sidebar'),body=document.querySelector<HTMLElement>('.workspace-body'),previous=document.activeElement as HTMLElement|null;
      if(body)body.inert=true;
      const items=()=>Array.from(panel?.querySelectorAll<HTMLElement>('a,button:not(:disabled)')??[]);
      items()[0]?.focus();
      const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMobile(false);return}if(event.key==='Tab'){const focusable=items(),first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}};
      const resize=()=>{if(innerWidth>=768)setMobile(false)};
      window.addEventListener('keydown',key);window.addEventListener('resize',resize);
      return()=>{if(body)body.inert=false;window.removeEventListener('keydown',key);window.removeEventListener('resize',resize);previous?.focus()};
    },[mobile]);
    return <div className={`workspace ${expanded ? 'nav-expanded' : ''} ${mobile ? 'mobile-nav-open' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>{mobile && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobile(false)}/>}<Sidebar mobile={mobile} expanded={expanded} toggle={() => setExpanded(v => !v)} onNavigate={() => setMobile(false)}/>
    <div className="workspace-body">
    <Navbar onMenu={() => setMobile(v => !v)}/>
    <main id="main-content" tabIndex={-1} className="workspace-main">
    <AccountScope />
    <Suspense fallback={<div role="status" className="workspace-page-loading">Loading page…</div>}><Outlet /></Suspense>
    </main>
    <footer className="workspace-footer">
    <span>TradePilot · Your process. Your progress.</span>
    <span>Journal data is user reported</span>
    </footer>
    </div>
    </div>;
}
