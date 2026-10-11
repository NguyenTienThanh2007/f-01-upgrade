'use client';
import type {components} from '@f01/api-client/schema';
import {vi} from '@/lib/copy/vi';
import {useResource,useWorkspace,ResourceState} from './workspace';
type Builds=components['schemas']['BuildList'];
/** Mã nguồn panel: verified source of the current version plus the latest build evidence. */
export function SourceInspector(){
 const {id,snapshot}=useWorkspace();const version=snapshot.current_version;
 const source=useResource<components['schemas']['SourceArtifact']>(version?.mode==='real'?`/projects/${id}/versions/${version.id}/source`:null);
 const builds=useResource<Builds>(`/projects/${id}/builds`),latest=builds.data?.items[0];
 return <section><span className="meta">{vi.source.eyebrow}</span><h2>{vi.source.title}</h2><ResourceState {...source}/>{!source.data&&<p>{vi.source.none}</p>}{source.data&&<><p>{vi.source.digest}: {source.data.digest}</p>{source.data.files.map(file=><details key={file.path}><summary>{file.path}</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{file.content}</pre></details>)}</>}
  <ResourceState {...builds}/>
  {latest&&<details><summary>{vi.source.evidence}</summary><p>{vi.source.repairs(latest.repair_attempts,latest.run.id)}</p>{latest.candidates.map(c=><article key={c.id}><p>{vi.source.candidate(c.attempt,c.digest)}</p><ul>{c.files.map((f,n)=><li key={n}>{vi.source.bytes(String(f.path),String(f.bytes))}</li>)}</ul></article>)}<ul>{latest.evidence.map((e,n)=><li key={n}>{vi.source.evidenceRow(e.phase,e.exit_code,e.duration_ms)}{e.diagnostics.map(d=>` · ${d.code}${d.path?` (${d.path}:${d.line??''})`:''}`).join('')}</li>)}</ul></details>}
 </section>;
}
