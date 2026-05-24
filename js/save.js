// SAVE RESULTS — runs algorithms synchronously & downloads output.txt
function bfsDirect(){
  if(!startPos||!goalPos) return null;
  const [sr,sc]=startPos,[gr,gc]=goalPos;
  const rows=G.rows,cols=G.cols;
  const visited=Array.from({length:rows},()=>Array(cols).fill(false));
  const prev=Array.from({length:rows},()=>Array(cols).fill(null));
  const queue=[[sr,sc]]; visited[sr][sc]=true;
  const DIRS=[[-1,0],[1,0],[0,-1],[0,1]];
  while(queue.length){
    const [r,c]=queue.shift();
    if(r===gr&&c===gc){
      const path=[];let cur=[r,c];
      while(cur){path.unshift(cur);cur=prev[cur[0]][cur[1]];}
      return path;
    }
    for(const[dr,dc] of DIRS){
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&!visited[nr][nc]&&G.cells[nr][nc]!=='X'){
        visited[nr][nc]=true; prev[nr][nc]=[r,c]; queue.push([nr,nc]);
      }
    }
  }
  return null;
}

function dijkstraDirect(costFn){
  if(!startPos||!goalPos) return null;
  const [sr,sc]=startPos,[gr,gc]=goalPos;
  const rows=G.rows,cols=G.cols;
  const dist=Array.from({length:rows},()=>Array(cols).fill(Infinity));
  const prev=Array.from({length:rows},()=>Array(cols).fill(null));
  dist[sr][sc]=0;
  const pq=[[0,sr,sc]];
  const DIRS=[[-1,0],[1,0],[0,-1],[0,1]];
  while(pq.length){
    pq.sort((a,b)=>a[0]-b[0]);
    const [d,r,c]=pq.shift();
    if(r===gr&&c===gc){
      const path=[];let cur=[r,c];
      while(cur){path.unshift(cur);cur=prev[cur[0]][cur[1]];}
      return {path,cost:d};
    }
    if(d>dist[r][c]) continue;
    for(const[dr,dc] of DIRS){
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&G.cells[nr][nc]!=='X'){
        const w=costFn(nr,nc,r,c,dr,dc);
        if(dist[r][c]+w<dist[nr][nc]){
          dist[nr][nc]=dist[r][c]+w; prev[nr][nc]=[r,c];
          pq.push([dist[nr][nc],nr,nc]);
        }
      }
    }
  }
  return null;
}

function saveTxt(){
  if(!G.rows){ alert('Generate or load a maze first.'); return; }
  const rows=G.rows,cols=G.cols;
  let out='';

  // Maze grid
  out+='=== MAZE ===\n';
  for(let r=0;r<rows;r++) out+=G.cells[r].join('')+'\n';
  out+='\n';

  // Subtask A – BFS shortest path
  out+='=== SUBTASK A: BFS Shortest Path ===\n';
  const pathA=bfsDirect();
  if(pathA){ out+='Path: '+pathA.map(p=>p.join(',')).join(' -> ')+'\n';
    out+='Length: '+pathA.length+'\n'; }
  else out+='No path found\n';
  out+='\n';

  // Subtask B – Dijkstra (3 cost models)
  const costModels=[
    ['Model 1: destination cell value', (nr,nc)=>{ const v=G.cells[nr][nc]; return v==='S'||v==='G'?0:parseInt(v)||1; }],
    ['Model 2: average of src+dst', (nr,nc,r,c)=>{
      const vs=G.cells[r][c],vd=G.cells[nr][nc];
      const ns=vs==='S'||vs==='G'?0:parseInt(vs)||1;
      const nd=vd==='S'||vd==='G'?0:parseInt(vd)||1;
      return (ns+nd)/2; }],
    ['Model 3: horizontal=1, vertical=cell value', (nr,nc,r,c,dr)=>{
      const v=G.cells[nr][nc];
      const nv=v==='S'||v==='G'?0:parseInt(v)||1;
      return dr===0?1:nv; }]
  ];
  out+='=== SUBTASK B: Dijkstra ===\n';
  for(const[label,fn] of costModels){
    out+=label+'\n';
    const res=dijkstraDirect(fn);
    if(res){ out+='  Path: '+res.path.map(p=>p.join(',')).join(' -> ')+'\n';
      out+='  Cost: '+res.cost.toFixed(2)+'\n'; }
    else out+='  No path found\n';
  }
  out+='\n';

  // Subtask C/D/E – note
  out+='=== SUBTASK D: Max Flow ===\n';
  out+='Run algorithm from the control panel to see results.\n\n';
  out+='=== SUBTASK E: Minimum Spanning Tree ===\n';
  out+='Run algorithm from the control panel to see results.\n\n';

  // Download
  const blob=new Blob([out],{type:'text/plain'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='output.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}
