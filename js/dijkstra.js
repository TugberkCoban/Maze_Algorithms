// DIJKSTRA — Dijkstra's shortest path with a binary min-heap

// Min-heap (binary heap)
class MinHeap{
  constructor(){this.h=[]}
  push(item){
    this.h.push(item);
    this._up(this.h.length-1);
  }
  pop(){
    if(!this.h.length) return null;
    const top=this.h[0];
    const last=this.h.pop();
    if(this.h.length){this.h[0]=last;this._down(0);}
    return top;
  }
  get size(){return this.h.length}
  _up(i){
    while(i>0){
      const p=(i-1)>>1;
      if(this.h[p][0]>this.h[i][0]){[this.h[p],this.h[i]]=[this.h[i],this.h[p]];i=p;}
      else break;
    }
  }
  _down(i){
    const n=this.h.length;
    while(true){
      let s=i,l=2*i+1,r=2*i+2;
      if(l<n&&this.h[l][0]<this.h[s][0]) s=l;
      if(r<n&&this.h[r][0]<this.h[s][0]) s=r;
      if(s===i) break;
      [this.h[s],this.h[i]]=[this.h[i],this.h[s]]; i=s;
    }
  }
}

function initDijkstra(modeOverride, costModelOverride){
  const mode      = modeOverride !== undefined ? modeOverride : getMode('dij');
  const costModel = costModelOverride !== undefined ? costModelOverride : +document.getElementById('dij-cost').value;
  const [sr,sc]  = startPos;
  const goal     = k(...goalPos);
  const dist     = {[k(sr,sc)]:0};
  const prev     = {[k(sr,sc)]:null};
  const heap     = new MinHeap();
  heap.push([0,sr,sc]);
  const visitedSet = new Set();
  const frontierSet= new Set([k(sr,sc)]);
  let done=false, t0=performance.now();

  const state={
    algo:'dijkstra',
    visitedSet, frontierSet,
    pathSet:new Set(),
    finalPath:null, finalCost:null,
    ms:null,
    bestCost:0,
    frontierSize:()=>heap.size,
    step(){
      if(done) return true;
      const batch=Math.max(1, Math.floor(G.rows*G.cols/300));
      for(let b=0;b<batch;b++){
        if(!heap.size){ done=true; state.ms=Math.round(performance.now()-t0); return true; }
        const [cost,r,c]=heap.pop();
        const ck=k(r,c);
        if(visitedSet.has(ck)) continue;
        visitedSet.add(ck); frontierSet.delete(ck);
        state.bestCost=cost;
        if(ck===goal){
          const path=[];
          let node=goalPos;
          while(node){path.push(node);node=prev[k(...node)];}
          path.reverse();
          state.finalPath=path;
          state.pathSet=new Set(path.map(p=>k(...p)));
          state.finalCost=cost;
          state.ms=Math.round(performance.now()-t0);
          done=true; return true;
        }
        for(const [nr,nc] of neighbors(r,c,mode)){
          const nk=k(nr,nc);
          if(visitedSet.has(nk)) continue;
          const uv=cellVal(r,c), vv=cellVal(nr,nc);
          const ec = costModel===1?vv : costModel===2?uv : uv+vv;
          const nc2=cost+ec;
          if(nc2<(dist[nk]??Infinity)){
            dist[nk]=nc2; prev[nk]=[r,c];
            frontierSet.add(nk);
            heap.push([nc2,nr,nc]);
          }
        }
      }
      return false;
    }
  };
  return state;
}
