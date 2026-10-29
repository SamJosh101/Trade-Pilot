import StableAsyncContent from './StableAsyncContent';
import { useState } from 'react';
import { useSummary } from '../hooks/useFinancial';
import { compareDecimal, formatDecimal, moneyTone, unitLabel, winRateTone, winRateGuidance } from '../utils/decimal';
import { Panel, EmptyState, Skeleton } from './WorkspaceUI';
import RealizedCurve from './RealizedCurve';
export default function RealizedPanel({ dateFilter = false, fixedFilter }: {
    dateFilter?: boolean;
    fixedFilter?: {
        from: string;
        to: string;
    };
}) {
    const [from, setFrom] = useState(''), [to, setTo] = useState('');
    const filter = { ...(from ? { from: new Date(`${from}T00:00:00Z`).toISOString() } : {}), ...(to ? { to: new Date(`${to}T00:00:00Z`).toISOString() } : {}) };
    const { data, loading, error, retry } = useSummary(fixedFilter ?? filter);
    return <Panel title="Actual realized performance" className="realized-panel" surface="ash" action={<span className="provenance-label"><span/>User reported</span>}>{dateFilter && <div className="filter-toolbar">
        <label className="date-field">Closed from (UTC)<input aria-label="Actual close from" type="date" value={from} onChange={e => setFrom(e.target.value)}/>
        </label>
        <label className="date-field">Before (UTC, exclusive)<input aria-label="Actual close before" type="date" value={to} onChange={e => setTo(e.target.value)}/>
        </label>
        </div>}<StableAsyncContent loading={loading}>{loading ? <Skeleton /> : error ? <div className="notice error" role="alert">Actual performance unavailable. {error}<button className="button section-gap" onClick={retry}>Retry actual performance</button>
        </div> : data ? <>{data.totals.length ? <div className="realized-identities">{data.totals.map(t => <div className="realized-identity" key={t.moneyUnitKey}>
            <div className="settlement-heading"><span>{unitLabel(t.moneyUnitKey)}</span><span>Completed trades · all amounts in settlement units</span></div>
            <dl className="realized-metrics">
            <div className="realized-primary"><dt>Actual net P&amp;L</dt><dd title={t.netPnl ?? 'Unknown'} className={`data performance-indicator ${moneyTone(t.netPnl)}`}>{formatDecimal(t.netPnl)}</dd><span>{t.knownNetCount} of {t.closedCount} completed results known</span></div>
            <div className="realized-primary"><dt>Mean realized R</dt><dd className={`data performance-indicator ${moneyTone(t.meanRealizedR)}`} title={t.meanRealizedR ?? 'Unknown'}>{formatDecimal(t.meanRealizedR)}</dd><span>{t.knownRCount} completed results with known R</span></div>
            <div><dt>Net win rate</dt><dd className={`data ${winRateTone(t.netWinRate)}`} title={winRateGuidance}>{formatDecimal(t.netWinRate)}{t.netWinRate !== null ? '%' : ''}</dd><span>Known net results only</span></div>
            <div><dt>Coverage</dt><dd className="data">{t.knownNetCount}<small> / {t.closedCount}</small></dd><span>Completed net P&amp;L known</span></div>
            {t.expectancy!==undefined&&<>
            <div><dt>Mean winning net</dt><dd className={moneyTone(t.averageWinningNet??null)}>{formatDecimal(t.averageWinningNet??null)}</dd></div>
            <div><dt>Mean losing net</dt><dd className={moneyTone(t.averageLosingNet??null)}>{formatDecimal(t.averageLosingNet??null)}</dd></div>
            <div><dt>Net expectancy</dt><dd className={moneyTone(t.expectancy??null)}>{formatDecimal(t.expectancy??null)}</dd></div>
            <div><dt>Profit factor</dt><dd className={`data ${t.profitFactor==null?'performance-unknown':compareDecimal(t.profitFactor,'1')>0?'performance-positive':compareDecimal(t.profitFactor,'1')<0?'performance-negative':'performance-neutral'}`} title={t.profitFactorReason??undefined}>{formatDecimal(t.profitFactor??null)}</dd></div>
            <div><dt>Recorded-result drawdown</dt><dd className={moneyTone(t.maxDrawdown??null)}>{formatDecimal(t.maxDrawdown??null)}</dd><span>Known dated closes only</span></div>
            </>}
            </dl>
            {dateFilter&&<RealizedCurve total={t}/>}
            </div>)}</div> : <EmptyState title="Actual performance unavailable" description="Record an actual trade result with a known closing date to calculate completed performance."/>}<div className="coverage-row">
        <div>
        <strong>{data.coverage.eligibleClosed}</strong>
        <span>Eligible completed</span>
        </div>
        <div>
        <strong>{data.coverage.notRecorded}</strong>
        <span>Not recorded</span>
        </div>
        <div>
        <strong>{data.coverage.missingNet}</strong>
        <span>Missing net P&L</span>
        </div>
        <div>
        <strong>{data.coverage.missingRealizedR}</strong>
        <span>Missing realized R</span>
        </div>
        <div>
        <strong>{data.coverage.undatedClosed}</strong>
        <span>Undated closed</span>
        </div>
        </div>
        <details className="section-gap">
        <summary className="muted">Data coverage and limitations</summary>
        <p className="muted section-gap">{data.coverage.totalTrades} logged · {data.coverage.unknownStatus} unknown status · {data.coverage.invalidRecorded} invalid recorded · {data.coverage.missingRisk} missing risk. Counts describe all owned account records; eligible completed totals apply the close-date filter.</p>
        <p className="muted section-gap">{winRateGuidance}</p><p className="muted section-gap">Known zero remains in the denominator; unknown values do not. This is realized trading P&L, not equity or account balance. Amounts from different settlement identities are never combined.</p>{Object.entries(data.missingReasons).map(([reason, count]) => <span className="badge mr-2 mt-2" key={reason}>{reason.toLowerCase().replaceAll('_', ' ')}: {count}</span>)}</details>{data.coverage.partialCount > 0 && <div className="section-gap">
            <h3>Partial positions · current exposure</h3>
            <p className="muted">{data.partialDateBasis}</p>
            <div className="table-scroll section-gap">
            <table className="financial-table">
            <thead>
            <tr>
            <th>Position</th>
            <th>Unit</th>
            <th>Net to date</th>
            <th>R to date</th>
            <th>Remaining quantity</th>
            </tr>
            </thead>
            <tbody>{data.partials.map(p => <tr key={p.tradeId}>
                <td>
                <a href={`/trades/${p.tradeId}/edit`} className="underline">Open position</a>
                </td>
                <td>{unitLabel(p.moneyUnitKey)}</td>
                <td className={moneyTone(p.netPnl)} title={p.netPnl ?? 'Unknown'}>{formatDecimal(p.netPnl)}</td>
                <td className={moneyTone(p.realizedR)}>{formatDecimal(p.realizedR)}</td>
                <td>{formatDecimal(p.remainingQuantity)}</td>
                </tr>)}</tbody>
            </table>
            </div>{data.partialsTruncated && <div className="notice">Partial list truncated at the backend limit. Narrow to one account.</div>}</div>}</> : <EmptyState title="Select a trading account"/>}</StableAsyncContent></Panel>;
}
