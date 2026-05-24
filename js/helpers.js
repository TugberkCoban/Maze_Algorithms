// HELPERS — utility functions used across modules
function cellVal(r,c){
  const ch=G.cells[r][c];
  return (ch==='S'||ch==='G')?0:parseInt(ch);
}
function isPassable(r,c){
  return r>=0&&r<G.rows&&c>=0&&c<G.cols&&G.cells[r][c]!=='X';
}
const DIR4=[[-1,0],[1,0],[0,-1],[0,1]];
const DIR8=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
function neighbors(r,c,mode){
  return (mode===8?DIR8:DIR4)
    .map(([dr,dc])=>[r+dr,c+dc])
    .filter(([nr,nc])=>isPassable(nr,nc));
}

function k(r,c){return r+','+c}
function fromK(s){return s.split(',').map(Number)}

// speed → ms per step
const SPEEDS=[0,500,150,50,15,4];
let animDelay=SPEEDS[3];
function updateSpeed(){
  const v=+document.getElementById('sl-speed').value;
  animDelay=SPEEDS[v];
  document.getElementById('lbl-speed').textContent='×'+v;
}
updateSpeed();

function setTbState(s,clr='var(--gold)'){
  const el=document.getElementById('tb-state');
  el.textContent=s; el.style.color=clr;
}
function updateToolbar(){
  document.getElementById('tb-size').textContent=
    G.rows?`${G.rows}×${G.cols}`:'—';
}
function setStats(visited,pathLen,cost,ms,path){
  document.getElementById('sv-visited').textContent=visited??'—';
  document.getElementById('sv-pathl').textContent=pathLen??'—';
  document.getElementById('sv-cost').textContent=cost??'—';
  document.getElementById('sv-time').textContent=ms!=null?ms+'ms':'—';
  const pstr=path?path.map(([r,c])=>`(${r},${c})`).join('→'):'—';
  document.getElementById('sv-path').textContent=pstr;
}
function updateOverlay(visited,queue,cost){
  const ov=document.getElementById('overlay-stats');
  ov.style.display='block';
  document.getElementById('ov-visited').textContent=visited;
  document.getElementById('ov-queue').textContent=queue;
  document.getElementById('ov-cost').textContent=cost;
}
function setProgress(pct){
  document.getElementById('progress-fill').style.width=pct+'%';
}
