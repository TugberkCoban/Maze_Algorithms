// ════════════════════════════════════════════════════════════════
//  ANIMATION ENGINE — run/step/reset controls & algorithm selector
// ════════════════════════════════════════════════════════════════

function selectAlgo(btn){
  document.querySelectorAll('.algo-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentAlgo=btn.dataset.algo;
  ['bfs','dijkstra','flow','mst'].forEach(a=>{
    document.getElementById('algo-opts-'+a).style.display=
      a===currentAlgo?'block':'none';
  });
  const names={bfs:'BFS',dijkstra:'Dijkstra',flow:'Max Flow',mst:'MST (Kruskal)'};
  document.getElementById('tb-algo').textContent=names[currentAlgo]||currentAlgo;
  document.getElementById('pa-algo-name').textContent=names[currentAlgo]||currentAlgo;
  resetViz();
}

function stopAnim(){
  if(animTimer) clearInterval(animTimer);
  animTimer=null;
}

function resetViz(){
  stopAnim();
  animState=null;
  setStats(null,null,null,null,null);
  setProgress(0);
  document.getElementById('overlay-stats').style.display='none';
  setTbState('Ready');
  showPanelStats('a', null);
  draw(null);
}

// Reset pan/zoom — centres maze in Panel A, zoom=1
function resetView(){
  if(!G.rows) return;
  const _CS = baseCS();
  const pane = mc.parentElement;
  const pw = pane && pane.clientWidth > 0 ? pane.clientWidth
             : document.getElementById('canvas-area').clientWidth - 40;
  const areaH = document.getElementById('canvas-area').clientHeight;
  const ph = Math.max(200, areaH - 40 - (compMode ? 34 : 0));
  vx = Math.max(0, Math.floor((pw - G.cols*_CS) / 2));
  vy = Math.max(0, Math.floor((ph - G.rows*_CS) / 2));
  vs = 1.0; minScale = 1.0;
  draw(lastOvViz);
}

function getMode(prefix){
  return +document.getElementById(prefix+'-mode').value;
}

function runAlgo(){
  if(!G.rows){ alert('Generate a maze first!'); return; }
  if(!startPos||!goalPos){ alert('Maze has no S or G!'); return; }
  stopAnim();
  const algo=currentAlgo;
  setTbState('Running…','var(--accent)');

  if(algo==='bfs')      animState = initBFS();
  else if(algo==='dijkstra') animState = initDijkstra();
  else if(algo==='flow'){ runFlowImmediate(); return; }
  else if(algo==='mst') { runMSTImmediate();  return; }

  animTimer=setInterval(()=>{
    const done=stepAnim();
    if(done){ stopAnim(); setTbState('Done','var(--green)');
      if(compMode && animState) showPanelStats('a',[
        ['Visited', animState.visitedSet.size],
        ['Path', animState.finalPath ? animState.finalPath.length-1 : '—'],
        ['Cost', animState.finalCost ?? '—'],
        ['Time', (animState.ms??'—')+'ms']
      ]);
    }
  }, animDelay);
}

function stepOnce(){
  if(!animState){
    if(!G.rows) return;
    if(currentAlgo==='flow'){ runFlowImmediate(); return; }
    if(currentAlgo==='mst'){  runMSTImmediate();  return; }
    if(currentAlgo==='bfs')      animState = initBFS();
    else if(currentAlgo==='dijkstra') animState = initDijkstra();
    setTbState('Stepping','var(--accent2)');
  }
  const done=stepAnim();
  if(done) setTbState('Done','var(--green)');
}

function stepAnim(){
  if(!animState) return true;
  const done=animState.step();
  const s=animState;
  draw({
    visitedSet:s.visitedSet,
    frontierSet:s.frontierSet,
    pathSet:s.pathSet,
    path:s.finalPath,
    algo:s.algo,
  });
  updateOverlay(s.visitedSet.size, s.frontierSize(), s.bestCost||0);
  setProgress(Math.min(99, Math.floor(s.visitedSet.size/(G.rows*G.cols)*200)));
  if(done){
    setProgress(100);
    setStats(s.visitedSet.size, s.finalPath?s.finalPath.length-1:null,
             s.finalCost, s.ms, s.finalPath);
    draw({visitedSet:s.visitedSet,frontierSet:new Set(),
          pathSet:s.pathSet,path:s.finalPath,algo:s.algo});
  }
  return done;
}

// ── Resize listener ─────────────────────────────────────────
window.addEventListener('resize',()=>{
  if(!G.rows) return;
  const ovA = animState?{visitedSet:animState.visitedSet,frontierSet:animState.frontierSet,
    pathSet:animState.pathSet,path:animState.finalPath,algo:animState.algo}:lastOvViz;
  draw(ovA);
});
