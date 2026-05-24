// COMPARE MODE — side-by-side algorithm comparison

// Show algorithm result stats below a panel (only in compare mode)
// info = array of [label, value] pairs, or null to hide
function showPanelStats(panel, info){
  const el = document.getElementById('stats-'+panel);
  if(!el) return;
  if(!info || !compMode){ el.style.display='none'; el.innerHTML=''; return; }
  el.innerHTML = info.map(([lbl,val])=>
    `<span>${lbl}: <b>${val}</b></span>`).join('');
  el.style.display = 'flex';
}

function toggleNumbers(){
  showNumbers = !showNumbers;
  const btn = document.getElementById('btn-show-nums');
  btn.textContent = showNumbers ? 'Numbers ✓' : 'Numbers';
  btn.style.color = showNumbers ? 'var(--accent)' : '';
  draw(lastOvViz);
}

function updateNumbersBtn(){
  const btn = document.getElementById('btn-show-nums');
  if(!btn) return;
  btn.textContent = showNumbers ? 'Numbers ✓' : 'Numbers';
  btn.style.color = showNumbers ? 'var(--accent)' : '';
}

function toggleCompare(){
  compMode = !compMode;
  document.getElementById('pane-b').style.display      = compMode ? 'flex' : 'none';
  document.getElementById('pane-a-label').style.display= compMode ? 'block': 'none';
  document.getElementById('compare-ctrl').style.display= compMode ? 'flex' : 'none';
  document.getElementById('btn-compare').textContent   = compMode ? '✕ Compare' : '⊞ Compare';
  document.getElementById('pa-algo-name').textContent  =
    {bfs:'BFS',dijkstra:'Dijkstra',flow:'Max Flow',mst:'MST'}[currentAlgo]||currentAlgo;
  // Double rAF: first frame triggers browser reflow, second reads correct pane widths
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(compMode && !mc2){
      mc2 = document.getElementById('mc2');
      ctx2 = mc2.getContext('2d');
      // Mirror pan/zoom of Panel A onto Panel B
      mc2.addEventListener('mousedown', e=>{
        if(e.button===2){ isPanning=true; panX0=e.clientX; panY0=e.clientY; vx0=vx; vy0=vy; }
      });
      mc2.addEventListener('mousemove', e=>{
        if(isPanning){ vx=vx0+(e.clientX-panX0); vy=vy0+(e.clientY-panY0); draw(lastOvViz); }
      });
      mc2.addEventListener('mouseup', e=>{ if(e.button===2) isPanning=false; });
      mc2.addEventListener('contextmenu', e=>e.preventDefault());
      mc2.addEventListener('wheel', e=>{
        e.preventDefault();
        const factor=e.deltaY<0?1.15:1/1.15;
        const newVS=Math.max(minScale, Math.min(15, vs*factor));
        if(newVS===vs) return;
        const rect=mc2.getBoundingClientRect();
        const mx=e.clientX-rect.left, my=e.clientY-rect.top;
        vx=mx-(mx-vx)*(newVS/vs);
        vy=my-(my-vy)*(newVS/vs);
        vs=newVS;
        draw(lastOvViz);
      },{passive:false});
    }
    // resetView recenters Panel A at new pane width, then calls draw() which
    // also redraws Panel B (since compMode flag is already set above)
    if(G.rows) resetView();
    else if(compMode) drawOn(mc2, ctx2, null);
  }));
}

function selectAlgo2(v){
  currentAlgo2=v;
  const names={bfs:'BFS',dijkstra:'Dijkstra',flow:'Max Flow',mst:'MST'};
  document.getElementById('pb-algo-name').textContent=names[v]||v;
  resetViz2();
}

function stopAnim2(){
  if(animTimer2) clearInterval(animTimer2);
  animTimer2=null;
}

function resetViz2(){
  stopAnim2();
  animState2=null;
  lastOvViz2=null;
  showPanelStats('b', null);
  if(mc2) drawOn(mc2, ctx2, null);
}

// stepAnim for panel B — mirrors stepAnim but draws to mc2
function stepAnim2(){
  if(!animState2) return true;
  const done=animState2.step();
  const s=animState2;
  lastOvViz2={visitedSet:s.visitedSet,frontierSet:s.frontierSet,
              pathSet:s.pathSet,path:s.finalPath,algo:s.algo};
  if(mc2) drawOn(mc2, ctx2, lastOvViz2);
  if(done){
    lastOvViz2={visitedSet:s.visitedSet,frontierSet:new Set(),
                pathSet:s.pathSet,path:s.finalPath,algo:s.algo};
    if(mc2) drawOn(mc2, ctx2, lastOvViz2);
  }
  return done;
}

// Run Panel A and Panel B algorithms simultaneously
function runBoth(){
  if(!G.rows){ alert('Generate a maze first!'); return; }
  if(!startPos||!goalPos){ alert('Maze has no S or G!'); return; }
  runAlgo();
  runAlgo2();
}

function runAlgo2(){
  if(!G.rows){ alert('Generate a maze first!'); return; }
  if(!startPos||!goalPos){ alert('Maze has no S or G!'); return; }
  if(!mc2){ mc2=document.getElementById('mc2'); ctx2=mc2.getContext('2d'); }
  stopAnim2();
  const dir2=+document.getElementById('sel-algo2-dir').value;

  if(currentAlgo2==='bfs')       animState2 = initBFS(dir2);
  else if(currentAlgo2==='dijkstra') animState2 = initDijkstra(dir2, 1);
  else if(currentAlgo2==='flow'){
    runFlowImmediate2(dir2); return;
  }
  else if(currentAlgo2==='mst'){
    runMSTImmediate2(dir2); return;
  }

  animTimer2=setInterval(()=>{
    const done=stepAnim2();
    if(done){ stopAnim2();
      if(compMode && animState2) showPanelStats('b',[
        ['Visited', animState2.visitedSet.size],
        ['Path', animState2.finalPath ? animState2.finalPath.length-1 : '—'],
        ['Cost', animState2.finalCost ?? '—'],
        ['Time', (animState2.ms??'—')+'ms']
      ]);
    }
  }, animDelay);
}
