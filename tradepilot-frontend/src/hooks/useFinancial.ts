import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useAccounts } from '../context/AccountContext';
import { useTrades } from '../context/TradeContext';
import * as api from '../services/financialService';
import type { Capability, Summary } from '../types/financial';
export function useCapability() { const { token } = useAuth(); const [state, setState] = useState<{
    token: string | null;
    data: Capability | null;
    loading: boolean;
}>({ token: null, data: null, loading: true }); useEffect(() => { let current = true; setState({ token, data: null, loading: !!token }); if (token)
    api.capabilities(token).then(data => { if (current)
        setState({ token, data, loading: false }); }).catch(() => { if (current)
        setState({ token, data: null, loading: false }); }); return () => { current = false; }; }, [token]); return { data: state.token === token ? state.data : null, loading: state.token === token ? state.loading : !!token }; }
export function useSummary(filter?: {
    from?: string;
    to?: string;
}) { const { activeAccountId } = useAccounts(); const { token } = useAuth(); const { revision } = useTrades(); const from = filter?.from, to = filter?.to; const key = `${token}:${activeAccountId}:${from ?? ''}:${to ?? ''}:${revision}`; const [reload, setReload] = useState(0); const [state, setState] = useState<{
    key: string;
    data: Summary | null;
    error: string;
    loading: boolean;
}>({ key: '', data: null, error: '', loading: true }); useEffect(() => { const controller = new AbortController(); setState({ key, data: null, error: '', loading: !!activeAccountId }); if (activeAccountId)
    api.summary(activeAccountId, { from, to }, controller.signal).then(data => { if (!controller.signal.aborted)
        setState({ key, data, error: '', loading: false }); }).catch(e => { if (!controller.signal.aborted)
        setState({ key, data: null, error: api.apiError(e), loading: false }); }); return () => controller.abort(); }, [key, reload, activeAccountId, from, to]); return { ...(state.key === key ? state : { data: null, error: '', loading: !!activeAccountId }), retry: () => setReload(v => v + 1) }; }
