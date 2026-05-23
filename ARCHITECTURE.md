# Architecture & Code Flow Documentation

This document explains how the code is organized, how each module works, and how they interconnect.

---

## High-Level Overview

The application follows a **modular architecture** where each file handles a specific responsibility:

1. **state.js** — Shared global variables (maze data, animation state, pan/zoom)
2. **helpers.js** — Reusable utility functions
3. **canvas.js** — All rendering logic
4. **maze-gen.js** — Maze generation algorithms
5. **cell-edit.js** — Mouse event handlers for editing and navigation
6. **bfs.js** — BFS algorithm implementation
7. **dijkstra.js** — Dijkstra algorithm + MinHeap data structure
8. **animation.js** — Animation loop control, algorithm selector
9. **flow.js** — Max Flow (Edmonds-Karp) for both panels
10. **mst.js** — MST (Kruskal + Union-Find) for both panels
11. **save.js** — Export results to output.txt
12. **compare.js** — Side-by-side comparison mode management
13. **init.js** — Page load entry point

---

## Module Descriptions & Dependencies

### `state.js` (Global Variables)
**Purpose:** Central data store for all shared state.

**Key Variables:**
```javascript
let G = { rows, cols, cells[][] }  // Maze grid; cells[r][c] contains 'X'|'S'|'G'|'1-9'
let startPos, goalPos              // [row, col] for S and G
let animState                       // Current step object (for BFS/Dijkstra)
let currentAlgo                     // 'bfs' | 'dijkstra' | 'flow' | 'mst'
let compMode                        // Is compare mode on?
let vx, vy, vs                     // Pan/zoom state (viewport x, y, scale)
```

**Used By:** Every other module reads/modifies these variables.

---

### `helpers.js` (Utility Functions)
**Purpose:** Reusable helper functions called throughout the app.

**Key Functions:**
| Function | Purpose | Called By |
|----------|---------|-----------|
| `cellVal(r, c)` | Get numeric value of a cell (0 for S/G, 1-9 for others) | dijkstra.js, flow.js, mst.js, save.js |
| `isPassable(r, c)` | Check if cell is not a wall | helpers.js (neighbors), bfs.js, dijkstra.js |
| `neighbors(r, c, mode)` | Get 4 or 8 directional neighbors | bfs.js, dijkstra.js, flow.js, mst.js |
| `k(r, c)` | Convert [r,c] to string key "r,c" | All algorithm files |
| `updateSpeed()` | Sync speed slider to animation delay | animation.js |
| `setStats()` | Update results display | animation.js |
| `updateOverlay()` | Show visited/queue/cost on-screen | animation.js |

**Dependencies:** Calls `isPassable()`, `cellVal()`. No external imports.

---

### `canvas.js` (Rendering Engine)
**Purpose:** Draw maze, overlays (visited, frontier, path), and apply zoom/pan.

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `baseCS()` | Calculate base cell size (pixels per cell at zoom=1) |
| `cellSize()` | Effective cell size = baseCS() × zoom |
| `drawOn(canvas, context, vizState)` | Core render function — draws grid + overlays |
| `draw(vizState)` | Wrapper: draws main canvas + Panel B if compare mode |
| `drawArrow()` | Draw path arrows in pathfinding results |

**How It Works:**
1. Get canvas dimensions from its parent pane
2. Calculate cell size to fit maze in viewport
3. Set up canvas transform (translate for pan, scale for zoom)
4. Loop through all cells: draw base colors (wall, open, S, G)
5. If `vizState` provided, overlay visited/frontier/path sets
6. Redraw S/G on top (so never obscured)
7. If compare mode, also call `drawOn(mc2, ctx2, lastOvViz2)`

**Called By:**
- `animation.js` after each step
- `cell-edit.js` after maze edits
- `maze-gen.js` after generation
- Mouse events (pan/zoom)

**Dependencies:** Uses `baseCS()`, `cellVal()`, `showNumbers`, `compMode` from state.

---

### `maze-gen.js` (Maze Generation)
**Purpose:** Generate labyrinths using 4 algorithms.

**Key Functions:**
| Algorithm | Function | Description |
|-----------|----------|-------------|
| DFS | `genDFS(rows, cols)` | Recursive depth-first on even grid indices |
| Prim | `genPrim(rows, cols)` | Randomized Prim's algorithm |
| Kruskal | `genKruskal(rows, cols)` | Kruskal's with union-find on random walls |
| Guaranteed | `genGuaranteedPath(rows, cols)` | Random walk + random walls |

