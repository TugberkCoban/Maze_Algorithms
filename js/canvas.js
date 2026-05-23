// ════════════════════════════════════════════════════════════════
//  CANVAS — drawing functions
// ════════════════════════════════════════════════════════════════
const mc  = document.getElementById('mc');
const ctx = mc.getContext('2d');

const CLR = {
  wall:'#10101e', open:'#1e2050', start:'#00b894', goal:'#e17055',
  frontier:'#74b9ff', visited:'#2c2c55', path_bfs:'#fdcb6e',
  path_dij:'#a29bfe', flow:'#ff7675', mst:'#00cec9', text:'#ffffff',
  border:'#080818', highlight:'#fd79a8',
};

// World-space cell size at zoom=1 (always fits maze in viewport)
function baseCS(){
  const paneW = (mc.parentElement && mc.parentElement.clientWidth > 0)
    ? mc.parentElement.clientWidth
    : document.getElementById('canvas-area').clientWidth - 40;
  const areaH = document.getElementById('canvas-area').clientHeight;
  const maxH  = Math.max(100, areaH - 40 - (compMode ? 34 : 0));
  if (!G.rows) return 40;
  return Math.min(60, Math.max(4,
    Math.min(Math.floor(paneW/G.cols), Math.floor(maxH/G.rows))
  ));
}
// Effective screen pixels per cell = baseCS × vs
function cellSize(){ return baseCS() * vs; }

