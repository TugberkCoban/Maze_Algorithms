// BFS — Breadth-First Search algorithm
function initBFS(modeOverride){
  const mode = modeOverride !== undefined ? modeOverride : getMode('bfs');
  const [sr,sc]=startPos, goal=k(...goalPos);
  const prev={[k(sr,sc)]:null};
  const queue=[[sr,sc]];
  const visitedSet=new Set();
  const frontierSet=new Set([k(sr,sc)]);
  let done=false, t0=performance.now();

  const state={
    algo:'bfs',
    visitedSet, frontierSet,
    pathSet:new Set(),
    finalPath:null, finalCost:null,
    ms:null,
    frontierSize:()=>frontierSet.size,
    bestCost:0,
    step(){
      if(done) return true;
      // process up to N cells per step to keep animation smooth
      const batch=Math.max(1, Math.floor(G.rows*G.cols/300));
      for(let b=0;b<batch;b++){
        if(!queue.length){ done=true; state.ms=Math.round(performance.now()-t0); return true; }
        const [r,c]=queue.shift();
        const ck=k(r,c);
        frontierSet.delete(ck);
        if(visitedSet.has(ck)) continue;
        visitedSet.add(ck);
        if(ck===goal){
          // reconstruct
          const path=[];
          let node=goalPos;
          while(node){path.push(node);node=prev[k(...node)];}
          path.reverse();
          state.finalPath=path;
          state.pathSet=new Set(path.map(p=>k(...p)));
          state.finalCost=path.length-1;
          state.ms=Math.round(performance.now()-t0);
          done=true; return true;
        }
        for(const [nr,nc] of neighbors(r,c,mode)){
          const nk=k(nr,nc);
          if(!visitedSet.has(nk)&&!frontierSet.has(nk)){
            prev[nk]=[r,c];
            frontierSet.add(nk);
            queue.push([nr,nc]);
          }
        }
      }
      return false;
    }
  };
  return state;
}