**Main Flow (`generateMaze()`):**
1. Read user input (rows, cols, algorithm choice, density)
2. Initialize `G.cells` as all walls
3. Call selected generation function
4. Fill open cells with random digits 1-9
5. Find S and G positions (shuffle open cells)
6. Update toolbar, center maze, reset animation
7. Call `resetViz()` to clear old animation state
8. Call `draw(null)` to render

**Called By:** Maze Generation section buttons → HTML `onclick="generateMaze()"`

**Dependencies:** Calls `rnd()`, `shuffle()`, `stopAnim()`, `updateToolbar()`, `resetViz()`, `draw()`.

---

### `cell-edit.js` (Mouse Interaction)
**Purpose:** Handle mouse events for pan, zoom, and cell editing.

**Key Listeners:**
| Event | Action |
|-------|--------|
| `mousedown` (left button) | Start painting walls/cells |
| `mousemove` (left button held) | Paint mode continues |
| `mousemove` (right button held) | Pan: `vx += dx`, `vy += dy` |
| `wheel` | Zoom: `vs *= factor`, adjust vx/vy toward cursor |
| `contextmenu` | Prevent right-click menu |

**Pan/Zoom Math:**
```
For zoom towards cursor:
  new_vx = mx - (mx - old_vx) * (newScale / oldScale)
  new_vy = my - (my - old_vy) * (newScale / oldScale)
Where (mx, my) = cursor position relative to canvas
```

**Cell Edit Flow (`handleCellClick`):**
1. Convert screen coords to world coords: `(x - vx) / vs / baseCS()`
2. Get cell [r, c]
3. Determine paint mode on first click: wall → open, or open → wall
4. Apply mode to all dragged cells
5. Call `stopAnim()` (cancel if animating)
6. Call `draw(null)` to refresh

**Dependencies:** Uses `baseCS()`, `vx`, `vy`, `vs`, `G`, `stopAnim()`, `draw()`.

---

### `bfs.js` (BFS Algorithm)
**Purpose:** Implement breadth-first search for shortest path.

**Main Function: `initBFS(modeOverride)`**

Returns a `state` object with a `step()` method:
```javascript
{
  algo: 'bfs',
  visitedSet: Set<"r,c">,
  frontierSet: Set<"r,c">,
  pathSet: Set<"r,c">,
  finalPath: [[r,c], ...],
  finalCost: number,
  step(): bool  // true when done
}
```

**Algorithm:**
1. Initialize: queue = [startPos], prev = {}, visited = {}, frontier = {start}
2. Each step:
   - Process batch (e.g., 30 cells) from queue
   - Mark as visited, record parent
   - When goal found: reconstruct path via `prev`
   - Return true (done)
3. Returns false until goal or queue empty

**Called By:** `animation.js` via `initBFS()` → `runAlgo()` or `stepOnce()`

**Dependencies:** Uses `neighbors()`, `k()`, `startPos`, `goalPos`, `G`.

---

### `dijkstra.js` (Dijkstra Algorithm + MinHeap)
**Purpose:** Implement Dijkstra with 3 cost models, using a binary min-heap.

**MinHeap Class:**
- `push(item)` — Add [cost, r, c]
- `pop()` — Extract minimum; O(log n)
- `_up(i)` / `_down(i)` — Heapify operations

**Main Function: `initDijkstra(modeOverride, costModelOverride)`**

Returns `state` object similar to BFS but uses:
```javascript
{
  heap: MinHeap,           // Priority queue
  dist: {key → cost},      // Minimum known distance to each cell
  costModel: 1|2|3,        // Determines edge cost calculation
  bestCost: number,        // Current best distance (for UI)
}
```

**Cost Calculation:**
```javascript
const uv = cellVal(current);
const vv = cellVal(neighbor);
if (costModel === 1) ec = vv;           // entering cost
else if (costModel === 2) ec = uv;      // leaving cost
else ec = uv + vv;                      // combined
newCost = currentCost + ec;
```

**Algorithm:**
1. Initialize: heap = [0, start], dist[start] = 0
2. Each step:
   - Pop minimum from heap
   - If visited, skip
   - Mark visited; if goal, reconstruct and return true
   - For each unvisited neighbor: if shorter path found, update heap

**Called By:** `animation.js` via `runAlgo()` or `stepOnce()`, also `save.js` via `dijkstraDirect()`

**Dependencies:** Uses `neighbors()`, `k()`, `cellVal()`, cost model from DOM element.

