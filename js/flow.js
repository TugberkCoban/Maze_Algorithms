// ════════════════════════════════════════════════════════════════
//  MAX FLOW — Edmonds-Karp (BFS-based); runs immediately, no animation
// ════════════════════════════════════════════════════════════════
function runFlowImmediate(){
  if(!startPos||!goalPos){alert('Need S and G');return;}
  setTbState('Computing…','var(--accent)');
  const mode=getMode('flow');
  const t0=performance.now();

  // Build capacity map  key="r1,c1->r2,c2"
  const cap={};
  const adj={};
  const addEdge=(u,v,c)=>{
    const fk=k(...u)+'->'+k(...v), rk=k(...v)+'->'+k(...u);
    cap[fk]=(cap[fk]||0)+c;
    cap[rk]=cap[rk]||0;
    adj[k(...u)]=adj[k(...u)]||new Set(); adj[k(...u)].add(k(...v));
    adj[k(...v)]=adj[k(...v)]||new Set(); adj[k(...v)].add(k(...u));
  };
  for(let r=0;r<G.rows;r++) for(let c=0;c<G.cols;c++){
    if(!isPassable(r,c)) continue;
    for(const [nr,nc] of neighbors(r,c,mode)){
      const isS=(G.cells[nr][nc]==='S'), isG=(G.cells[nr][nc]==='G');
      const c2=isS||isG?100:cellVal(nr,nc);
      if(c2>0) addEdge([r,c],[nr,nc],c2);
    }
  }
  const flow={};
  const source=k(...goalPos), sink=k(...startPos);

  function bfsPath(){
    const par={[source]:null};
    const q=[source];
    while(q.length){
      const u=q.shift();
      if(u===sink){
        const path=[]; let n=sink;
        while(n!==source){
          const p=par[n]; path.push([p,n]); n=p;
        }
        return path.reverse();
      }
      for(const v of (adj[u]||[])){
        const fk=u+'->'+v;
        if(!(v in par)&&(cap[fk]||0)-(flow[fk]||0)>0){
          par[v]=u; q.push(v);
        }
      }
    }
    return null;
  }

  let maxFlow=0;
  for(let iter=0;iter<10000;iter++){
    const path=bfsPath(); if(!path) break;
    let bn=Infinity;
    for(const [u,v] of path) bn=Math.min(bn,(cap[u+'->'+v]||0)-(flow[u+'->'+v]||0));
    for(const [u,v] of path){
      flow[u+'->'+v]=(flow[u+'->'+v]||0)+bn;
      flow[v+'->'+u]=(flow[v+'->'+u]||0)-bn;
    }
    maxFlow+=bn;
  }

  // collect positive flow edges
  const posEdges=[];
  for(const fk of Object.keys(flow)){
    if(flow[fk]>0){
      const [a,b]=fk.split('->');
      const [r1,c1]=fromK(a),[r2,c2]=fromK(b);
      posEdges.push([[r1,c1],[r2,c2],flow[fk],cap[fk]||0]);
    }
  }
  const ms=Math.round(performance.now()-t0);
  setTbState('Done','var(--green)');
  setProgress(100);
  setStats(Object.keys(flow).length/2, posEdges.length, maxFlow, ms, null);
  document.getElementById('sv-pathl').textContent='—';
  document.getElementById('sv-cost').textContent='max_flow='+maxFlow;
  draw({flowEdges:posEdges, visitedSet:new Set(), frontierSet:new Set()});
  showPanelStats('a',[['Edges',posEdges.length],['Max Flow',maxFlow],['Time',ms+'ms']]);
}

// Flow for panel B (synchronous, no sidebar stats)
function runFlowImmediate2(mode){
  const t0=performance.now();
  const cap={},adj={};
  const addEdge=(u,v,c)=>{
    const fk=k(...u)+'->'+k(...v),rk=k(...v)+'->'+k(...u);
    cap[fk]=(cap[fk]||0)+c; cap[rk]=cap[rk]||0;
    adj[k(...u)]=adj[k(...u)]||new Set(); adj[k(...u)].add(k(...v));
    adj[k(...v)]=adj[k(...v)]||new Set(); adj[k(...v)].add(k(...u));
  };
  for(let r=0;r<G.rows;r++) for(let c=0;c<G.cols;c++){
    if(!isPassable(r,c)) continue;
    for(const [nr,nc] of neighbors(r,c,mode)){
      const c2=G.cells[nr][nc]==='S'||G.cells[nr][nc]==='G'?100:cellVal(nr,nc);
      if(c2>0) addEdge([r,c],[nr,nc],c2);
    }
  }
  const flow={};
  const source=k(...goalPos),sink=k(...startPos);
  function bfsP(){
    const par={[source]:null};const q=[source];
    while(q.length){
      const u=q.shift(); if(u===sink){
        const path=[];let n=sink;
        while(n!==source){const p=par[n];path.push([p,n]);n=p;}
        return path.reverse();
      }
      for(const v of (adj[u]||[])){
        const fk=u+'->'+v;
        if(!(v in par)&&(cap[fk]||0)-(flow[fk]||0)>0){par[v]=u;q.push(v);}
      }
    }return null;
  }
  for(let i=0;i<10000;i++){
    const path=bfsP();if(!path)break;
    let bn=Infinity;
    for(const[u,v]of path)bn=Math.min(bn,(cap[u+'->'+v]||0)-(flow[u+'->'+v]||0));
    for(const[u,v]of path){flow[u+'->'+v]=(flow[u+'->'+v]||0)+bn;flow[v+'->'+u]=(flow[v+'->'+u]||0)-bn;}
  }
  const posEdges=[];
  for(const fk of Object.keys(flow)){
    if(flow[fk]>0){const[a,b]=fk.split('->');const[r1,c1]=fromK(a),[r2,c2]=fromK(b);posEdges.push([[r1,c1],[r2,c2],flow[fk],cap[fk]||0]);}
  }
  lastOvViz2={flowEdges:posEdges,visitedSet:new Set(),frontierSet:new Set()};
  drawOn(mc2,ctx2,lastOvViz2);
  const _ms2f=Math.round(performance.now()-t0);
  const _srcK=k(...goalPos);
  const _mxF2=posEdges.filter(e=>k(...e[0])===_srcK).reduce((s,e)=>s+e[2],0);
  showPanelStats('b',[['Edges',posEdges.length],['Max Flow',_mxF2],['Time',_ms2f+'ms']]);
}
