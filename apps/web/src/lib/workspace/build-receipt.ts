import {uuid} from './contracts.ts';
export const templates=['orders'] as const;
export type TemplateId=typeof templates[number];
export type StartBody={proposal_id:string;template?:TemplateId};
export type BuildReceipt={key:string;path:string;body:StartBody|Record<string,never>};
/** Exact start-build body: a proposal and, optionally, one known template. */
export function startBody(value:unknown):StartBody|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>,keys=Object.keys(v);
 if(typeof v.proposal_id!=='string'||!uuid.test(v.proposal_id)||!keys.every(k=>k==='proposal_id'||k==='template'))return null;
 if('template' in v&&!templates.includes(v.template as TemplateId))return null;
 return 'template' in v?{proposal_id:v.proposal_id,template:v.template as TemplateId}:{proposal_id:v.proposal_id};
}
export function buildReceipt(value:unknown,project:string):BuildReceipt|null{
 if(!value||typeof value!=='object'||!uuid.test(project))return null;
 const v=value as BuildReceipt;if(typeof v.key!=='string'||!uuid.test(v.key)||typeof v.path!=='string'||!v.body||typeof v.body!=='object'||Array.isArray(v.body))return null;
 const base=`/projects/${project}/builds`;
 if(v.path===base)return startBody(v.body)?v:null;
 const suffix=v.path.slice(base.length);return v.path.startsWith(base)&&/^\/[a-f0-9-]{36}\/(cancel|retry)$/.test(suffix)&&Object.keys(v.body).length===0?v:null;
}