// Parameterised render — can target any canvas+context (used for compare mode)
function drawOn(canv, _ct, ovViz){
  if (!G.rows) return;
  const isMain = (canv === mc);
  const _area  = document.getElementById('canvas-area');

  // ── Size canvas to its pane ──────────────────────────────────
  const pane  = canv.parentElement;
  const paneW = pane && pane.clientWidth > 0 ? pane.clientWidth
                                              : Math.max(200, _area.clientWidth - 40);
  // Panel A: subtract canvas-area padding (40) + label in compare mode (34)
  // Panel B: subtract padding (40) + label (34) + buttons (46) + gaps (10)
  const areaH = _area.clientHeight;
  const paneH = isMain
    ? Math.max(200, areaH - 40 - (compMode ? 34 : 0))
    : Math.max(200, areaH - 40 - 34 - 46 - 10);
  canv.width  = Math.max(200, paneW);
  canv.height = paneH;

  // ── Compute cell size + transform ────────────────────────────
  let CS, tx, ty, sc;
  if (isMain){
    // Panel A: respect user pan/zoom
    CS = baseCS();
    tx = vx; ty = vy; sc = vs;
  } else if (compMode) {
    // Panel B in compare mode: mirror Panel A pan/zoom
    CS = baseCS();
    tx = vx; ty = vy; sc = vs;
  } else {
    // Panel B: auto-fit, centered — no pan/zoom applied
    CS = Math.min(60, Math.max(4,
      Math.min(Math.floor(paneW / G.cols), Math.floor(paneH / G.rows))
    ));
    const mazeW = CS * G.cols, mazeH = CS * G.rows;
    tx = Math.max(0, Math.floor((paneW - mazeW) / 2));
    ty = Math.max(0, Math.floor((paneH - mazeH) / 2));
    sc = 1;
  }

  const effCS = CS * sc;   // effective pixels per cell (for text/arrow thresholds)

  _ct.save();
  _ct.translate(tx, ty);
  _ct.scale(sc, sc);

  // ── base layer (cells) ──
  for (let r=0;r<G.rows;r++){
    for (let c=0;c<G.cols;c++){
      const ch = G.cells[r][c];
      let bg;
      if      (ch==='X')  bg = CLR.wall;
      else if (ch==='S')  bg = CLR.start;
      else if (ch==='G')  bg = CLR.goal;
      else                bg = CLR.open;
      _ct.fillStyle = bg;
      _ct.fillRect(c*CS,r*CS,CS,CS);
      _ct.strokeStyle = CLR.border;
      _ct.lineWidth   = .5;
      _ct.strokeRect(c*CS,r*CS,CS,CS);
      if (effCS>=8 && showNumbers){
        _ct.fillStyle    = 'rgba(255,255,255,0.75)';
        _ct.font         = `${Math.max(7,Math.floor(CS*.35))}px monospace`;
        _ct.textAlign    = 'center';
        _ct.textBaseline = 'middle';
        _ct.fillText(ch, c*CS+CS/2, r*CS+CS/2);
      }
    }
  }

  if (!ovViz){ _ct.restore(); return; }
  const {visitedSet, frontierSet, pathSet, flowEdges, mstEdges, algo} = ovViz;

  // visited overlay
  if (visitedSet){
    _ct.fillStyle='rgba(44,44,85,0.75)';
    visitedSet.forEach(k=>{
      const [r,c]=k.split(',').map(Number);
      if (G.cells[r][c]!=='S'&&G.cells[r][c]!=='G')
        _ct.fillRect(c*CS+.5,r*CS+.5,CS-1,CS-1);
    });
  }
  // frontier overlay
  if (frontierSet){
    _ct.fillStyle='rgba(116,185,255,0.65)';
    frontierSet.forEach(k=>{
      const [r,c]=k.split(',').map(Number);
      if (G.cells[r][c]!=='S'&&G.cells[r][c]!=='G')
        _ct.fillRect(c*CS+.5,r*CS+.5,CS-1,CS-1);
    });
  }
  // path
  if (pathSet){
    const pc = algo==='dijkstra' ? CLR.path_dij : CLR.path_bfs;
    _ct.fillStyle = pc+'cc';
    pathSet.forEach(k=>{
      const [r,c]=k.split(',').map(Number);
      _ct.fillRect(c*CS+.5,r*CS+.5,CS-1,CS-1);
    });
    // arrows
    if (ovViz.path && ovViz.path.length>1 && effCS>=10){
      _ct.strokeStyle='rgba(255,255,255,.7)';
      _ct.lineWidth=Math.max(1.5,CS*.07);
      for(let i=0;i<ovViz.path.length-1;i++){
        const [r1,c1]=ovViz.path[i], [r2,c2]=ovViz.path[i+1];
        drawArrow(c1*CS+CS/2,r1*CS+CS/2,c2*CS+CS/2,r2*CS+CS/2,CS*.22,_ct);
      }
    }
  }
  // flow edges
  if (flowEdges){
    const maxF = Math.max(1,...flowEdges.map(e=>e[2]));
    flowEdges.forEach(([u,v,f,cap])=>{
      if(f<=0)return;
      const a=0.4+0.6*(f/maxF);
      _ct.strokeStyle=`rgba(255,118,117,${a.toFixed(2)})`;
      _ct.lineWidth=Math.max(1.5, CS*.14*(f/maxF));
      drawArrow(u[1]*CS+CS/2,u[0]*CS+CS/2,v[1]*CS+CS/2,v[0]*CS+CS/2,CS*.2,_ct);
    });
  }
  // mst edges
  if (mstEdges){
    _ct.strokeStyle=CLR.mst;
    _ct.lineWidth=Math.max(1.5,CS*.1);
    _ct.lineCap='round';
    mstEdges.forEach(([u,v])=>{
      _ct.beginPath();
      _ct.moveTo(u[1]*CS+CS/2,u[0]*CS+CS/2);
      _ct.lineTo(v[1]*CS+CS/2,v[0]*CS+CS/2);
      _ct.stroke();
    });
  }
  // redraw S and G on top so they're never obscured by overlays
  ['S','G'].forEach(ch=>{
    const pos = ch==='S'?startPos:goalPos;
    if(!pos)return;
    _ct.fillStyle = ch==='S'?CLR.start:CLR.goal;
    _ct.fillRect(pos[1]*CS,pos[0]*CS,CS,CS);
    _ct.strokeStyle=CLR.border;_ct.lineWidth=.5;
    _ct.strokeRect(pos[1]*CS,pos[0]*CS,CS,CS);
    if(effCS>=12 && showNumbers){
      _ct.fillStyle='rgba(0,0,0,.7)';
      _ct.font=`bold ${Math.max(7,Math.floor(CS*.38))}px monospace`;
      _ct.textAlign='center';_ct.textBaseline='middle';
      _ct.fillText(ch,pos[1]*CS+CS/2,pos[0]*CS+CS/2);
    }
  });
  _ct.restore();
}

// Wrapper — draws main canvas; also draws Panel B if compare mode is on
function draw(ovViz){
  lastOvViz = ovViz;
  drawOn(mc, ctx, ovViz);
  if(compMode && mc2) drawOn(mc2, ctx2, lastOvViz2);
}

function drawArrow(x1,y1,x2,y2,hLen,_ct){
  const ang=Math.atan2(y2-y1,x2-x1);
  const d=Math.hypot(x2-x1,y2-y1),sh=Math.min(d*.12,5);
  const sx=x1+Math.cos(ang)*sh,sy=y1+Math.sin(ang)*sh;
  const ex=x2-Math.cos(ang)*sh,ey=y2-Math.sin(ang)*sh;
  _ct.beginPath();_ct.moveTo(sx,sy);_ct.lineTo(ex,ey);_ct.stroke();
  const hl=Math.min(hLen,d*.35);
  _ct.beginPath();
  _ct.moveTo(ex,ey);
  _ct.lineTo(ex-hl*Math.cos(ang-Math.PI/6),ey-hl*Math.sin(ang-Math.PI/6));
  _ct.moveTo(ex,ey);
  _ct.lineTo(ex-hl*Math.cos(ang+Math.PI/6),ey-hl*Math.sin(ang+Math.PI/6));
  _ct.stroke();
}
