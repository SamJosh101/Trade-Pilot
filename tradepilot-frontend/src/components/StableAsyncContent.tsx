import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Keep the previous result's footprint while a new scope loads, without showing
// stale financial values under the newly selected account or date filter.
export default function StableAsyncContent({ loading, children }: { loading: boolean; children: ReactNode }) {
    const content = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(160);
    useLayoutEffect(() => {
        if (loading || !content.current) return;
        const node = content.current;
        const measure = () => setHeight(node.getBoundingClientRect().height);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [loading]);
    return <div className="stable-async-content" aria-busy={loading} style={loading ? { minHeight: height } : undefined}><div ref={content}>{children}</div></div>;
}
