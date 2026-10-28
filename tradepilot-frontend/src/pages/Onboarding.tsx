import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../context/AccountContext';
import AccountForm from '../components/AccountForm';
import { Panel, NewTrade } from '../components/WorkspaceUI';
import type { AccountInput } from '../types/account';
export default function Onboarding() {
    const { user } = useAuth();
    const { accounts, addAccount } = useAccounts();
    const navigate = useNavigate();
    const [step, setStep] = useState(0), [creating, setCreating] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    function spacing(value:string){try{localStorage.setItem(`tradepilot:display:${user?.id}`,value);document.documentElement.dataset.density=value;setError('');setStep(2);}catch{setError('Workspace spacing could not be saved in this browser. Retry or skip setup.');}}
    async function create(input: AccountInput) { setBusy(true); try {
        await addAccount(input);
        setStep(3);
    }
    catch {
        setError('Account could not be saved. Your form remains here.');
    }
    finally {
        setBusy(false);
    } }
    return <div className="onboarding">
    <p className="muted">Your workspace, at your pace</p>{error&&<p className="notice error" role="alert">{error}</p>}
    <div className="onboarding-steps" aria-label={`Onboarding step ${step + 1} of 4`}>{[0, 1, 2, 3].map(i => <span key={i} className={i <= step ? 'active' : ''}/>)}</div>{step === 0 && <Panel>
        <h1>Welcome aboard, {user?.name?.split(' ')[0]}.</h1>
        <p className="muted section-gap">Record the plan. Capture what happened. Learn from a journal that keeps the difference clear.</p>
        <button className="button primary section-gap" onClick={() => setStep(1)}>Set up my workspace</button>
        </Panel>}{step === 1 && <Panel title="Choose your workspace spacing">
        <p className="muted">Preferences apply to this browser. You can change them in Settings.</p>
        <div className="form-footer">{['comfortable', 'compact'].map(v => <button className="button" key={v} onClick={() => spacing(v)}>{v === 'comfortable' ? 'Comfortable spacing' : 'Compact spacing'}</button>)}</div>
        </Panel>}{step === 2 && <Panel title="Your first trading account">{accounts.length > 0 && !creating ? <>
            <p>You already have {accounts.length} account{accounts.length === 1 ? '' : 's'} ready. Broker names are labels; they do not establish a broker connection.</p>
            <div className="form-footer">
            <button className="button" onClick={() => setCreating(true)}>Create another account</button>
            <button className="button primary" onClick={() => setStep(3)}>Use existing account</button>
            </div>
            </> : <><AccountForm onSubmit={create} submitLabel="Create Account" isSubmitting={busy}/>
            </>}</Panel>}{step === 3 && <Panel>
        <h1>You’re ready for your next decision.</h1>
        <p className="muted section-gap">Start with a basic journal entry. Actual results are optional and require confirmed denomination in a financial-enabled test environment.</p>
        <div className="form-footer">
        <NewTrade />
        <button className="button" onClick={() => navigate('/dashboard')}>Explore dashboard</button>
        </div>
        </Panel>}<div className="form-footer">{step > 0 && <button className="button ghost" onClick={() => setStep(s => s - 1)}>Back</button>}<Link to="/dashboard" className="button ghost">Skip setup</Link>
    </div>
    </div>;
}
