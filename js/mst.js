// MST — Minimum Spanning Tree (Kruskal + Union-Find); runs immediately
function runMSTImmediate(){
  if(!startPos){alert('Need S');return;}
  setTbState('Computing…','var(--accent)');
  const mode=getMode('mst');
  const t0=performance.now();

  // BFS to find connected component from S
  const comp=new Set([k(...startPos)]);
  const q=[startPos.slice()];
  while(q.length){
    const [r,c]=q.shift();
    for(const [nr,nc] of neighbors(r,c,mode)){
      const nk=k(nr,nc);
      if(!comp.has(nk)){comp.add(nk);q.push([nr,nc]);}
    }
  }

  // Collect undirected edges within component
  const seenEdges=new Set();
  const edges=[];
  comp.forEach(ck=>{
    const [r,c]=fromK(ck);
    for(const [nr,nc] of neighbors(r,c,mode)){
      const nk=k(nr,nc);
      if(!comp.has(nk)) continue;
      const ek=[ck,nk].sort().join('|');
      if(seenEdges.has(ek)) continue;
      seenEdges.add(ek);
      const w=cellVal(r,c)+cellVal(nr,nc);
      edges.push([w,[r,c],[nr,nc]]);
    }
  });
  edges.sort((a,b)=>a[0]-b[0]);

  // Union-Find
  const parent={};
  comp.forEach(ck=>parent[ck]=ck);
  function find(x){return parent[x]===x?x:parent[x]=find(parent[x])}
  function union(a,b){parent[find(a)]=find(b)}

  const treeEdges=[]; let totalW=0;
  for(const [w,u,v] of edges){
    const uk=k(...u),vk=k(...v);
    if(find(uk)!==find(vk)){
      union(uk,vk); treeEdges.push([u,v,w]); totalW+=w;
    }
  }
  const ms=Math.round(performance.now()-t0);
  const reach=comp.has(k(...goalPos));
  setTbState('Done','var(--green)');
  setProgress(100);
  document.getElementById('sv-visited').textContent=comp.size;
  document.getElementById('sv-pathl').textContent=treeEdges.length+' edges';
  document.getElementById('sv-cost').textContent='weight='+totalW;
  document.getElementById('sv-time').textContent=ms+'ms';
  document.getElementById('sv-path').textContent=
    `Component: ${comp.size} cells | G reachable: ${reach}`;
  draw({mstEdges:treeEdges, visitedSet:comp, frontierSet:new Set()});
  showPanelStats('a',[['Nodes',comp.size],['Edges',treeEdges.length],['Weight',totalW],['Time',ms+'ms']]);
}

// MST for panel B (synchronous, no sidebar stats)
function runMSTImmediate2(mode){
  const t0=performance.now();
  const comp=new Set([k(...startPos)]);const q=[startPos.slice()];
  while(q.length){const[r,c]=q.shift();for(const[nr,nc]of neighbors(r,c,mode)){const nk=k(nr,nc);if(!comp.has(nk)){comp.add(nk);q.push([nr,nc]);}}}
  const seenEdges=new Set(),edges=[];
  comp.forEach(ck=>{const[r,c]=fromK(ck);for(const[nr,nc]of neighbors(r,c,mode)){const nk=k(nr,nc);if(!comp.has(nk))return;const ek=[ck,nk].sort().join('|');if(seenEdges.has(ek))return;seenEdges.add(ek);edges.push([cellVal(r,c)+cellVal(nr,nc),[r,c],[nr,nc]]);}});
  edges.sort((a,b)=>a[0]-b[0]);
  const parent={};comp.forEach(ck=>parent[ck]=ck);
  function find(x){return parent[x]===x?x:parent[x]=find(parent[x])}
  const treeEdges=[];
  for(const[w,u,v]of edges){const uk=k(...u),vk=k(...v);if(find(uk)!==find(vk)){parent[find(uk)]=find(vk);treeEdges.push([u,v,w]);}}
  lastOvViz2={mstEdges:treeEdges,visitedSet:comp,frontierSet:new Set()};
  drawOn(mc2,ctx2,lastOvViz2);
  const _ms2m=Math.round(performance.now()-t0);
  const _totalW2=treeEdges.reduce((s,e)=>s+e[2],0);
  showPanelStats('b',[['Nodes',comp.size],['Edges',treeEdges.length],['Weight',_totalW2],['Time',_ms2m+'ms']]);
}