---

### `animation.js` (Animation Loop & Algorithm Selector)
**Purpose:** Control animation stepping, algorithm selection, and state management.

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `selectAlgo(btn)` | Switch algorithm; hide/show options; call `resetViz()` |
| `runAlgo()` | Start animation loop; init BFS/Dijkstra or call flow/MST immediately |
| `stepOnce()` | Single step; init state if needed |
| `stepAnim()` | Execute one step, update display, check if done |
| `stopAnim()` | Cancel animation timer |
| `resetViz()` | Clear animation, hide overlay, reset toolbar state |
| `resetView()` | Center maze, reset zoom to 1.0 |

**Animation Loop (`runAlgo()`):**
```javascript
animState = initBFS() or initDijkstra()
animTimer = setInterval(() => {
  const done = stepAnim();
  if (done) {
    stopAnim();
    setTbState('Done', 'var(--green)');
    showPanelStats(...);  // If compare mode
  }
}, animDelay);
```

**Step Function (`stepAnim()`):**
1. Call `animState.step()`
2. Build viz object: `{ visitedSet, frontierSet, pathSet, path, algo }`
3. Call `draw(vizState)` to render
4. Call `updateOverlay()` to show live stats
5. If done: show final stats, draw final state

**Called By:** HTML buttons → `runAlgo()`, `stepOnce()`, `resetViz()`, `selectAlgo()`

**Dependencies:** Uses all state variables, calls `initBFS()`, `initDijkstra()`, `runFlowImmediate()`, `runMSTImmediate()`, `draw()`, `stopAnim()`.

---

### `flow.js` (Max Flow — Edmonds-Karp)
**Purpose:** Compute maximum flow from G (source) to S (sink).

**Functions:**
- `runFlowImmediate()` — Main panel, instant (no animation)
- `runFlowImmediate2(mode)` — Compare panel B

**Algorithm (Edmonds-Karp):**
1. Build capacity & adjacency maps from maze edges
2. Loop (max 10000 iterations):
   - BFS to find augmenting path from source to sink
   - If none, break (flow is maximal)
   - Find bottleneck capacity on path
   - Add flow along path, subtract on reverse edges
3. Collect all positive-flow edges
4. Display stats and draw with `draw({flowEdges: ...})`

**Flow Visualization:**
- Arrow thickness ∝ flow amount
- Opacity ∝ flow/max-flow

**Called By:** `animation.js` when currentAlgo === 'flow'

**Dependencies:** Uses `neighbors()`, `cellVal()`, `k()`, `draw()`, `showPanelStats()`.

---

### `mst.js` (Minimum Spanning Tree — Kruskal + Union-Find)
**Purpose:** Compute MST of reachable component from S.

**Functions:**
- `runMSTImmediate()` — Main panel
- `runMSTImmediate2(mode)` — Compare panel B

**Algorithm:**
1. BFS from S to find connected component
2. Collect all edges within component, calculate weights = val(u) + val(v)
3. Sort edges by weight
4. Kruskal's: iterate edges; union if endpoints not connected
5. Draw tree edges with `drawOn({mstEdges: ...})`

**Tree Visualization:**
- Edges drawn as lines connecting cell centers
- Nodes shown as visited set overlay

**Called By:** `animation.js` when currentAlgo === 'mst'

**Dependencies:** Uses `neighbors()`, `cellVal()`, `k()`, `fromK()`, `draw()`, `showPanelStats()`.

---

### `save.js` (Export Results)
**Purpose:** Generate and download output.txt with algorithm results.

**Key Functions:**
- `bfsDirect()` — Synchronous BFS (no animation)
- `dijkstraDirect(costFn)` — Synchronous Dijkstra with custom cost function
- `saveTxt()` — Aggregate results, create Blob, trigger download

**Output Structure:**
```
=== MAZE ===
<grid>

=== SUBTASK A: BFS Shortest Path ===
Path: (r1,c1) -> (r2,c2) -> ...
Length: N

=== SUBTASK B: Dijkstra ===
Model 1: ...
  Path: ...
  Cost: ...
Model 2: ...
  Path: ...
  Cost: ...
Model 3: ...
  Path: ...
  Cost: ...

=== SUBTASK D: Max Flow ===
Run from control panel.

=== SUBTASK E: MST ===
Run from control panel.
```

**Called By:** "Save Results" button → HTML `onclick="saveTxt()"`

**Dependencies:** Uses `bfsDirect()`, `dijkstraDirect()`, DOM to create download link.

