// ════════════════════════════════════════════════════════════════
//  MAZE GENERATION
// ════════════════════════════════════════════════════════════════
function rnd(n){return Math.floor(Math.random()*n)}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}

function generateMaze(){
  stopAnim();
  const rows = +document.getElementById('sl-rows').value;
  const cols  = +document.getElementById('sl-cols').value;
  const gen   = document.getElementById('sel-gen').value;

  G.rows=rows; G.cols=cols;
  G.cells = Array.from({length:rows},()=>Array(cols).fill('X'));

  if      (gen==='dfs')    genDFS(rows,cols);
  else if (gen==='prim')   genPrim(rows,cols);
  else if (gen==='kruskal')genKruskal(rows,cols);
  else if (gen==='guaranteed')genGuaranteedPath(rows,cols);
  else { loadCustom(); return; }

  // Place random digit values 1-9 in open cells
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++)
    if(G.cells[r][c]==='0') G.cells[r][c]=String(rnd(9)+1);

  // Place S and G
  const opens = [];
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++)
    if(G.cells[r][c]!=='X') opens.push([r,c]);
  shuffle(opens);
  if(opens.length<2){generateMaze();return;}

  const [sr,sc]=opens[0], [gr,gc]=opens[opens.length-1];
  G.cells[sr][sc]='S'; G.cells[gr][gc]='G';
  startPos=[sr,sc]; goalPos=[gr,gc];

  updateToolbar();
  // Auto-toggle numbers: on for <50 cols, off for >=50
  showNumbers = (G.cols < 50);
  updateNumbersBtn();
  // Centre maze + reset zoom — use actual pane width
  const _CS=baseCS();
  const _pane=mc.parentElement;
  const _pw=_pane&&_pane.clientWidth>0?_pane.clientWidth:document.getElementById('canvas-area').clientWidth-40;
  const _ph=Math.max(200,document.getElementById('canvas-area').clientHeight-40-(compMode?34:0));
  vx=Math.max(0,Math.floor((_pw -G.cols*_CS)/2));
  vy=Math.max(0,Math.floor((_ph -G.rows*_CS)/2));
  vs=1.0; minScale=1.0;
  resetViz();
}

// ── DFS ──────────────────────────────────────────────────────
function genDFS(rows,cols){
  // All walls; carve passages via DFS on a grid where cells are
  // at even indices (2-step movement creates walls between them).
  const visited=Array.from({length:rows},()=>Array(cols).fill(false));
  function carve(r,c){
    visited[r][c]=true;
    G.cells[r][c]='0';
    const dirs=shuffle([[-2,0],[2,0],[0,-2],[0,2]]);
    for(const [dr,dc] of dirs){
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&!visited[nr][nc]){
        G.cells[r+dr/2][c+dc/2]='0';  // carve wall between
        carve(nr,nc);
      }
    }
  }
  const sr=rnd(Math.floor(rows/2))*2, sc=rnd(Math.floor(cols/2))*2;
  carve(sr,sc);
}

// ── Prim ──────────────────────────────────────────────────────
function genPrim(rows,cols){
  const inMaze=Array.from({length:rows},()=>Array(cols).fill(false));
  function neighbors2(r,c){
    return [[-2,0],[2,0],[0,-2],[0,2]].map(([dr,dc])=>[r+dr,c+dc])
      .filter(([nr,nc])=>nr>=0&&nr<rows&&nc>=0&&nc<cols);
  }
  const sr=rnd(Math.floor(rows/2))*2, sc=rnd(Math.floor(cols/2))*2;
  G.cells[sr][sc]='0'; inMaze[sr][sc]=true;
  let frontier=neighbors2(sr,sc).filter(([r,c])=>!inMaze[r][c]);
  frontier.forEach(([r,c])=>G.cells[r][c]='0');
  while(frontier.length){
    const idx=rnd(frontier.length);
    const [r,c]=frontier[idx]; frontier.splice(idx,1);
    if(inMaze[r][c]) continue;
    inMaze[r][c]=true; G.cells[r][c]='0';
    const adjInMaze=neighbors2(r,c).filter(([nr,nc])=>inMaze[nr][nc]);
    if(adjInMaze.length){
      const [pr,pc]=adjInMaze[rnd(adjInMaze.length)];
      G.cells[(r+pr)/2][(c+pc)/2]='0';
    }
    neighbors2(r,c).filter(([nr,nc])=>!inMaze[nr][nc]).forEach(n=>{
      if(!frontier.some(f=>f[0]===n[0]&&f[1]===n[1])){
        frontier.push(n); G.cells[n[0]][n[1]]='0';
      }
    });
  }
}

