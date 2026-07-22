// DeerWorld 2-Player Co-op Level Editor Engine
(function() {
  // --- DOM Elements ---
  const canvas = document.getElementById('editor-canvas');
  const ctx = canvas.getContext('2d');
  const viewport = document.getElementById('viewport');

  const btnModeEdit = document.getElementById('btn-mode-edit');
  const btnModePlay = document.getElementById('btn-mode-play');
  const btnResetPlay = document.getElementById('btn-reset-play');
  const chkGridSnap = document.getElementById('chk-grid-snap');
  const selGridSize = document.getElementById('sel-grid-size');

  const btnTemplate = document.getElementById('btn-template');
  const btnClear = document.getElementById('btn-clear');
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');

  const toolBtns = document.querySelectorAll('.tool-btn');
  const inpStageW = document.getElementById('inp-stage-w');
  const inpStageH = document.getElementById('inp-stage-h');
  const inspectorContent = document.getElementById('inspector-content');
  const playtestHud = document.getElementById('playtest-hud');
  const hudStatus = document.getElementById('hud-status');

  const jsonModal = document.getElementById('json-modal');
  const modalTitle = document.getElementById('modal-title');
  const jsonText = document.getElementById('json-text');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCopyJson = document.getElementById('btn-copy-json');
  const btnDownloadJson = document.getElementById('btn-download-json');
  const btnApplyJson = document.getElementById('btn-apply-json');
  const btnCancelModal = document.getElementById('btn-cancel-modal');

  // --- Editor State ---
  let mode = 'edit'; // 'edit' or 'play'
  let currentTool = 'select'; // 'select', 'platform', 'spring', 'plate', 'key', 'lock', 'p1_spawn', 'p2_spawn', 'goal'
  let selectedObject = null;
  let isDraggingObj = false;
  let isResizingObj = false;
  let isDrawingPlatform = false;
  let drawStartX = 0, drawStartY = 0, drawCurrentX = 0, drawCurrentY = 0;
  let dragOffsetX = 0, dragOffsetY = 0;
  let nextIdCounter = 1;

  // Level Data
  let level = {
    name: 'Co-op Puzzle Level',
    width: 2400,
    height: 800,
    spawnP1: { x: 100, y: 700 },
    spawnP2: { x: 160, y: 700 },
    platforms: [],
    springs: [],
    plates: [],
    keys: [],
    locks: [],
    goal: { x: 2200, y: 660, w: 80, h: 100 }
  };

  // Playtest Physics State
  let keysPressed = {};
  let p1 = { x: 100, y: 700, vx: 0, vy: 0, w: 32, h: 32, isGrounded: false, color: '#38bdf8' };
  let p2 = { x: 160, y: 700, vx: 0, vy: 0, w: 32, h: 32, isGrounded: false, color: '#f43f5e' };

  // --- Utility Functions ---
  function getSnapSize() {
    return chkGridSnap.checked ? parseInt(selGridSize.value, 10) : 1;
  }

  function snap(val) {
    const s = getSnapSize();
    return Math.round(val / s) * s;
  }

  function generateId(prefix) {
    return `${prefix}_${nextIdCounter++}`;
  }

  function resizeCanvas() {
    canvas.width = level.width;
    canvas.height = level.height;
    draw();
  }

  // --- Initial Setup ---
  function init() {
    resizeCanvas();
    loadSampleLevel();
    setupEventListeners();
    requestAnimationFrame(renderLoop);
  }

  function loadSampleLevel() {
    level = {
      name: 'Co-op Puzzle Level 1',
      width: 2400,
      height: 800,
      spawnP1: { x: 100, y: 720 },
      spawnP2: { x: 160, y: 720 },
      platforms: [
        { id: 'plat_ground_1', x: 0, y: 760, w: 750, h: 40, type: 'normal' },
        { id: 'plat_ground_2', x: 850, y: 760, w: 600, h: 40, type: 'normal' },
        { id: 'plat_ground_3', x: 1550, y: 760, w: 850, h: 40, type: 'normal' },
        { id: 'plat_high_1', x: 300, y: 620, w: 200, h: 20, type: 'normal' },
        { id: 'plat_high_2', x: 1000, y: 550, w: 250, h: 20, type: 'normal' }
      ],
      springs: [
        { id: 'spring_1', x: 680, y: 742, w: 40, h: 18, bounceForce: 1100 }
      ],
      plates: [
        { id: 'plate_1', x: 400, y: 610, w: 40, h: 10, targetLockId: 'lock_door_1', isPressed: false }
      ],
      keys: [
        { id: 'key_1', x: 1100, y: 500, w: 24, h: 24, targetLockId: 'lock_door_2', isCollected: false }
      ],
      locks: [
        { id: 'lock_door_1', x: 800, y: 600, w: 20, h: 160, lockType: 'plate', isOpen: false },
        { id: 'lock_door_2', x: 1500, y: 600, w: 20, h: 160, lockType: 'key', isOpen: false }
      ],
      goal: { x: 2220, y: 660, w: 80, h: 100 }
    };

    inpStageW.value = level.width;
    inpStageH.value = level.height;
    resizeCanvas();
    resetPlaytestState();
    selectObject(null);
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    inpStageW.addEventListener('change', () => {
      level.width = Math.max(800, parseInt(inpStageW.value, 10) || 2400);
      resizeCanvas();
    });

    inpStageH.addEventListener('change', () => {
      level.height = Math.max(400, parseInt(inpStageH.value, 10) || 800);
      resizeCanvas();
    });

    // Tool Selection Buttons
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool;
        selectObject(null);
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      keysPressed[e.code] = true;
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;

      if (mode === 'edit') {
        if (e.key === 'v' || e.key === 'V') setTool('select');
        if (e.key === '1') setTool('platform');
        if (e.key === '2') setTool('spring');
        if (e.key === '3') setTool('plate');
        if (e.key === '4') setTool('key');
        if (e.key === '5') setTool('lock');
        if (e.key === '6') setTool('p1_spawn');
        if (e.key === '7') setTool('p2_spawn');
        if (e.key === '8') setTool('goal');

        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject) {
          deleteSelectedObject();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      keysPressed[e.code] = false;
    });

    // Mode Buttons
    btnModeEdit.addEventListener('click', () => setMode('edit'));
    btnModePlay.addEventListener('click', () => setMode('play'));
    btnResetPlay.addEventListener('click', () => resetPlaytestState());

    // Top Bar Buttons
    btnTemplate.addEventListener('click', () => loadSampleLevel());
    btnClear.addEventListener('click', () => {
      if (confirm('Clear all platforms and objects in this level?')) {
        level.platforms = [];
        level.springs = [];
        level.plates = [];
        level.keys = [];
        level.locks = [];
        selectObject(null);
        draw();
      }
    });

    btnExport.addEventListener('click', openExportModal);
    btnImport.addEventListener('click', openImportModal);
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);
    btnCopyJson.addEventListener('click', copyJsonToClipboard);
    btnDownloadJson.addEventListener('click', downloadJsonFile);
    btnApplyJson.addEventListener('click', applyJsonInput);

    // Canvas Mouse Handlers
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
  }

  function setTool(toolName) {
    currentTool = toolName;
    toolBtns.forEach(b => {
      if (b.dataset.tool === toolName) b.classList.add('active');
      else b.classList.remove('active');
    });
    selectObject(null);
  }

  function setMode(newMode) {
    mode = newMode;
    if (mode === 'edit') {
      btnModeEdit.classList.add('active');
      btnModePlay.classList.remove('active');
      btnResetPlay.style.display = 'none';
      playtestHud.style.display = 'none';
      canvas.style.cursor = 'crosshair';
    } else {
      btnModePlay.classList.add('active');
      btnModeEdit.classList.remove('active');
      btnResetPlay.style.display = 'inline-flex';
      playtestHud.style.display = 'flex';
      canvas.style.cursor = 'default';
      resetPlaytestState();
      selectObject(null);
    }
  }

  // --- Mouse Interaction Handlers ---
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x: Math.max(0, Math.min(level.width, x)), y: Math.max(0, Math.min(level.height, y)) };
  }

  function onMouseDown(e) {
    if (mode !== 'edit') return;
    const pos = getCanvasCoords(e);
    const snapX = snap(pos.x);
    const snapY = snap(pos.y);

    if (currentTool === 'select') {
      const clicked = findObjectAt(pos.x, pos.y);
      if (clicked) {
        selectObject(clicked);
        isDraggingObj = true;
        dragOffsetX = pos.x - clicked.obj.x;
        dragOffsetY = pos.y - clicked.obj.y;
      } else {
        selectObject(null);
      }
    } else if (currentTool === 'platform') {
      isDrawingPlatform = true;
      drawStartX = snapX;
      drawStartY = snapY;
      drawCurrentX = snapX;
      drawCurrentY = snapY;
    } else if (currentTool === 'spring') {
      const obj = { id: generateId('spring'), x: snapX - 20, y: snapY - 10, w: 40, h: 20, bounceForce: 1200 };
      level.springs.push(obj);
      selectObject({ type: 'spring', obj });
    } else if (currentTool === 'plate') {
      const obj = { id: generateId('plate'), x: snapX - 25, y: snapY - 5, w: 50, h: 10, targetLockId: '', isPressed: false };
      level.plates.push(obj);
      selectObject({ type: 'plate', obj });
    } else if (currentTool === 'key') {
      const obj = { id: generateId('key'), x: snapX - 12, y: snapY - 12, w: 24, h: 24, targetLockId: '', isCollected: false };
      level.keys.push(obj);
      selectObject({ type: 'key', obj });
    } else if (currentTool === 'lock') {
      const obj = { id: generateId('lock'), x: snapX - 10, y: snapY - 60, w: 20, h: 120, lockType: 'key', isOpen: false };
      level.locks.push(obj);
      selectObject({ type: 'lock', obj });
    } else if (currentTool === 'p1_spawn') {
      level.spawnP1 = { x: snapX, y: snapY };
      selectObject({ type: 'spawnP1', obj: level.spawnP1 });
    } else if (currentTool === 'p2_spawn') {
      level.spawnP2 = { x: snapX, y: snapY };
      selectObject({ type: 'spawnP2', obj: level.spawnP2 });
    } else if (currentTool === 'goal') {
      level.goal = { x: snapX - 40, y: snapY - 100, w: 80, h: 100 };
      selectObject({ type: 'goal', obj: level.goal });
    }
    draw();
  }

  function onMouseMove(e) {
    if (mode !== 'edit') return;
    const pos = getCanvasCoords(e);
    const snapX = snap(pos.x);
    const snapY = snap(pos.y);

    if (isDrawingPlatform) {
      drawCurrentX = snapX;
      drawCurrentY = snapY;
      draw();
    } else if (isDraggingObj && selectedObject) {
      const obj = selectedObject.obj;
      if (selectedObject.type === 'spawnP1' || selectedObject.type === 'spawnP2') {
        obj.x = snapX;
        obj.y = snapY;
      } else {
        obj.x = snap(pos.x - dragOffsetX);
        obj.y = snap(pos.y - dragOffsetY);
      }
      updateInspectorFields();
      draw();
    }
  }

  function onMouseUp(e) {
    if (mode !== 'edit') return;
    const pos = getCanvasCoords(e);
    const snapX = snap(pos.x);
    const snapY = snap(pos.y);

    if (isDrawingPlatform) {
      isDrawingPlatform = false;
      const x = Math.min(drawStartX, snapX);
      const y = Math.min(drawStartY, snapY);
      const w = Math.abs(drawStartX - snapX);
      const h = Math.abs(drawStartY - snapY);

      if (w >= 10 && h >= 10) {
        const plat = { id: generateId('plat'), x, y, w, h, type: 'normal' };
        level.platforms.push(plat);
        selectObject({ type: 'platform', obj: plat });
      }
      draw();
    }
    isDraggingObj = false;
  }

  function findObjectAt(x, y) {
    // Check Goal
    if (level.goal && pointInRect(x, y, level.goal)) return { type: 'goal', obj: level.goal };
    // Check Spawns
    if (pointInRect(x, y, { x: level.spawnP1.x - 16, y: level.spawnP1.y - 32, w: 32, h: 32 })) return { type: 'spawnP1', obj: level.spawnP1 };
    if (pointInRect(x, y, { x: level.spawnP2.x - 16, y: level.spawnP2.y - 32, w: 32, h: 32 })) return { type: 'spawnP2', obj: level.spawnP2 };
    // Check Keys
    for (let o of level.keys) { if (pointInRect(x, y, o)) return { type: 'key', obj: o }; }
    // Check Plates
    for (let o of level.plates) { if (pointInRect(x, y, o)) return { type: 'plate', obj: o }; }
    // Check Springs
    for (let o of level.springs) { if (pointInRect(x, y, o)) return { type: 'spring', obj: o }; }
    // Check Locks
    for (let o of level.locks) { if (pointInRect(x, y, o)) return { type: 'lock', obj: o }; }
    // Check Platforms
    for (let o of level.platforms) { if (pointInRect(x, y, o)) return { type: 'platform', obj: o }; }

    return null;
  }

  function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  // --- Inspector & Selection ---
  function selectObject(sel) {
    selectedObject = sel;
    renderInspector();
    draw();
  }

  function deleteSelectedObject() {
    if (!selectedObject) return;
    const { type, obj } = selectedObject;
    if (type === 'platform') level.platforms = level.platforms.filter(o => o.id !== obj.id);
    else if (type === 'spring') level.springs = level.springs.filter(o => o.id !== obj.id);
    else if (type === 'plate') level.plates = level.plates.filter(o => o.id !== obj.id);
    else if (type === 'key') level.keys = level.keys.filter(o => o.id !== obj.id);
    else if (type === 'lock') level.locks = level.locks.filter(o => o.id !== obj.id);
    selectObject(null);
    draw();
  }

  function renderInspector() {
    if (!selectedObject) {
      inspectorContent.innerHTML = `<p class="empty-state">No object selected. Click an object to inspect or select a tool on the left palette.</p>`;
      return;
    }

    const { type, obj } = selectedObject;
    let html = `<div class="prop-field"><label>Object Type</label><input type="text" value="${type.toUpperCase()}" disabled></div>`;

    if (obj.id) {
      html += `<div class="prop-field"><label>ID</label><input type="text" id="prop-id" value="${obj.id}"></div>`;
    }

    html += `
      <div class="prop-row">
        <div class="prop-field"><label>X</label><input type="number" id="prop-x" value="${Math.round(obj.x)}"></div>
        <div class="prop-field"><label>Y</label><input type="number" id="prop-y" value="${Math.round(obj.y)}"></div>
      </div>
    `;

    if (obj.w !== undefined && obj.h !== undefined) {
      html += `
        <div class="prop-row">
          <div class="prop-field"><label>Width</label><input type="number" id="prop-w" value="${Math.round(obj.w)}"></div>
          <div class="prop-field"><label>Height</label><input type="number" id="prop-h" value="${Math.round(obj.h)}"></div>
        </div>
      `;
    }

    if (type === 'spring') {
      html += `<div class="prop-field"><label>Bounce Force</label><input type="number" id="prop-bounce" value="${obj.bounceForce || 1200}"></div>`;
    } else if (type === 'plate' || type === 'key') {
      const lockOptions = level.locks.map(l => `<option value="${l.id}" ${obj.targetLockId === l.id ? 'selected' : ''}>${l.id} (${l.lockType})</option>`).join('');
      html += `
        <div class="prop-field">
          <label>Target Lock Door</label>
          <select id="prop-target-lock">
            <option value="">-- None --</option>
            ${lockOptions}
          </select>
        </div>
      `;
    } else if (type === 'lock') {
      html += `
        <div class="prop-field">
          <label>Unlock Condition</label>
          <select id="prop-lock-type">
            <option value="key" ${obj.lockType === 'key' ? 'selected' : ''}>Key Collection</option>
            <option value="plate" ${obj.lockType === 'plate' ? 'selected' : ''}>Pressure Plate</option>
          </select>
        </div>
      `;
    }

    if (type !== 'spawnP1' && type !== 'spawnP2' && type !== 'goal') {
      html += `<button id="btn-delete-obj" class="btn-danger" style="margin-top:12px; width:100%;">🗑️ Delete Object</button>`;
    }

    inspectorContent.innerHTML = html;

    // Attach Inspector Input Listeners
    const inpId = document.getElementById('prop-id');
    const inpX = document.getElementById('prop-x');
    const inpY = document.getElementById('prop-y');
    const inpW = document.getElementById('prop-w');
    const inpH = document.getElementById('prop-h');
    const inpBounce = document.getElementById('prop-bounce');
    const selTargetLock = document.getElementById('prop-target-lock');
    const selLockType = document.getElementById('prop-lock-type');
    const btnDelete = document.getElementById('btn-delete-obj');

    if (inpId) inpId.addEventListener('input', (e) => { obj.id = e.target.value; draw(); });
    if (inpX) inpX.addEventListener('input', (e) => { obj.x = parseInt(e.target.value, 10) || 0; draw(); });
    if (inpY) inpY.addEventListener('input', (e) => { obj.y = parseInt(e.target.value, 10) || 0; draw(); });
    if (inpW) inpW.addEventListener('input', (e) => { obj.w = Math.max(10, parseInt(e.target.value, 10) || 10); draw(); });
    if (inpH) inpH.addEventListener('input', (e) => { obj.h = Math.max(10, parseInt(e.target.value, 10) || 10); draw(); });
    if (inpBounce) inpBounce.addEventListener('input', (e) => { obj.bounceForce = parseInt(e.target.value, 10) || 1200; });
    if (selTargetLock) selTargetLock.addEventListener('change', (e) => { obj.targetLockId = e.target.value; draw(); });
    if (selLockType) selLockType.addEventListener('change', (e) => { obj.lockType = e.target.value; draw(); });
    if (btnDelete) btnDelete.addEventListener('click', deleteSelectedObject);
  }

  function updateInspectorFields() {
    if (!selectedObject) return;
    const { obj } = selectedObject;
    const inpX = document.getElementById('prop-x');
    const inpY = document.getElementById('prop-y');
    if (inpX) inpX.value = Math.round(obj.x);
    if (inpY) inpY.value = Math.round(obj.y);
  }

  // --- Rendering Loop ---
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Lines (if enabled)
    if (chkGridSnap.checked && mode === 'edit') {
      const gridSize = parseInt(selGridSize.value, 10);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    }

    // 1. Draw Platforms
    level.platforms.forEach(p => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(p.x, p.y, p.w, 4);
    });

    // 2. Draw Springs
    level.springs.forEach(s => {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(s.x, s.y + 6, s.w, s.h - 6);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(s.x, s.y, s.w, 6);
    });

    // 3. Draw Pressure Plates
    level.plates.forEach(p => {
      const isDown = p.isPressed;
      ctx.fillStyle = isDown ? '#15803d' : '#f59e0b';
      ctx.fillRect(p.x, p.y + (isDown ? 6 : 0), p.w, p.h - (isDown ? 6 : 0));
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(p.x + 4, p.y + (isDown ? 6 : 0), p.w - 8, 2);
    });

    // 4. Draw Keys
    level.keys.forEach(k => {
      if (k.isCollected && mode === 'play') return;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(k.x + 12, k.y + 12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#070a12';
      ctx.beginPath();
      ctx.arc(k.x + 12, k.y + 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(k.x + 10, k.y + 18, 4, 8);
    });

    // 5. Draw Locks / Doors
    level.locks.forEach(l => {
      if (l.isOpen) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(l.x, l.y, l.w, l.h);
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = l.lockType === 'key' ? '#b91c1c' : '#c2410c';
        ctx.fillRect(l.x, l.y, l.w, l.h);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(l.lockType === 'key' ? '🔑' : '🔘', l.x + l.w / 2, l.y + l.h / 2);
      }
    });

    // 6. Draw Goal Zone
    if (level.goal) {
      const g = level.goal;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(g.x, g.y, g.w, g.h);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 GOAL', g.x + g.w / 2, g.y + 24);
    }

    // 7. Draw Spawns
    if (level.spawnP1) {
      const s = level.spawnP1;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(s.x, s.y - 16, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('P1', s.x, s.y - 12);
    }

    if (level.spawnP2) {
      const s = level.spawnP2;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath(); ctx.arc(s.x, s.y - 16, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('P2', s.x, s.y - 12);
    }

    // 8. Draw ID Link Connectors (Edit Mode Only)
    if (mode === 'edit') {
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      level.plates.forEach(p => {
        if (p.targetLockId) {
          const target = level.locks.find(l => l.id === p.targetLockId);
          if (target) {
            ctx.strokeStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(p.x + p.w / 2, p.y + p.h / 2);
            ctx.lineTo(target.x + target.w / 2, target.y + target.h / 2);
            ctx.stroke();
          }
        }
      });

      level.keys.forEach(k => {
        if (k.targetLockId) {
          const target = level.locks.find(l => l.id === k.targetLockId);
          if (target) {
            ctx.strokeStyle = '#3b82f6';
            ctx.beginPath();
            ctx.moveTo(k.x + k.w / 2, k.y + k.h / 2);
            ctx.lineTo(target.x + target.w / 2, target.y + target.h / 2);
            ctx.stroke();
          }
        }
      });
      ctx.setLineDash([]);
    }

    // 9. Draw Active Selection Outline
    if (selectedObject && mode === 'edit') {
      const obj = selectedObject.obj;
      let rx = obj.x, ry = obj.y, rw = obj.w || 32, rh = obj.h || 32;
      if (selectedObject.type === 'spawnP1' || selectedObject.type === 'spawnP2') {
        rx = obj.x - 16; ry = obj.y - 32; rw = 32; rh = 32;
      }
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4);
    }

    // 10. Draw Live Platform Creation Preview
    if (isDrawingPlatform && mode === 'edit') {
      const x = Math.min(drawStartX, drawCurrentX);
      const y = Math.min(drawStartY, drawCurrentY);
      const w = Math.abs(drawStartX - drawCurrentX);
      const h = Math.abs(drawStartY - drawCurrentY);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(x, y, w, h);
    }

    // 11. Draw Playtest Players
    if (mode === 'play') {
      drawPlayerSprite(p1, 'P1');
      drawPlayerSprite(p2, 'P2');
    }
  }

  function drawPlayerSprite(p, label) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, p.x, p.y - p.h - 6);
  }

  // --- Playtest Physics Simulation ---
  const GRAVITY = 1800, MOVE_SPEED = 380, JUMP_FORCE = 750;

  function resetPlaytestState() {
    p1 = { x: level.spawnP1.x, y: level.spawnP1.y, vx: 0, vy: 0, w: 28, h: 36, isGrounded: false, color: '#38bdf8' };
    p2 = { x: level.spawnP2.x, y: level.spawnP2.y, vx: 0, vy: 0, w: 28, h: 36, isGrounded: false, color: '#f43f5e' };
    level.keys.forEach(k => k.isCollected = false);
    level.plates.forEach(p => p.isPressed = false);
    level.locks.forEach(l => l.isOpen = false);
    hudStatus.textContent = 'Goal: Bring P1 & P2 to the Co-op Goal!';
    hudStatus.style.color = '#f59e0b';
  }

  function updatePlaytestPhysics(dt) {
    if (mode !== 'play') return;

    // --- P1 Controls (WASD) ---
    if (keysPressed['KeyA']) p1.vx = -MOVE_SPEED;
    else if (keysPressed['KeyD']) p1.vx = MOVE_SPEED;
    else p1.vx = 0;

    if (keysPressed['KeyW'] && p1.isGrounded) {
      p1.vy = -JUMP_FORCE;
      p1.isGrounded = false;
    }

    // --- P2 Controls (Arrow Keys) ---
    if (keysPressed['ArrowLeft']) p2.vx = -MOVE_SPEED;
    else if (keysPressed['ArrowRight']) p2.vx = MOVE_SPEED;
    else p2.vx = 0;

    if (keysPressed['ArrowUp'] && p2.isGrounded) {
      p2.vy = -JUMP_FORCE;
      p2.isGrounded = false;
    }

    // Update positions
    [p1, p2].forEach(p => {
      p.vy += GRAVITY * dt;
      let nextX = p.x + p.vx * dt;
      let nextY = p.y + p.vy * dt;

      // Platform Collisions
      p.isGrounded = false;
      level.platforms.forEach(plat => {
        if (p.vy >= 0 && p.y <= plat.y + 6 && nextY >= plat.y) {
          if (nextX + p.w / 2 >= plat.x && nextX - p.w / 2 <= plat.x + plat.w) {
            p.y = plat.y; p.vy = 0; p.isGrounded = true;
          }
        }
      });

      // Lock Collisions (if not open)
      level.locks.forEach(l => {
        if (!l.isOpen) {
          if (nextY > l.y && nextY - p.h < l.y + l.h) {
            if (p.x + p.w / 2 <= l.x && nextX + p.w / 2 >= l.x) nextX = l.x - p.w / 2;
            if (p.x - p.w / 2 >= l.x + l.w && nextX - p.w / 2 <= l.x + l.w) nextX = l.x + l.w + p.w / 2;
          }
        }
      });

      // Spring Collisions
      level.springs.forEach(s => {
        if (p.vy >= 0 && p.y <= s.y + 6 && nextY >= s.y) {
          if (nextX + p.w / 2 >= s.x && nextX - p.w / 2 <= s.x + s.w) {
            p.vy = -(s.bounceForce || 1200);
            p.isGrounded = false;
          }
        }
      });

      if (!p.isGrounded) p.y = nextY;
      p.x = Math.max(20, Math.min(level.width - 20, nextX));
    });

    // Reset Pressure Plates state before re-checking
    level.plates.forEach(plate => plate.isPressed = false);

    // Check Triggers & Pickups
    [p1, p2].forEach(p => {
      // Pressure Plates
      level.plates.forEach(plate => {
        if (p.x + p.w / 2 >= plate.x && p.x - p.w / 2 <= plate.x + plate.w && Math.abs(p.y - plate.y) < 10) {
          plate.isPressed = true;
        }
      });

      // Key Collection
      level.keys.forEach(k => {
        if (!k.isCollected) {
          if (Math.abs(p.x - (k.x + 12)) < 24 && Math.abs((p.y - 18) - (k.y + 12)) < 24) {
            k.isCollected = true;
          }
        }
      });
    });

    // Update Lock Open Status based on Triggers
    level.locks.forEach(lock => {
      if (lock.lockType === 'key') {
        const key = level.keys.find(k => k.targetLockId === lock.id);
        if (key && key.isCollected) lock.isOpen = true;
      } else if (lock.lockType === 'plate') {
        const plate = level.plates.find(pl => pl.targetLockId === lock.id);
        lock.isOpen = plate ? plate.isPressed : false;
      }
    });

    // Check Goal Collision for Both Players
    const g = level.goal;
    const p1InGoal = p1.x >= g.x && p1.x <= g.x + g.w && p1.y >= g.y && p1.y <= g.y + g.h;
    const p2InGoal = p2.x >= g.x && p2.x <= g.x + g.w && p2.y >= g.y && p2.y <= g.y + g.h;

    if (p1InGoal && p2InGoal) {
      hudStatus.textContent = '🎉 LEVEL COMPLETE! BOTH PLAYERS REACHED THE GOAL!';
      hudStatus.style.color = '#10b981';
    } else if (p1InGoal) {
      hudStatus.textContent = 'P1 in Goal! Waiting for P2...';
      hudStatus.style.color = '#38bdf8';
    } else if (p2InGoal) {
      hudStatus.textContent = 'P2 in Goal! Waiting for P1...';
      hudStatus.style.color = '#f43f5e';
    }
  }

  // --- Main Animation Loop ---
  let lastTime = 0;
  function renderLoop(now) {
    if (!lastTime) lastTime = now;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (mode === 'play') {
      updatePlaytestPhysics(dt);
    }
    draw();
    requestAnimationFrame(renderLoop);
  }

  // --- JSON Export / Import Modal Handlers ---
  function openExportModal() {
    modalTitle.textContent = 'Export Level JSON';
    jsonText.value = JSON.stringify(level, null, 2);
    btnApplyJson.style.display = 'none';
    jsonModal.style.display = 'flex';
  }

  function openImportModal() {
    modalTitle.textContent = 'Import Level JSON';
    jsonText.value = '';
    btnApplyJson.style.display = 'inline-flex';
    jsonModal.style.display = 'flex';
  }

  function closeModal() {
    jsonModal.style.display = 'none';
  }

  function copyJsonToClipboard() {
    jsonText.select();
    navigator.clipboard.writeText(jsonText.value).then(() => {
      alert('Level JSON copied to clipboard!');
    });
  }

  function downloadJsonFile() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(level, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${level.name.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  }

  function applyJsonInput() {
    try {
      const parsed = JSON.parse(jsonText.value);
      if (!parsed.platforms || !Array.isArray(parsed.platforms)) {
        alert('Invalid level JSON structure: missing platforms array.');
        return;
      }
      level = parsed;
      inpStageW.value = level.width || 2400;
      inpStageH.value = level.height || 800;
      resizeCanvas();
      closeModal();
      selectObject(null);
      alert('Level successfully imported!');
    } catch (err) {
      alert('Failed to parse JSON: ' + err.message);
    }
  }

  // Start Editor
  init();
})();