---

### `compare.js` (Comparison Mode)
**Purpose:** Manage side-by-side algorithm visualization.

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `toggleCompare()` | Toggle compMode; show/hide Panel B; init mc2 canvas if needed |
| `selectAlgo2(v)` | Set algorithm for Panel B |
| `runAlgo2()` | Run Panel B algorithm (mirrors `runAlgo()`) |
| `stepAnim2()` | Step Panel B (mirrors `stepAnim()`) |
| `runBoth()` | Call `runAlgo()` and `runAlgo2()` in sequence |
| `runFlowImmediate2(mode)` | Max Flow for Panel B |
| `runMSTImmediate2(mode)` | MST for Panel B |
| `showPanelStats()` | Display [label, value] pairs below each panel |

**Compare Mode Behavior:**
- Both panels share pan/zoom state (vx, vy, vs)
- Panel A: user controls; Panel B: mirrors
- Each panel has separate `animState`, `animTimer`, `lastOvViz`
- When Panel A pans/zooms, `draw()` calls `drawOn(mc, ...)` then `drawOn(mc2, ...)`

**Mouse Events on Panel B:**
- Only right-click pan/zoom (same as Panel A)
- Left-click disabled (no editing in compare mode)

**Called By:**
- "⊞ Compare" button → `toggleCompare()`
- Panel B algorithm dropdown → `selectAlgo2(value)`
- "⏭⏭ Run Both" button → `runBoth()`

**Dependencies:** Uses `compMode`, `animState2`, `mc2`, `ctx2`, `currentAlgo2`, `draw()`, `drawOn()`.

---

### `init.js` (Page Initialization)
**Purpose:** Single entry point on page load.

**Code:**
```javascript
window.addEventListener('load', () => {
  generateMaze();
});
```

**Flow:**
1. Page loads, all scripts execute (state → helpers → canvas → … → init)
2. DOM ready, window 'load' fires
3. `generateMaze()` creates default 20×20 DFS maze
4. User can now interact

---

## Call Graph Example: "Run BFS"

```
User clicks "▶ Run" button
    ↓
HTML onclick="runAlgo()"
    ↓
animation.js: runAlgo()
    ├─ stopAnim()
    ├─ setTbState('Running…')
    ├─ bfs.js: animState = initBFS()
    │   ├─ helpers.js: neighbors(sr, sc, mode)  [setup frontier]
    │   └─ Return { algo, visitedSet, frontierSet, step() }
    └─ setInterval( () => {
        const done = stepAnim();
        if (done) setTbState('Done', 'var(--green)');
      }, animDelay);

Each interval fires:
    ↓
animation.js: stepAnim()
    ├─ animState.step()  [from bfs.js]
    │   ├─ neighbors()  [from helpers.js]
    │   └─ Return true/false
    ├─ canvas.js: draw({visitedSet, frontierSet, pathSet, path, algo})
    │   ├─ drawOn(mc, ctx, vizState)
    │   │   ├─ baseCS()  [calc cell size]
    │   │   ├─ Loop cells: drawRect (wall, open, S, G colors)
    │   │   ├─ If vizState: overlay visited, frontier, path
    │   │   └─ Redraw S/G on top
    │   ├─ If compMode: drawOn(mc2, ctx2, lastOvViz2)
    │   └─ lastOvViz = vizState
    ├─ helpers.js: updateOverlay(visited_count, queue_size, cost)
    ├─ helpers.js: setProgress(pct)
    └─ If done: setStats(...), setProgress(100), draw(final_state)

When goal found: animState.step() returns true
    ↓
clearInterval(animTimer)
setTbState('Done', 'var(--green)')
```

---

## How Zoom & Pan Works

**State Variables:**
- `vx, vy` — viewport offset (world coordinates to translate)
- `vs` — viewport scale
- `minScale` — clamp zoom to prevent too-small cells

**Zoom Formula:**
```javascript
// In canvas context setup (canvas.js, drawOn):
ctx.translate(vx, vy);
ctx.scale(vs, vs);
// Now draw operations are in "zoomed" space
```

**Pan on Zoom:**
```javascript
// When zooming toward cursor at (mx, my):
vx = mx - (mx - vx) * (newScale / oldScale);
vy = my - (my - vy) * (newScale / oldScale);
// This keeps cursor position stable
```

**Reset View:**
```javascript
// Center maze in pane, zoom = 1
vx = (paneWidth - G.cols * baseCS) / 2;
vy = (paneHeight - G.rows * baseCS) / 2;
vs = 1.0;
```

