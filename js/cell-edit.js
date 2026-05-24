// CELL EDITING — left-click/drag toggles walls; right-drag pans
mc.addEventListener('mousedown', e=>{
  if(e.button===0){ isDragging=true; handleCellClick(e); }
  else if(e.button===2){ isPanning=true; panX0=e.clientX; panY0=e.clientY; vx0=vx; vy0=vy; }
});
mc.addEventListener('mousemove', e=>{
  if(isDragging) handleCellClick(e,true);
  if(isPanning){ vx=vx0+(e.clientX-panX0); vy=vy0+(e.clientY-panY0); draw(lastOvViz); }
});
mc.addEventListener('mouseup', e=>{
  if(e.button===0){ isDragging=false; paintMode=null; }
  if(e.button===2){ isPanning=false; }
});
mc.addEventListener('contextmenu', e=>e.preventDefault());
mc.addEventListener('wheel', e=>{
  e.preventDefault();
  const factor=e.deltaY<0?1.15:1/1.15;
  const newVS=Math.max(minScale, Math.min(15, vs*factor));
  if(newVS===vs) return;
  const rect=mc.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  // zoom towards cursor position
  vx=mx-(mx-vx)*(newVS/vs);
  vy=my-(my-vy)*(newVS/vs);
  vs=newVS;
  draw(lastOvViz);
},{passive:false});

function handleCellClick(e, isDrag=false){
  if(!G.rows) return;
  const rect=mc.getBoundingClientRect();
  const CS=baseCS();
  // Convert screen coords → world coords (pan/zoom aware)
  const wx=(e.clientX-rect.left-vx)/vs;
  const wy=(e.clientY-rect.top-vy)/vs;
  const c=Math.floor(wx/CS);
  const r=Math.floor(wy/CS);
  if(r<0||r>=G.rows||c<0||c>=G.cols) return;

  const ch=G.cells[r][c];
  if(!isDrag){
    // determine paint mode on first click
    if(ch==='X') paintMode='open';
    else if(ch==='S'||ch==='G') return;  // don't overwrite S/G
    else paintMode='wall';
  }
  if(paintMode===null) return;
  if(ch==='S'||ch==='G') return;
  if(paintMode==='wall')  G.cells[r][c]='X';
  else                    G.cells[r][c]=String(rnd(9)+1);
  stopAnim();
  draw(null);
}