// ── Kruskal ──────────────────────────────────────────────────
function genKruskal(rows,cols){
  // id each cell; union-find; remove random walls
  const id=(r,c)=>r*cols+c;
  const parent=Array.from({length:rows*cols},(_,i)=>i);
  function find(x){return parent[x]===x?x:parent[x]=find(parent[x])}
  function union(a,b){parent[find(a)]=find(b)}
  // open all odd cells
  for(let r=0;r<rows;r+=2) for(let c=0;c<cols;c+=2) G.cells[r][c]='0';
  // collect all walls between cell pairs
  const walls=[];
  for(let r=0;r<rows;r+=2) for(let c=0;c<cols;c+=2){
    if(r+2<rows) walls.push([r,c,r+2,c,r+1,c]);
    if(c+2<cols) walls.push([r,c,r,c+2,r,c+1]);
  }
  shuffle(walls);
  for(const [r1,c1,r2,c2,wr,wc] of walls){
    if(find(id(r1,c1))!==find(id(r2,c2))){
      union(id(r1,c1),id(r2,c2));
      G.cells[wr][wc]='0';
    }
  }
}

function loadCustom(){
  const txt=document.getElementById('txt-custom').value.trim();
  if(!txt) return;
  stopAnim();
  const lines=txt.split('\n').map(l=>l.trim()).filter(l=>l);
  G.rows=lines.length; G.cols=lines[0].length;
  G.cells=lines.map(l=>l.split(''));
  startPos=null; goalPos=null;
  for(let r=0;r<G.rows;r++) for(let c=0;c<G.cols;c++){
    if(G.cells[r][c]==='S') startPos=[r,c];
    if(G.cells[r][c]==='G') goalPos=[r,c];
  }
  updateToolbar();
  vx=0; vy=0; vs=1.0; minScale=1.0;
  resetViz();
}
document.getElementById('sel-gen').addEventListener('change',function(){
  document.getElementById('txt-custom').style.display=
    this.value==='custom'?'block':'none';
});

// ── Guaranteed Path (random walk biased toward goal) ──────────
function genGuaranteedPath(rows,cols){
  // Random open cells + some walls
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++)
    G.cells[r][c]=Math.random()<0.25?'X':String(rnd(9)+1);
  // Carve guaranteed walkable path from (0,0) to (rows-1,cols-1)
  let cr=0,cc=0;
  while(cr!==rows-1||cc!==cols-1){
    if(G.cells[cr][cc]==='X') G.cells[cr][cc]=String(rnd(9)+1);
    const moves=[];
    if(cr<rows-1) for(let i=0;i<4;i++) moves.push([1,0]);
    if(cc<cols-1) for(let i=0;i<4;i++) moves.push([0,1]);
    if(cr>0)      moves.push([-1,0]);
    if(cc>0)      moves.push([0,-1]);
    const [dr,dc]=moves[rnd(moves.length)];
    cr=Math.min(rows-1,Math.max(0,cr+dr));
    cc=Math.min(cols-1,Math.max(0,cc+dc));
  }
  if(G.cells[cr][cc]==='X') G.cells[cr][cc]=String(rnd(9)+1);
}
