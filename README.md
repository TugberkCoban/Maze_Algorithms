# Maze Algorithm Control Panel

An interactive, browser-based maze generation and algorithm visualisation tool.

## Getting Started

Open `index.html` via a local web server (Live Server, Five Server, etc.).  
> ⚠️ Opening directly with `file://` may block JS module loading in some browsers; a server is recommended.

---

## File Structure

```
├── index.html          # Main HTML structure
├── style.css           # All CSS styles
└── js/
    ├── state.js        # Global state variables
    ├── helpers.js      # Utility functions (cellVal, neighbors, setStats…)
    ├── canvas.js       # Canvas render engine (drawOn, draw, drawArrow)
    ├── maze-gen.js     # Maze generation algorithms
    ├── cell-edit.js    # Mouse wall-editing & pan/zoom events
    ├── bfs.js          # BFS algorithm
    ├── dijkstra.js     # Dijkstra + MinHeap
    ├── animation.js    # Animation engine & algorithm selector
    ├── flow.js         # Max Flow — Edmonds-Karp (BFS-based)
    ├── mst.js          # MST — Kruskal + Union-Find
    ├── save.js         # output.txt download
    ├── compare.js      # Side-by-side comparison mode (Panel B)
    └── init.js         # On-load initialisation
```

---

## Features

### Maze Generation
| Algorithm | Description |
|-----------|-------------|
| Recursive DFS | Long, winding corridors |
| Randomized Prim | Sparse structure, many dead ends |
| Randomized Kruskal | Uniformly random maze |
| Guaranteed Path | Always solvable — a valid path is carved |
| Custom Text | Paste a grid using `S`, `G`, `X`, `1-9` |

### Solving Algorithms
| Algorithm | Mode | Description |
|-----------|------|-------------|
| BFS | Animated | Shortest path (step count) |
| Dijkstra | Animated | Minimum-cost path (3 cost models) |
| Max Flow | Instant | Edmonds-Karp; maximum flow from G → S |
| MST | Instant | Kruskal; minimum spanning tree of S's connected component |

### Dijkstra Cost Models
- **Model 1** — Entering cost: `value(v)`
- **Model 2** — Leaving cost: `value(u)`
- **Model 3** — Combined: `value(u) + value(v)`

### Controls
- **Left-click / drag** — Toggle wall on cell
- **Right-click + drag** — Pan the viewport
- **Scroll wheel** — Zoom in/out towards cursor
- **Compare mode** — Run two algorithms side by side

### Saving Results
Click **Save Results** to download BFS and Dijkstra outputs as `output.txt`.

---

## Technical Notes

- All algorithms are implemented from scratch in vanilla JS — no external libraries.
- Dijkstra uses a binary min-heap for O(log n) operations.
- BFS and Dijkstra animations use an auto-scaled batch size based on maze dimensions for smooth playback.
- In compare mode both panels share the same pan/zoom state.
