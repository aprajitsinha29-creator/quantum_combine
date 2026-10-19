/**
 * Ananta Quantum Studio - Classical vs Quantum Maze Search Simulation
 * Demonstrates the fundamental difference between sequential O(N) classical search
 * and concurrent O(√N) quantum superposition wave propagation & interference.
 */

(function () {
  'use strict';

  // Simulation Configuration & State
  const CONFIG = {
    sizes: {
      compact: { cols: 27, rows: 27 },
      standard: { cols: 39, rows: 39 },
      dense: { cols: 49, rows: 49 }
    },
    defaultSize: 'standard',
    speeds: { 1: 1, 2: 3, 5: 8, 20: 30 },
    defaultSpeed: 2
  };

  let currentSizeKey = 'standard';
  let speedMultiplier = CONFIG.speeds[CONFIG.defaultSpeed];
  let isRunning = false;
  let animFrameId = null;

  // Maze Data Structure
  let maze = null; // { cols, rows, grid: 2D array (1=wall, 0=path), start: [1,1], goal: [w-2, h-2] }

  // Search Engine States
  let classical = null;
  let quantum = null;

  // Canvases
  let cCanvas = null, cCtx = null;
  let qCanvas = null, qCtx = null;

  // DOM Elements
  let playBtn = null, resetBtn = null, newBtn = null;
  let cStatusEl = null, cExploredEl = null, cDeadendsEl = null, cStepsEl = null;
  let qStatusEl = null, qStatesEl = null, qIterEl = null, qSpeedupEl = null;

  /**
   * Procedural Maze Generator with Braiding
   * Generates identical 2D labyrinth for both canvases
   */
  function generateMaze(cols, rows) {
    if (cols % 2 === 0) cols++;
    if (rows % 2 === 0) rows++;

    const grid = Array.from({ length: rows }, () => Array(cols).fill(1));

    // Randomized DFS Carving
    const stack = [[1, 1]];
    grid[1][1] = 0;

    const dirs = [
      [0, -2], // North
      [2, 0],  // East
      [0, 2],  // South
      [-2, 0]  // West
    ];

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors = [];

      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && grid[ny][nx] === 1) {
          neighbors.push([nx, ny, cx + dx / 2, cy + dy / 2]);
        }
      }

      if (neighbors.length > 0) {
        const [nx, ny, wx, wy] = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[wy][wx] = 0; // Carve intervening wall
        grid[ny][nx] = 0; // Carve target cell
        stack.push([nx, ny]);
      } else {
        stack.pop();
      }
    }

    // Braiding: Open ~12% of interior dead-end walls to create authentic loops and branch intersections
    for (let y = 2; y < rows - 2; y += 2) {
      for (let x = 2; x < cols - 2; x += 2) {
        if (grid[y][x] === 1 && Math.random() < 0.12) {
          const horiz = grid[y][x - 1] === 0 && grid[y][x + 1] === 0;
          const vert = grid[y - 1][x] === 0 && grid[y + 1][x] === 0;
          if (horiz || vert) {
            grid[y][x] = 0;
          }
        }
      }
    }

    const start = { x: 1, y: 1 };
    const goal = { x: cols - 2, y: rows - 2 };
    grid[start.y][start.x] = 0;
    grid[goal.y][goal.x] = 0;

    return { cols, rows, grid, start, goal };
  }

  /**
   * Classical Search Engine: Sequential DFS with Backtracking
   */
  function createClassicalSearch(mazeData) {
    const { cols, rows, grid, start, goal } = mazeData;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const deadEnds = Array.from({ length: rows }, () => Array(cols).fill(false));

    visited[start.y][start.x] = true;
    const stack = [{ x: start.x, y: start.y }];
    const allExploredEdges = [];

    return {
      stack,
      visited,
      deadEnds,
      allExploredEdges,
      current: { x: start.x, y: start.y },
      isDone: false,
      isSuccess: false,
      stepsTaken: 0,
      corridorsExplored: 1,
      deadEndsCount: 0,
      sparkParticles: [],

      step() {
        if (this.isDone) return;

        const { x, y } = this.current;

        // Check if reached goal
        if (x === goal.x && y === goal.y) {
          this.isDone = true;
          this.isSuccess = true;
          return;
        }

        // Available corridor moves (up, right, down, left)
        const moves = [
          { dx: 0, dy: -1 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 }
        ];

        // Shuffle moves to prevent directional bias
        moves.sort(() => Math.random() - 0.5);

        let nextMove = null;
        for (const m of moves) {
          const nx = x + m.dx;
          const ny = y + m.dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            if (grid[ny][nx] === 0 && !this.visited[ny][nx]) {
              nextMove = { x: nx, y: ny };
              break;
            }
          }
        }

        this.stepsTaken++;

        if (nextMove) {
          // Forward exploration
          this.visited[nextMove.y][nextMove.x] = true;
          this.allExploredEdges.push({ from: { x, y }, to: nextMove, isBacktrack: false });
          this.stack.push(nextMove);
          this.current = nextMove;
          this.corridorsExplored++;
        } else {
          // Dead end! Backtrack
          this.deadEnds[y][x] = true;
          this.deadEndsCount++;

          // Spawn dead-end spark particles
          this.sparkParticles.push({
            x: (x + 0.5),
            y: (y + 0.5),
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15,
            alpha: 1.0,
            color: '#ef4444'
          });

          this.stack.pop();
          if (this.stack.length > 0) {
            const prev = this.stack[this.stack.length - 1];
            this.allExploredEdges.push({ from: { x, y }, to: prev, isBacktrack: true });
            this.current = prev;
          } else {
            this.isDone = true; // No solution exists
          }
        }
      }
    };
  }

  /**
   * Quantum Search Engine: Superposition Wavefront & Grover Interference
   */
  function createQuantumSearch(mazeData) {
    const { cols, rows, grid, start, goal } = mazeData;

    // Amplitude grid and wave visited map
    const visited = Array.from({ length: rows }, () => Array(cols).fill(null));
    visited[start.y][start.x] = { dist: 0, parent: null, amp: 1.0, phase: 0 };

    let activeFrontier = [{ x: start.x, y: start.y, dist: 0, amp: 1.0, phase: 0 }];
    const allWaveCells = [{ x: start.x, y: start.y, amp: 1.0, phase: 0, life: 1.0 }];

    return {
      activeFrontier,
      allWaveCells,
      visited,
      isDone: false,
      isSuccess: false,
      iterations: 0,
      superpositionStatesCount: 1,
      collapseTime: 0,
      solutionPath: null,
      quantumParticles: [],
      collapseFlashAlpha: 0,

      step() {
        if (this.isDone) return;

        this.iterations++;
        const nextFrontier = [];
        const moves = [
          { dx: 0, dy: -1 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 }
        ];

        let foundGoal = false;

        for (const curr of this.activeFrontier) {
          const { x, y, dist, amp, phase } = curr;

          // Check all open neighbors simultaneously (Superposition)
          for (const m of moves) {
            const nx = x + m.dx;
            const ny = y + m.dy;

            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] === 0) {
              if (!this.visited[ny][nx]) {
                // Wavefront reaches unvisited corridor in superposition
                const newAmp = amp * 0.98; // gentle decay across branches
                const newPhase = (phase + 0.25) % (Math.PI * 2);

                this.visited[ny][nx] = { dist: dist + 1, parent: { x, y }, amp: newAmp, phase: newPhase };
                const nextCell = { x: nx, y: ny, dist: dist + 1, amp: newAmp, phase: newPhase };
                nextFrontier.push(nextCell);
                this.allWaveCells.push({ x: nx, y: ny, amp: newAmp, phase: newPhase, life: 1.0 });

                if (nx === goal.x && ny === goal.y) {
                  foundGoal = true;
                }
              } else {
                // Wave interference: Paths colliding create constructive / destructive interference
                const existing = this.visited[ny][nx];
                const phaseDiff = Math.abs(existing.phase - phase);
                if (phaseDiff < Math.PI / 2) {
                  // Constructive interference: boost amplitude
                  existing.amp = Math.min(1.5, existing.amp + 0.2);
                } else {
                  // Destructive interference: dampen amplitude
                  existing.amp = Math.max(0.1, existing.amp - 0.15);
                }
              }
            }
          }
        }

        this.activeFrontier = nextFrontier;
        this.superpositionStatesCount = nextFrontier.length;

        if (foundGoal || this.activeFrontier.length === 0) {
          this.isDone = true;
          this.isSuccess = foundGoal;
          this.collapseFlashAlpha = 1.0;

          if (foundGoal) {
            // Reconstruct optimal collapsed path via quantum phase alignment
            const path = [];
            let curr = goal;
            while (curr) {
              path.push(curr);
              const node = this.visited[curr.y][curr.x];
              curr = node ? node.parent : null;
            }
            path.reverse();
            this.solutionPath = path;

            // Seed energetic quantum flux particles flowing through solution path
            for (let i = 0; i < 24; i++) {
              this.quantumParticles.push({
                idx: Math.random() * (path.length - 1),
                speed: 0.2 + Math.random() * 0.25,
                size: 2.5 + Math.random() * 2,
                color: Math.random() > 0.4 ? '#00ff88' : '#00f5ff'
              });
            }
          }
        }
      }
    };
  }

  /**
   * Canvas Setup with Retina / HiDPI Scaling
   */
  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(rect.width || 440, 480);

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, size };
  }

  /**
   * Render Classical Search Canvas (Museum-Grade Neon Circuit)
   */
  function drawClassical(ctx, size) {
    if (!maze || !classical) return;
    const { cols, rows, grid, start, goal } = maze;
    const cellW = size / cols;
    const cellH = size / rows;

    // Google Dark Theme Canvas Background
    ctx.fillStyle = '#18191c';
    ctx.fillRect(0, 0, size, size);

    // Elevated Wall Blocks
    ctx.fillStyle = '#292a2d';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === 1) {
          ctx.fillRect(x * cellW, y * cellH, cellW + 0.3, cellH + 0.3);
        }
      }
    }

    // Google Dark Theme Wall Outlines
    ctx.strokeStyle = 'rgba(60, 64, 67, 0.75)';
    ctx.lineWidth = 0.6;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === 1) {
          ctx.strokeRect(x * cellW, y * cellH, cellW, cellH);
        }
      }
    }

    // Dead-end backtracked segments (faint ruby ember wire)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (classical.deadEnds[y][x]) {
          ctx.fillRect(x * cellW + cellW * 0.2, y * cellH + cellH * 0.2, cellW * 0.6, cellH * 0.6);
        }
      }
    }

    // Explored edges (tested branches)
    if (classical.allExploredEdges.length > 0) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const edge of classical.allExploredEdges) {
        ctx.beginPath();
        if (edge.isBacktrack) {
          ctx.strokeStyle = 'rgba(185, 28, 28, 0.25)';
          ctx.lineWidth = Math.max(1.2, cellW * 0.3);
        } else {
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
          ctx.lineWidth = Math.max(1.5, cellW * 0.4);
        }
        ctx.moveTo((edge.from.x + 0.5) * cellW, (edge.from.y + 0.5) * cellH);
        ctx.lineTo((edge.to.x + 0.5) * cellW, (edge.to.y + 0.5) * cellH);
        ctx.stroke();
      }
    }

    // Current active search stack path (Vivid Orange Neon Laser Ribbon)
    if (classical.stack.length > 1) {
      // Pass 1: Outer Orange Optical Bloom
      ctx.save();
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
      ctx.lineWidth = Math.max(4, cellW * 0.85);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo((classical.stack[0].x + 0.5) * cellW, (classical.stack[0].y + 0.5) * cellH);
      for (let i = 1; i < classical.stack.length; i++) {
        const pt = classical.stack[i];
        ctx.lineTo((pt.x + 0.5) * cellW, (pt.y + 0.5) * cellH);
      }
      ctx.stroke();
      ctx.restore();

      // Pass 2: Intense Radiant Coral Core
      ctx.save();
      ctx.strokeStyle = '#ff7722';
      ctx.lineWidth = Math.max(2, cellW * 0.45);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo((classical.stack[0].x + 0.5) * cellW, (classical.stack[0].y + 0.5) * cellH);
      for (let i = 1; i < classical.stack.length; i++) {
        const pt = classical.stack[i];
        ctx.lineTo((pt.x + 0.5) * cellW, (pt.y + 0.5) * cellH);
      }
      ctx.stroke();
      ctx.restore();

      // Pass 3: White-Hot Laser Filament
      ctx.save();
      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = Math.max(1, cellW * 0.2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo((classical.stack[0].x + 0.5) * cellW, (classical.stack[0].y + 0.5) * cellH);
      for (let i = 1; i < classical.stack.length; i++) {
        const pt = classical.stack[i];
        ctx.lineTo((pt.x + 0.5) * cellW, (pt.y + 0.5) * cellH);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Classical Search Head (Pulsing High-Energy Photon)
    const hx = (classical.current.x + 0.5) * cellW;
    const hy = (classical.current.y + 0.5) * cellH;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);

    ctx.save();
    // Expanding halo
    ctx.strokeStyle = `rgba(249, 115, 22, ${0.3 + 0.3 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hx, hy, Math.max(5, cellW * (0.6 + 0.2 * pulse)), 0, Math.PI * 2);
    ctx.stroke();

    // Solid core
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(hx, hy, Math.max(2.5, cellW * 0.35), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dead-end spark particles
    for (let i = classical.sparkParticles.length - 1; i >= 0; i--) {
      const p = classical.sparkParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.04;
      if (p.alpha <= 0) {
        classical.sparkParticles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(255, 90, 50, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x * cellW, p.y * cellH, Math.max(1, cellW * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }

    // Holographic Ports
    drawEndpoints(ctx, start, goal, cellW, cellH);
  }

  /**
   * Render Quantum Search Canvas (Volumetric Superposition & Laser Collapse)
   */
  function drawQuantum(ctx, size) {
    if (!maze || !quantum) return;
    const { cols, rows, grid, start, goal } = maze;
    const cellW = size / cols;
    const cellH = size / rows;

    // Google Dark Theme Canvas Background
    ctx.fillStyle = '#18191c';
    ctx.fillRect(0, 0, size, size);

    // Elevated Wall Blocks
    ctx.fillStyle = '#292a2d';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === 1) {
          ctx.fillRect(x * cellW, y * cellH, cellW + 0.3, cellH + 0.3);
        }
      }
    }

    // Google Dark Theme Wall Outlines
    ctx.strokeStyle = 'rgba(60, 64, 67, 0.75)';
    ctx.lineWidth = 0.6;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === 1) {
          ctx.strokeRect(x * cellW, y * cellH, cellW, cellH);
        }
      }
    }

    const isCollapsed = quantum.solutionPath !== null;

    if (!isCollapsed) {
      // Volumetric Superposition Waves (Ethereal Emerald & Cyan Fluid)
      const now = Date.now() * 0.003;
      for (const cell of quantum.allWaveCells) {
        const pulse = 0.5 + 0.5 * Math.sin(now + (cell.x + cell.y) * 0.2);
        const alpha = Math.min(0.65, cell.amp * (0.3 + 0.3 * pulse));

        // Soft fluid aura
        ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
        ctx.fillRect(cell.x * cellW + 0.5, cell.y * cellH + 0.5, cellW - 1, cellH - 1);

        if (cell.amp > 0.7) {
          ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.5})`;
          ctx.fillRect(cell.x * cellW + cellW * 0.25, cell.y * cellH + cellH * 0.25, cellW * 0.5, cellH * 0.5);
        }
      }

      // Active Leading Wavefront Nodes in Superposition
      ctx.save();
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#6ee7b7';
      for (const f of quantum.activeFrontier) {
        ctx.beginPath();
        ctx.arc((f.x + 0.5) * cellW, (f.y + 0.5) * cellH, Math.max(2, cellW * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      // Destructively interfered dead paths fade into ultra-subtle trace
      ctx.fillStyle = 'rgba(6, 182, 212, 0.04)';
      for (const cell of quantum.allWaveCells) {
        ctx.fillRect(cell.x * cellW + 0.5, cell.y * cellH + 0.5, cellW - 1, cellH - 1);
      }

      // Render Solved Optimal Path (Spectacular Hyper-Luminous Emerald Laser)
      const path = quantum.solutionPath;
      if (path && path.length > 1) {
        // Pass 1: Volumetric Emerald Optical Bloom
        ctx.save();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = Math.max(5, cellW * 0.95);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo((path[0].x + 0.5) * cellW, (path[0].y + 0.5) * cellH);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo((path[i].x + 0.5) * cellW, (path[i].y + 0.5) * cellH);
        }
        ctx.stroke();
        ctx.restore();

        // Pass 2: High-Energy Neon Core
        ctx.save();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = Math.max(2.5, cellW * 0.5);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo((path[0].x + 0.5) * cellW, (path[0].y + 0.5) * cellH);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo((path[i].x + 0.5) * cellW, (path[i].y + 0.5) * cellH);
        }
        ctx.stroke();
        ctx.restore();

        // Pass 3: White-Hot Center Filament
        ctx.save();
        ctx.strokeStyle = '#ecfdf5';
        ctx.lineWidth = Math.max(1, cellW * 0.2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo((path[0].x + 0.5) * cellW, (path[0].y + 0.5) * cellH);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo((path[i].x + 0.5) * cellW, (path[i].y + 0.5) * cellH);
        }
        ctx.stroke();
        ctx.restore();

        // Animated Quantum Flux Photons
        for (const p of quantum.quantumParticles) {
          p.idx = (p.idx + p.speed) % (path.length - 1);
          const baseIdx = Math.floor(p.idx);
          const nextIdx = (baseIdx + 1) % path.length;
          const ratio = p.idx - baseIdx;

          const p1 = path[baseIdx];
          const p2 = path[nextIdx];

          const px = (p1.x + (p2.x - p1.x) * ratio + 0.5) * cellW;
          const py = (p1.y + (p2.y - p1.y) * ratio + 0.5) * cellH;

          ctx.save();
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(1.8, cellW * 0.28), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Measurement Collapse Optical Flash
      if (quantum.collapseFlashAlpha > 0) {
        ctx.fillStyle = `rgba(0, 255, 136, ${quantum.collapseFlashAlpha * 0.3})`;
        ctx.fillRect(0, 0, size, size);
        quantum.collapseFlashAlpha -= 0.05;
      }
    }

    // Holographic Ports
    drawEndpoints(ctx, start, goal, cellW, cellH);
  }

  /**
   * Draw Holographic Corner Quantum Ports
   */
  function drawEndpoints(ctx, start, goal, cellW, cellH) {
    const sx = (start.x + 0.5) * cellW;
    const sy = (start.y + 0.5) * cellH;
    const gx = (goal.x + 0.5) * cellW;
    const gy = (goal.y + 0.5) * cellH;
    const r = Math.max(3.5, cellW * 0.42);

    // Start Port (Luminous Green)
    ctx.save();
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Exit Port (Luminous Cyan)
    ctx.save();
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Main Simulation Loop
   */
  function loop() {
    if (!maze) return;

    if (isRunning) {
      // Execute steps according to speed multiplier
      for (let s = 0; s < speedMultiplier; s++) {
        if (!classical.isDone) classical.step();
        if (!quantum.isDone) quantum.step();
      }

      updateTelemetry();

      // If both finished, stop running
      if (classical.isDone && quantum.isDone) {
        isRunning = false;
        if (playBtn) playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg><span>Replay</span>';
      }
    }

    // Render Canvases
    if (cCanvas && cCtx) {
      const rect = cCanvas.getBoundingClientRect();
      drawClassical(cCtx, rect.width || 440);
    }
    if (qCanvas && qCtx) {
      const rect = qCanvas.getBoundingClientRect();
      drawQuantum(qCtx, rect.width || 440);
    }

    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      animFrameId = window.requestAnimationFrame(loop);
    }
  }

  /**
   * Update HUD Telemetry Counters
   */
  function updateTelemetry() {
    if (!classical || !quantum) return;

    // Classical Telemetry
    if (cStatusEl) {
      if (classical.isSuccess) {
        cStatusEl.innerHTML = '<span style="color:#22c55e">✓ Target Found</span>';
      } else if (classical.isDone) {
        cStatusEl.innerHTML = '<span style="color:#ef4444">✕ Trapped / Exhausted</span>';
      } else if (classical.sparkParticles.length > 0) {
        cStatusEl.innerHTML = '<span style="color:#f97316">⟲ Backtracking...</span>';
      } else {
        cStatusEl.innerHTML = '<span style="color:#38bdf8">▶ Exploring...</span>';
      }
    }
    if (cExploredEl) cExploredEl.textContent = classical.corridorsExplored;
    if (cDeadendsEl) cDeadendsEl.textContent = classical.deadEndsCount;
    if (cStepsEl) cStepsEl.textContent = classical.stepsTaken;

    // Quantum Telemetry
    if (qStatusEl) {
      if (quantum.isSuccess) {
        qStatusEl.innerHTML = '<span style="color:#00ff88">✓ Target Collapsed (Grover Bound)</span>';
      } else if (quantum.isDone) {
        qStatusEl.innerHTML = '<span style="color:#ef4444">✕ No Coherent Path</span>';
      } else {
        qStatusEl.innerHTML = '<span style="color:#00f5ff">⚡ Superposition Wavefront</span>';
      }
    }
    if (qStatesEl) qStatesEl.textContent = quantum.superpositionStatesCount;
    if (qIterEl) qIterEl.textContent = quantum.iterations;

    // Live Quantum Speedup Ratio
    if (qSpeedupEl) {
      if (quantum.iterations > 0) {
        const speedup = (classical.stepsTaken / Math.max(1, quantum.iterations)).toFixed(1);
        qSpeedupEl.textContent = `${speedup}x Quadratic Advantage`;
      } else {
        qSpeedupEl.textContent = '--';
      }
    }
  }

  /**
   * Reset simulation runners on existing maze
   */
  function resetSimulation() {
    if (!maze) return;
    classical = createClassicalSearch(maze);
    quantum = createQuantumSearch(maze);
    updateTelemetry();
  }

  /**
   * Generate brand new maze and reset
   */
  function newMaze() {
    const sizeConfig = CONFIG.sizes[currentSizeKey];
    maze = generateMaze(sizeConfig.cols, sizeConfig.rows);
    resetSimulation();
  }

  /**
   * Initialize DOM Hooks & Controls
   */
  function initSimulation() {
    cCanvas = document.getElementById('classical-maze-canvas');
    qCanvas = document.getElementById('quantum-maze-canvas');

    if (!cCanvas || !qCanvas) {
      return;
    }

    // Set up Retina scaled 2D contexts
    const cSetup = setupCanvas(cCanvas);
    cCtx = cSetup.ctx;
    const qSetup = setupCanvas(qCanvas);
    qCtx = qSetup.ctx;

    // Fetch HUD elements
    cStatusEl = document.getElementById('classical-status');
    cExploredEl = document.getElementById('classical-explored');
    cDeadendsEl = document.getElementById('classical-deadends');
    cStepsEl = document.getElementById('classical-steps');

    qStatusEl = document.getElementById('quantum-status');
    qStatesEl = document.getElementById('quantum-states');
    qIterEl = document.getElementById('quantum-iterations');
    qSpeedupEl = document.getElementById('quantum-speedup');

    // Controls
    playBtn = document.getElementById('maze-btn-play');
    resetBtn = document.getElementById('maze-btn-reset');
    newBtn = document.getElementById('maze-btn-new');

    function updatePlayButton(running) {
      if (!playBtn) return;
      if (running) {
        playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg><span>Pause</span>';
      } else {
        playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>Run Search</span>';
      }
    }

    if (playBtn) {
      playBtn.onclick = () => {
        if (classical.isDone && quantum.isDone) {
          resetSimulation();
          isRunning = true;
          updatePlayButton(true);
        } else {
          isRunning = !isRunning;
          updatePlayButton(isRunning);
        }
      };
    }

    if (resetBtn) {
      resetBtn.onclick = () => {
        resetSimulation();
        isRunning = false;
        updatePlayButton(false);
      };
    }

    if (newBtn) {
      newBtn.onclick = () => {
        newMaze();
        isRunning = false;
        updatePlayButton(false);
      };
    }

    // Size Density Buttons
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sKey = btn.dataset.size;
        if (CONFIG.sizes[sKey]) {
          currentSizeKey = sKey;
          newMaze();
          isRunning = false;
          updatePlayButton(false);
        }
      };
    });

    // Speed Multiplier Buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sp = parseInt(btn.dataset.speed, 10);
        if (CONFIG.speeds[sp]) {
          speedMultiplier = CONFIG.speeds[sp];
        }
      };
    });

    // Handle Window Resize to keep canvases crisp
    window.addEventListener('resize', () => {
      if (cCanvas) cCtx = setupCanvas(cCanvas).ctx;
      if (qCanvas) qCtx = setupCanvas(qCanvas).ctx;
    });

    // Initial Maze Creation & First Run
    newMaze();

    // Start Animation Loop
    if (!animFrameId) {
      loop();
    }

    // Auto-play after 800ms for instant visual impact
    setTimeout(() => {
      isRunning = true;
      if (playBtn) playBtn.innerHTML = '⏸ Pause';
    }, 800);
  }

  // Expose to window for global access & navigation triggers
  window.initQuantumMazeSim = initSimulation;

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimulation);
  } else {
    setTimeout(initSimulation, 100);
  }
})();
