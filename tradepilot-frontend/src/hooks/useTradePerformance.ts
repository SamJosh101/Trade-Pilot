import { useEffect, useState } from 'react';
import type { Performance } from '../types/financial';
import { useAuth } from './useAuth';
import { useAccounts } from '../context/AccountContext';
import { useTrades } from '../context/TradeContext';
import { performance } from '../services/financialService';
export function useTradePerformance(ids: string[], available: boolean) { const { token } = useAuth(); const { activeAccountId } = useAccounts(); const { revision } = useTrades(); const idKey = ids.join(','); const key = `${token}:${activeAccountId}:${revision}:${idKey}:${available}`; const [state, setState] = useState<{
    key: string;
    records: Record<string, Performance>;
    errors: string[];
}>({ key: '', records: {}, errors: [] }); useEffect(() => { const controller = new AbortController(); setState({ key, records: {}, errors: [] }); if (available) {
    const selected = idKey ? idKey.split(',') : [];
    (async () => { const records: Record<string, Performance> = {}, errors: string[] = []; for (let offset = 0; offset < selected.length; offset += 3) {
        if (controller.signal.aborted)
            return;
        await Promise.all(selected.slice(offset, offset + 3).map(async (id) => { try {
            records[id] = await performance(id, controller.signal);
        }
        catch {
            errors.push(id);
        } }));
    } if (!controller.signal.aborted)
        setState({ key, records, errors }); })();
} return () => controller.abort(); }, [key, idKey, available]); return state.key === key ? state : { records: {}, errors: [] }; }
