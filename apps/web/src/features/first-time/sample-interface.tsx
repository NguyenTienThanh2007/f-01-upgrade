import type { StarterId } from '@/features/project-planning/project-starters';
import { vi } from '@/lib/copy/vi';

// Illustrations only: fixed sample shops with prices in VND.
export function SampleInterface({ starter }: { starter: StarterId }) {
  const sample = vi.samples[starter];
  const heading = <><div className="sample-heading"><span className="sample-brand">{sample.brand}</span><span className="meta">{sample.meta}</span></div>
    <div className="sample-title"><h3>{sample.title.map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h3><p>{sample.lede}</p></div></>;
  if (starter === 'grocery') return <div className="sample-booking sample-grocery">{heading}
    <div className="booking-schedule">{sample.rows.map(([qty, item, price]) => <div key={item}><span className="meta">{qty}</span><div><strong>{item}</strong><small>{price}</small></div><span className="booking-line" /></div>)}</div>
  </div>;
  return <div className={`sample-crm sample-${starter}`}>{heading}
    <div className="sample-metrics">{sample.metrics.map(([label, value]) => <div key={label}><span className="meta">{label}</span><strong>{value}</strong></div>)}</div>
    <div className="sample-pipeline">{sample.rows.map(([stage, item, note]) => <div key={item}><span className="meta">{stage}</span><div><strong>{item}</strong><small>{note}</small><span className="sample-card-rule" /></div></div>)}</div>
  </div>;
}
