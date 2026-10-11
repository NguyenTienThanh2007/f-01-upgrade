'use client';
import {useState} from 'react';
import Link from 'next/link';
import type {components} from '@f01/api-client/schema';
import {vi} from '@/lib/copy/vi';
import type {Proposal} from './flow';
import {useWorkspace,useResource,ResourceState,time} from './workspace';
function ProposalView({record,onReview,busy}:{record:Proposal;onReview:()=>void;busy:boolean}){
 const content=record.content;
 return <article className="workspace-record planning-proposal"><span className="meta">{vi.planning.proposalMeta(record.kind,record.current_context)}</span><h2>{content.plan.project_title}</h2><p>{content.plan.product_summary}</p><p className="muted">{vi.planning.proposalBy(record.provider,record.model,time(record.created_at))}</p>
 <dl className="context-references"><div><dt>{vi.planning.brainRevision}</dt><dd><Link href={`./brain?revision=${String(record.context.brain_revision)}`}>{String(record.context.brain_revision)}</Link></dd></div><div><dt>{vi.planning.request}</dt><dd>{record.request_id}</dd></div><div><dt>{vi.planning.versionBase}</dt><dd>{record.version_id??vi.planning.noBase}</dd></div></dl>
 <details><summary>{vi.planning.contextProvenance}</summary><pre className="preserved-text">{JSON.stringify(record.context,null,2)}</pre></details>
 {(['scope','assumptions','acceptance_criteria','out_of_scope'] as const).map(key=><section key={key}><h3>{vi.planning.sections[key]}</h3>{content[key].length?<ul>{content[key].map((value,index)=><li key={index}>{value}</li>)}</ul>:<p>{vi.planning.noneRecorded}</p>}</section>)}
 <section><h3>{vi.planning.users}</h3><ul>{content.plan.target_users.map((value,i)=><li key={i}>{value}</li>)}</ul></section><section><h3>{vi.planning.features}</h3>{content.plan.core_features.map((feature,i)=><div key={i}><h4>{feature.name}</h4><p>{feature.description}</p></div>)}</section>
 <section><h3>{vi.planning.stack}</h3><dl>{Object.entries(content.plan.recommended_stack).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section><section><h3>{vi.planning.milestones}</h3><ol>{content.plan.implementation_milestones.map((item,i)=><li key={i}><strong>{item.title}</strong><ul>{item.deliverables.map((value,j)=><li key={j}>{value}</li>)}</ul></li>)}</ol></section>
 {record.reviewed?<p role="status">{vi.planning.reviewed}</p>:<button className="button button-secondary" disabled={busy||!record.current_context} onClick={onReview}>{vi.planning.reviewAction}</button>}{!record.current_context&&<p>{vi.planning.historical}</p>}</article>;
}
export function PlanningView(){
 const {snapshot,flow,generation}=useWorkspace(),{planning}=flow;
 const usage=useResource<components['schemas']['UsageView']>('/planning/usage');
 const [intent,setIntent]=useState('');
 const [bases,setBases]=useState({brain:snapshot.project.current_brain_revision_id,version:snapshot.project.current_version_id});
 const stale=bases.brain!==snapshot.project.current_brain_revision_id||bases.version!==snapshot.project.current_version_id;
 const busy=planning.busy,receipt=planning.receipt,records=flow.proposals??[];
 return <div className="workspace-document"><span className="meta">{vi.planning.eyebrow}</span><h2>{vi.planning.title}</h2><p>{vi.planning.lede}</p>
 {usage.data&&<p className="workspace-notice">{vi.planning.usage(usage.data.requests_used,usage.data.requests_per_day,usage.data.tokens_reserved.toLocaleString('vi-VN'),usage.data.daily_token_budget.toLocaleString('vi-VN'),time(usage.data.resets_at),usage.data.requests_per_minute)}</p>}
 <p>{vi.planning.context(snapshot.current_brain.revision,snapshot.current_version?vi.planning.demoVersion(snapshot.current_version.number):vi.planning.noVersion)}</p>
 {planning.error&&<p role="alert" className="workspace-notice">{planning.error}</p>}{stale&&<div className="workspace-notice"><p>{vi.planning.stale}</p><button className="button button-secondary" disabled={busy||!!receipt} onClick={()=>setBases({brain:snapshot.project.current_brain_revision_id,version:snapshot.project.current_version_id})}>{vi.planning.useCurrent}</button></div>}
 {receipt&&!busy&&<div className="workspace-notice"><p>{vi.planning.frozen}</p><button className="button button-secondary" onClick={()=>void planning.resume()}>{vi.planning.resolve}</button></div>}
 <button className="button button-primary" disabled={!planning.ready||busy||stale||!!receipt||!!snapshot.project.archived_at} onClick={()=>void planning.initial()}>{vi.planning.initial}</button>
 <div className="form-field"><label htmlFor="planning-intent">{vi.planning.changeLabel}</label><textarea id="planning-intent" rows={5} maxLength={10000} value={intent} disabled={busy||!!receipt} onChange={e=>setIntent(e.target.value)}/><p className="field-hint">{vi.planning.changeHint}</p></div>
 <button className="button button-secondary" disabled={!planning.ready||busy||stale||!!receipt||intent.trim().length<20||!!snapshot.active_run||!!snapshot.project.archived_at} onClick={()=>void planning.recordAndPlan(intent,bases)}>{vi.planning.change}</button>
 {snapshot.active_run&&<p>{vi.planning.waitRun}</p>}{busy&&<p role="status">{planning.attempt?.status==='pending'?vi.planning.pending:vi.planning.recording}</p>}{planning.attempt?.status==='pending'&&<button className="button button-secondary" onClick={()=>void planning.cancel()}>{vi.planning.cancel}</button>}
 {planning.attempt&&<p className="meta">{vi.planning.attempt(planning.attempt.status,planning.attempt.reserved_tokens,planning.attempt.input_tokens,planning.attempt.output_tokens)}</p>}
 {flow.listError&&<p role="alert">{flow.listError}</p>}{flow.proposals&&!records.length&&<p>{vi.planning.none}</p>}{records.map(record=><ProposalView key={`${record.id}-${generation}`} record={record} busy={busy} onReview={()=>void planning.review(record.id)}/>)}
 </div>;
}
