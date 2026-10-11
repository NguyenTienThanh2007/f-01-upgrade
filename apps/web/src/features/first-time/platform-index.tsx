import Link from 'next/link';
import { vi } from '@/lib/copy/vi';
import { templateCatalog } from '@/lib/workspace/template-catalog';

const symbols: Record<string, string> = { orders: '▥', inventory: '▤', ledger: '⌘' };

export function PlatformIndex() {
  const [how1, how2] = vi.home.howTitle.split('\n'), [tpl1, tpl2] = vi.home.templatesTitle.split('\n');
  return <div className="platform-index">
    <section id="how" className="platform-register" aria-labelledby="platform-title"><div className="register-heading"><span className="meta">{vi.home.howEyebrow}</span><h2 id="platform-title">{how1}<br />{how2}</h2><p>{vi.home.howLede}</p><Link href="/projects" className="register-workspace-link">{vi.home.howLink} <span aria-hidden="true">↗</span></Link></div><div className="capability-ledger">{vi.home.how.map(item => <div key={item.id}><span className="meta">{item.id}</span><div><h3>{item.name}</h3><p>{item.purpose}</p></div><span className="planned-label">{item.status}</span></div>)}</div></section>
    <section id="templates" className="template-register" aria-labelledby="template-title"><div className="index-section-heading"><span className="meta">{vi.home.templatesEyebrow}</span><h2 id="template-title">{tpl1}<br />{tpl2}</h2><p>{vi.home.templatesLede}</p></div><div className="template-list">{templateCatalog.map((item, index) => item.available
      ? <Link href={`/projects/new?template=${item.id}`} key={item.id}><span className="template-symbol" aria-hidden="true">{symbols[item.id] ?? '▥'}</span><span><small>{String(index + 1).padStart(2, '0')}</small><strong>{item.name}</strong><span className="template-summary">{item.summary}</span></span><span className="template-action">{vi.home.useTemplate}</span></Link>
      : <div className="template-unavailable" key={item.id}><span className="template-symbol" aria-hidden="true">{symbols[item.id] ?? '▥'}</span><span><small>{String(index + 1).padStart(2, '0')}</small><strong>{item.name}</strong><span className="template-summary">{item.summary}</span></span><span className="template-action">{vi.templates.soon}</span></div>)}</div></section>
    <section id="faq" className="docs-register" aria-labelledby="docs-title"><div className="index-section-heading"><span className="meta">{vi.home.faqEyebrow}</span><h2 id="docs-title">{vi.home.faqTitle}</h2><p>{vi.home.faqLede}</p></div><div className="planning-docs">{vi.home.faq.map((item, index) => <details key={item.q} open={index === 0}><summary>{item.q}</summary><p>{item.a}</p>{index === vi.home.faq.length - 1 && <Link className="text-action" href="/projects">{vi.home.faqLink}</Link>}</details>)}</div></section>
  </div>;
}
