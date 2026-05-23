// ════════════════════════════════════════════════════════════════
//  STATE — global variables shared across all modules
// ════════════════════════════════════════════════════════════════
let G = { rows:0, cols:0, cells:[] };  // cells[r][c] = char
let startPos = null, goalPos = null;
let animState = null;  // current animation state
let animTimer = null;
let paintMode = null;  // 'wall' | 'open' | 'S' | 'G'
let isDragging = false;
let lastOvViz = null;     // last viz state — re-used for pan/zoom redraws

// ── compare mode state ──────────────────────────────────────
let compMode = false;
let showNumbers = true;  // toggled by toolbar button; auto-set on maze generation
let animState2 = null, animTimer2 = null, lastOvViz2 = null;
let currentAlgo2 = 'dijkstra';
let mc2 = null, ctx2 = null;

// ── current algorithm ───────────────────────────────────────
let currentAlgo = 'bfs';

// ── pan & zoom state ────────────────────────────────────────
let vx=0, vy=0, vs=1.0, minScale=1.0;
let isPanning=false, panX0=0, panY0=0, vx0=0, vy0=0;