---

## State Flow Diagram

```
┌─ HTML index.html
│
├─ Loads: style.css (styling)
│
├─ Loads JS in order:
│  1. state.js           (defines globals)
│  2. helpers.js         (defines utilities)
│  3. canvas.js          (defines draw functions)
│  4. maze-gen.js        (defines generation)
│  5. cell-edit.js       (attaches listeners)
│  6. bfs.js             (defines BFS)
│  7. dijkstra.js        (defines Dijkstra + MinHeap)
│  8. animation.js       (defines animation loop)
│  9. flow.js            (defines flow algorithm)
│  10. mst.js            (defines MST algorithm)
│  11. save.js           (defines export)
│  12. compare.js        (defines compare mode)
│  13. init.js           (calls generateMaze on load)
│
├─ User Interaction:
│  • Sliders → generateMaze() → updates G, draw()
│  • Algo tabs → selectAlgo() → resetViz()
│  • Run button → runAlgo() → animTimer loop
│  • Mouse → handleCellClick() or pan/zoom → draw()
│  • Compare button → toggleCompare() → dual-panel mode
│
└─ Result: Interactive maze solver with real-time animation
```

---

## Key Design Patterns

### 1. **Separation of Concerns**
Each module handles one responsibility:
- **Data (state.js)** — What
- **Utilities (helpers.js)** — How (reusable operations)
- **Rendering (canvas.js)** — Display
- **Algorithms (bfs.js, dijkstra.js, etc.)** — Logic

### 2. **Stateful Stepping**
Algorithms return a `state` object with a `step()` method. This allows:
- Single step execution for debugging
- Animation with variable speed
- Easy pause/resume

### 3. **Dual Canvas Rendering**
`drawOn(canvas, context, vizState)` is parametrized:
- Same function renders both Panel A and Panel B
- Reused by compare mode

### 4. **Event-Driven UI**
Mouse/keyboard events trigger functions that update state, then `draw()`:
```
Event → State Mutation → draw() → screen update
```

### 5. **Grid Coordinate Encoding**
`k(r, c)` encodes [row, col] as string "r,c" for Set/Object keys:
- Avoids array comparison issues
- `fromK()` reverses it

---

## Performance Considerations

1. **Batch Processing** — Algorithms process N cells per animation frame (not 1):
   ```javascript
   const batch = Math.max(1, Math.floor(G.rows * G.cols / 300));
   for (let b = 0; b < batch; b++) { /* step */ }
   ```
   Keeps 60 FPS smooth even on large mazes.

2. **MinHeap** — Dijkstra uses binary heap (O(log n)) not linear search.

3. **Canvas Transform** — Single `translate() + scale()` per frame, not per-cell.

4. **Set-Based Lookups** — O(1) membership tests for visited, frontier.

5. **String Key Caching** — `k()` called once per cell, reused in sets.

---

## Extending the Code

### To Add a New Maze Generation Algorithm:
1. Create function in `maze-gen.js`: `function genNewAlgo(rows, cols) { ... }`
2. Fill `G.cells[r][c]` with 'X', 'S', 'G', or '1-9'
3. Add option to HTML `<select id="sel-gen">`
4. Add case to `generateMaze()`: `else if (gen === 'newalgo') genNewAlgo(rows, cols);`

### To Add a New Pathfinding Algorithm:
1. Create new file `js/newalgo.js` with `function initNewAlgo() { return state; }`
2. `state` must have: `{ algo, visitedSet, frontierSet, pathSet, step() }`
3. Add button to HTML algo tabs
4. Import in `index.html`: `<script src="js/newalgo.js"></script>`
5. Add case in `animation.js`: `else if (algo === 'newalgo') animState = initNewAlgo();`

### To Modify Cost Model:
Edit `dijkstra.js` step function, where `ec` (edge cost) is calculated based on `costModel`.

---

## Common Issues & Debugging

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Maze not rendering | Canvas not initialized | Check `mc = document.getElementById('mc')` in canvas.js |
| Animations stuck | `animTimer` not cleared | Ensure `stopAnim()` called before `setInterval` |
| Wrong zoom center | Pan/zoom math off | Verify `vx = mx - (mx - vx) * ratio` in cell-edit.js |
| Compare mode blank | mc2 not initialized | `toggleCompare()` initializes mc2 on first click |
| Results not saving | Blob/download API missing | Check browser dev console for errors |

