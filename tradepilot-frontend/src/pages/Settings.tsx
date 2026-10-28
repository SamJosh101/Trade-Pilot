import SecuritySettings from '../components/SecuritySettings';
import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

import { useCapability } from '../hooks/useFinancial';

import { apiError } from '../services/financialService';

import { Panel } from '../components/WorkspaceUI';

export default function Settings() {

    const { user, logout, updateProfile } = useAuth();

    const capability = useCapability();

    const [tab, setTab] = useState('Profile');

    const key = `tradepilot:display:${user?.id}`;

    const [density,setDensity]=useState('comfortable'),[preferenceError,setPreferenceError]=useState('');

    useEffect(()=>{try{const saved=localStorage.getItem(key);setDensity(saved==='compact'?'compact':'comfortable');}catch{setPreferenceError('Browser storage is unavailable. Display preferences cannot be saved.');}},[key]);

    function saveDensity(value:string){try{localStorage.setItem(key,value);setDensity(value);document.documentElement.dataset.density=value;setPreferenceError('');}catch{setPreferenceError('Display preference could not be saved.');}}

    const [editing,setEditing]=useState(false),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[saving,setSaving]=useState(false),[profileError,setProfileError]=useState(''),[savedMessage,setSavedMessage]=useState('');

    async function saveProfile(event:React.FormEvent){event.preventDefault();setSaving(true);setProfileError('');setSavedMessage('');try{await updateProfile({name:name.trim(),email:email.trim(),...(password?{currentPassword:password}:{})});setEditing(false);setPassword('');setSavedMessage('Profile saved to your account.');}catch(error){setProfileError(apiError(error));}finally{setSaving(false);}}



    return <>

    <header className="page-heading settings-header"><h1>Settings</h1>

    <nav className="settings-nav" aria-label="Settings sections">{['Profile', 'Display preferences', 'Financial availability', 'Security'].map(t => <button className={tab === t ? 'active' : ''} aria-current={tab === t ? 'page' : undefined} key={t} onClick={() => setTab(t)}>{t}</button>)}<Link to="/accounts">Trading accounts ↗</Link>

    </nav></header>

    <div className="settings-layout"><div className="settings-content">{tab === 'Profile' && <>

        <h2>Profile</h2>

        <p className="muted section-gap">Your name and email for this workspace.</p>

        <Panel className="section-gap">

        <div className="settings-row">

        <span>Full name</span>

        <strong className="profile-value">{user?.name}</strong>

        </div>

        <div className="settings-row">

        <span>Email address</span>

        <span className="profile-value">{user?.email}</span>

        </div>

        </Panel>

        {savedMessage&&<p role="status" className="notice success">{savedMessage}</p>}

        {!editing?<button className="button section-gap" onClick={()=>{setName(user?.name??'');setEmail(user?.email??'');setPassword('');setProfileError('');setSavedMessage('');setEditing(true);}}>Edit profile</button>:<form className="section-gap" onSubmit={saveProfile}><fieldset disabled={saving}><label className="field">Full name<input aria-label="Profile full name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><label className="field">Email address<input aria-label="Profile email address" required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>{email.trim()!==user?.email&&<label className="field">Current password to change email<input aria-label="Current password to change email" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>}{profileError&&<p className="notice error" role="alert">{profileError}</p>}<div className="form-footer"><button className="button" type="button" onClick={()=>{setEditing(false);setPassword('');}}>Cancel profile changes</button><button className="button primary" type="submit">{saving?'Saving profile…':'Save profile'}</button></div></fieldset></form>}

        </>}{tab === 'Display preferences' && <>

        <h2>Display preferences</h2>

        <p className="muted section-gap">Saved only in this browser, scoped to your profile.</p>

        {preferenceError&&<p role="alert" className="notice error">{preferenceError}</p>}<Panel className="section-gap">

        <label className="settings-row">

        <span>Workspace spacing</span>

        <select aria-label="Workspace spacing" className="button" value={density} onChange={e => saveDensity(e.target.value)}>

        <option value="comfortable">Comfortable</option>

        <option value="compact">Compact</option>

        </select>

        </label>

        <div className="settings-row">

        <span>Appearance</span>

        <span>Charcoal dark workspace</span>

        </div>

        <div className="settings-row">

        <span>Motion</span>

        <span>Follows system reduced-motion preference</span>

        </div>

        <Link className="button section-gap" to="/dashboard">Customize dashboard widgets</Link>

        </Panel>

        </>}{tab === 'Financial availability' && <>

        <h2>Financial availability</h2>

        <Panel className="section-gap">

        <div className="settings-row">

        <span>Backend protocol</span>

        <span>{capability.data?.protocol ?? 'Unavailable'}</span>

        </div>

        <div className="settings-row">

        <span>Financial writes</span>

        <span>{capability.loading?'Checking backend…':!capability.data?'Unavailable — backend could not be checked':capability.data?.writesEnabled ? 'Enabled in this isolated development/test backend' : 'Disabled / read-only'}</span>

        </div>

        <p className="muted section-gap">Database schema: {capability.loading?'Checking…':capability.data?.schemaReady===false?'Legacy schema; actual results unavailable':capability.data?'V1.1 protocol available':'Unavailable'}</p><p className="notice">Production financial writes remain prohibited. This screen cannot enable them or migrate a database.</p>

        <Link className="button" to="/accounts">Review account denomination</Link>

        </Panel>

        </>}{tab === 'Security' && <>

        <SecuritySettings />
        <button className="button danger section-gap" onClick={logout}>Sign out</button>

        </>}</div>

    </div>

    </>;

}

