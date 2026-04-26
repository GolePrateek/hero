const STAGE_W = 1280;
const STAGE_H = 720;

const stage = document.getElementById("stage");
const instruction = document.getElementById("instruction");
const progress = document.getElementById("progress");
const resetBtn = document.getElementById("resetBtn");
const calibrateMode = new URLSearchParams(window.location.search).has("calibrate");

const layers = [
  { src: "resources/assets/image2.png", x: 0.0, y: 0.0, w: 1280.0, h: 720.0, z: 0 },
  { src: "resources/assets/image5.png", x: 0.0, y: 0.0, w: 1280.0, h: 720.0, z: 1 },
  { src: "resources/assets/image7.png", x: 476.1, y: 427.4, w: 254.6, h: 166.7, z: 2 },
  { src: "resources/assets/image9.png", x: 602.3, y: 567.9, w: 67.0, h: 26.2, z: 4 }
];

const sequence = [
  {
    id: "clutch-cable",
    label: "1) Clutch Cable",
    src: "resources/assets/image14.png",
    rect: { x: 405.9, y: 205.7, w: 94.5, h: 216.4 },
    z: 11,
    target: { x: 256.0, y: 135.4 },
    anchor: { x: 0.46, y: 0.98 },
    dropAnchor: { x: 0.46, y: 0.98 },
    dropScale: 0.9,
    snap: 120
  },
  {
    id: "kick-shaft",
    label: "2) Kick Shaft",
    src: "resources/assets/image13.png",
    rect: { x: 374.0, y: 376.3, w: 278.0, h: 176.2 },
    z: 10,
    rot: 84.2025,
    target: { x: 581.9, y: 134.3 },
    anchor: { x: 0.5, y: 0.5 },
    dropScale: 0.7,
    snap: 94
  },
  {
    id: "dipstick",
    label: "3) Dipstick",
    src: "resources/assets/image8.png",
    rect: { x: 683.5, y: 337.4, w: 52.0, h: 238.4 },
    z: 3,
    target: { x: 944.9, y: 135.2 },
    anchor: { x: 0.5, y: 0.5 },
    dropScale: 0.85,
    snap: 84
  },
  {
    id: "clutch-cover-bolt-1",
    label: "4) Clutch Cover Bolt",
    src: "resources/assets/image12.png",
    rect: { x: 623.8, y: 365.6, w: 35.1, h: 37.5 },
    z: 7,
    group: "bolt",
    target: { x: 1258.7, y: 187.9 },
    anchor: { x: 0.5, y: 0.5 },
    dropAnchor: { x: 0.5, y: 0.5 },
    dropScale: 0.8,
    snap: 76
  },
  {
    id: "clutch-cover-bolt-2",
    label: "4) Clutch Cover Bolt",
    src: "resources/assets/image12.png",
    rect: { x: 464.6, y: 393.8, w: 35.1, h: 37.5 },
    z: 8,
    group: "bolt",
    target: { x: 1258.7, y: 187.9 },
    anchor: { x: 0.5, y: 0.5 },
    dropAnchor: { x: 0.5, y: 0.5 },
    dropScale: 0.8,
    snap: 76
  },
  {
    id: "clutch-cover-bolt-3",
    label: "4) Clutch Cover Bolt",
    src: "resources/assets/image12.png",
    rect: { x: 739.1, y: 387.7, w: 35.1, h: 37.5 },
    z: 9,
    group: "bolt",
    target: { x: 1258.7, y: 187.9 },
    anchor: { x: 0.5, y: 0.5 },
    dropAnchor: { x: 0.5, y: 0.5 },
    dropScale: 0.8,
    snap: 76
  },
  {
    id: "clutch-cover",
    label: "5) Clutch Cover",
    src: "resources/assets/image11.png",
    rect: { x: 462.0, y: 301.3, w: 256.0, h: 406.1 },
    z: 6,
    rot: 270,
    target: { x: 226.4, y: 404.4 },
    anchor: { x: 0.5, y: 0.5 },
    dropAnchor: { x: 0.85, y: 0.15 },
    dropScale: 0.38,
    snap: 96
  },
  {
    id: "clutch-cover-gasket",
    label: "6) Clutch Cover Gasket",
    src: "resources/assets/image10.png",
    rect: { x: 495.2, y: 355.8, w: 207.6, h: 315.4 },
    z: 5,
    rot: 270,
    target: { x: 1138.0, y: 393.0 },
    anchor: { x: 1.0, y: 0.5 },
    dropAnchor: { x: 1.0, y: 0.15 },
    dropScale: 0.42,
    snap: 94
  }
];

const pieces = new Map();
const targets = [];
const boltIds = new Set(sequence.filter((item) => item.group === "bolt").map((item) => item.id));
const calibrationSteps = sequence.reduce((acc, item, idx) => {
  if (item.group !== "bolt" || !acc.some((stepIdx) => sequence[stepIdx].group === "bolt")) {
    acc.push(idx);
  }
  return acc;
}, []);
let step = 0;
let dragState = null;
let calibrationHud = null;

function getCurrentItem() {
  return sequence[step] || null;
}

function isBoltStep(item) {
  return Boolean(item && item.group === "bolt");
}

function nextStepIndex() {
  const next = sequence.findIndex((item, idx) => idx >= step && !item.placed);
  return next === -1 ? sequence.length : next;
}

function pctX(value) {
  return `${(value / STAGE_W) * 100}%`;
}

function pctY(value) {
  return `${(value / STAGE_H) * 100}%`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setRect(node, rect) {
  node.style.left = pctX(rect.x);
  node.style.top = pctY(rect.y);
  node.style.width = pctX(rect.w);
  node.style.height = pctY(rect.h);
}

function applyRotation(node, item) {
  const rotation = item.rot ? ` rotate(${item.rot}deg)` : "";
  node.style.transformOrigin = "50% 50%";
  node.style.transform = rotation;
}

function addLayer(layer) {
  const img = document.createElement("img");
  img.src = layer.src;
  img.className = "layer";
  img.alt = "";
  img.draggable = false;
  img.style.zIndex = layer.z;
  setRect(img, layer);
  applyRotation(img, layer);
  stage.appendChild(img);
}

function makePiece(item) {
  const node = document.createElement("div");
  node.className = "piece";
  node.dataset.id = item.id;
  node.style.zIndex = item.z;
  node.setAttribute("role", "button");
  node.setAttribute("aria-label", item.label);

  const img = document.createElement("img");
  img.src = item.src;
  img.alt = item.label;
  img.draggable = false;

  node.appendChild(img);
  node.addEventListener("pointerdown", onPointerDown);

  item.current = { ...item.rect };
  item.placed = false;
  setRect(node, item.current);
  applyRotation(node, item);
  stage.appendChild(node);
  pieces.set(item.id, node);
}

function makeTarget(item, index) {
  const t = document.createElement("div");
  t.className = "target";
  t.style.left = pctX(item.target.x);
  t.style.top = pctY(item.target.y);
  t.style.zIndex = 60 + index;
  stage.appendChild(t);
  targets.push(t);
}

function syncTargetPositions() {
  targets.forEach((targetNode, idx) => {
    const item = sequence[idx];
    targetNode.style.left = pctX(item.target.x);
    targetNode.style.top = pctY(item.target.y);
  });
}

function stagePoint(event) {
  const r = stage.getBoundingClientRect();
  return {
    x: ((event.clientX - r.left) / r.width) * STAGE_W,
    y: ((event.clientY - r.top) / r.height) * STAGE_H
  };
}

function fitStageToShell() {
  const shell = stage.parentElement;
  if (!shell) {
    return;
  }

  const maxW = shell.clientWidth;
  const maxH = shell.clientHeight;
  if (!maxW || !maxH) {
    return;
  }

  let width = maxW;
  let height = (width * STAGE_H) / STAGE_W;

  if (height > maxH) {
    height = maxH;
    width = (height * STAGE_W) / STAGE_H;
  }

  stage.style.width = `${Math.floor(width)}px`;
  stage.style.height = `${Math.floor(height)}px`;
}

function getAnchor(item, rect) {
  const anchor = item.anchor || { x: 0.5, y: 0.5 };
  return {
    x: rect.x + rect.w * anchor.x,
    y: rect.y + rect.h * anchor.y
  };
}

function rotatedBounds(item, rect) {
  const angle = ((item.rot || 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  const w = rect.w;
  const h = rect.h;
  return {
    w: w * c + h * s,
    h: w * s + h * c
  };
}

function clampRectToStage(item, rect) {
  const rotated = rotatedBounds(item, rect);
  const cx = clamp(rect.x + rect.w / 2, rotated.w / 2, STAGE_W - rotated.w / 2);
  const cy = clamp(rect.y + rect.h / 2, rotated.h / 2, STAGE_H - rotated.h / 2);

  return {
    x: cx - rect.w / 2,
    y: cy - rect.h / 2,
    w: rect.w,
    h: rect.h
  };
}

function snapRect(item, scale = 1) {
  const anchor = item.dropAnchor || item.anchor || { x: 0.5, y: 0.5 };
  const w = item.rect.w * scale;
  const h = item.rect.h * scale;
  const rect = {
    x: item.target.x - w * anchor.x,
    y: item.target.y - h * anchor.y,
    w,
    h
  };

  return clampRectToStage(item, rect);
}

function placedCount() {
  return sequence.filter((item) => item.placed).length;
}

function setCurrentTarget(point) {
  const currentItem = getCurrentItem();
  if (!currentItem) {
    return;
  }

  if (currentItem.group === "bolt") {
    sequence
      .filter((item) => item.group === "bolt")
      .forEach((item) => {
        item.target = { x: point.x, y: point.y };
      });
  } else {
    currentItem.target = { x: point.x, y: point.y };
  }

  syncTargetPositions();
  activateStep();
}

function updateCalibrationHud(point) {
  if (!calibrationHud) {
    return;
  }

  const currentItem = getCurrentItem();
  const id = currentItem ? currentItem.id : "done";
  calibrationHud.textContent = `CALIBRATION MODE\nStep: ${step + 1}/${sequence.length} (${id})\nPointer: x=${point.x.toFixed(
    1
  )}, y=${point.y.toFixed(1)}\nShift+Tap/Click: set target\nN/P: next/prev calibration step\nR: reset`;
}

function onCalibrationPointerDown(event) {
  if (!calibrateMode || !event.shiftKey) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const p = stagePoint(event);
  setCurrentTarget(p);

  const currentItem = getCurrentItem();
  if (currentItem) {
    console.log(`target ${currentItem.id}: { x: ${p.x.toFixed(1)}, y: ${p.y.toFixed(1)} }`);
  }
}

function onCalibrationPointerMove(event) {
  if (!calibrateMode) {
    return;
  }
  updateCalibrationHud(stagePoint(event));
}

function setCalibrationStep(nextStep) {
  step = nextStep;
  activateStep();

  const item = getCurrentItem();
  const p = item ? item.target : { x: 0, y: 0 };
  updateCalibrationHud(p);
}

function onCalibrationKeyDown(event) {
  if (!calibrateMode) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key !== "n" && key !== "p" && key !== "r") {
    return;
  }

  event.preventDefault();

  if (key === "r") {
    reset();
    const item = getCurrentItem();
    const p = item ? item.target : { x: 0, y: 0 };
    updateCalibrationHud(p);
    return;
  }

  const currentOrderIndex = calibrationSteps.findIndex((idx) => idx === step);
  const fallbackIndex = calibrationSteps.findIndex((idx) => idx >= step);
  const orderIndex = currentOrderIndex === -1 ? Math.max(0, fallbackIndex) : currentOrderIndex;

  if (key === "n") {
    setCalibrationStep(calibrationSteps[Math.min(orderIndex + 1, calibrationSteps.length - 1)]);
  }

  if (key === "p") {
    setCalibrationStep(calibrationSteps[Math.max(orderIndex - 1, 0)]);
  }
}

function activateStep() {
  const currentItem = getCurrentItem();
  const inBoltPhase = isBoltStep(currentItem);
  const totalBolts = sequence.filter((item) => item.group === "bolt").length;
  const placedBolts = sequence.filter((item) => item.group === "bolt" && item.placed).length;

  sequence.forEach((item, idx) => {
    const node = pieces.get(item.id);
    const active = inBoltPhase ? boltIds.has(item.id) && !item.placed : idx === step && !item.placed;
    node.classList.toggle("active", active);
  });

  targets.forEach((t, idx) => {
    const targetItem = sequence[idx];
    const isCurrent = inBoltPhase ? targetItem.group === "bolt" && idx === step : idx === step;
    t.classList.toggle("active", isCurrent);
    t.classList.toggle("filled", targetItem.placed);
    if (inBoltPhase && targetItem.group === "bolt" && idx !== step) {
      t.classList.remove("active");
    }
  });

  progress.textContent = `Placed ${placedCount()} / ${sequence.length}`;

  if (step < sequence.length && currentItem) {
    instruction.classList.remove("status-done");
    if (inBoltPhase) {
      instruction.textContent = `Drag ${currentItem.label} to its arrow target (${placedBolts}/${totalBolts}).`;
    } else {
      instruction.textContent = `Drag ${currentItem.label} to its arrow target.`;
    }
  } else {
    instruction.classList.add("status-done");
    instruction.textContent = "Completed: all parts matched to their labels.";
    progress.textContent = `Placed ${sequence.length} / ${sequence.length}`;
  }
}

function onPointerDown(event) {
  const node = event.currentTarget;
  const item = sequence.find((entry) => entry.id === node.dataset.id);
  if (!item) {
    return;
  }

  const currentItem = getCurrentItem();
  if (!currentItem || item.placed) {
    return;
  }

  const allowed = isBoltStep(currentItem)
    ? boltIds.has(item.id)
    : currentItem.id === item.id;

  if (!allowed) {
    return;
  }

  event.preventDefault();
  const p = stagePoint(event);

  dragState = {
    item,
    node,
    dx: p.x - item.current.x,
    dy: p.y - item.current.y
  };

  node.classList.add("dragging");
  node.style.zIndex = 200;
  node.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!dragState) {
    return;
  }

  const p = stagePoint(event);
  const nextX = p.x - dragState.dx;
  const nextY = p.y - dragState.dy;
  const item = dragState.item;

  const clamped = clampRectToStage(item, {
    x: nextX,
    y: nextY,
    w: item.current.w,
    h: item.current.h
  });

  item.current.x = clamped.x;
  item.current.y = clamped.y;

  setRect(dragState.node, item.current);
}

function onPointerUp(event) {
  if (!dragState) {
    return;
  }

  const { item, node } = dragState;
  node.classList.remove("dragging");
  node.style.zIndex = item.z;
  if (node.hasPointerCapture(event.pointerId)) {
    node.releasePointerCapture(event.pointerId);
  }

  const anchorPoint = getAnchor(item, item.current);
  const dx = anchorPoint.x - item.target.x;
  const dy = anchorPoint.y - item.target.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= item.snap) {
    item.current = snapRect(item, item.dropScale || 1);
    setRect(node, item.current);
    applyRotation(node, item);
    item.placed = true;
    node.classList.add("placed");
    node.classList.remove("active");
    step = nextStepIndex();
    activateStep();
  }

  dragState = null;
}

function reset() {
  step = 0;
  sequence.forEach((item) => {
    item.current = { ...item.rect };
    item.placed = false;

    const node = pieces.get(item.id);
    setRect(node, item.current);
    applyRotation(node, item);
    node.classList.remove("placed", "dragging");
    node.style.zIndex = item.z;
  });

  activateStep();
}

function init() {
  fitStageToShell();

  layers.forEach(addLayer);
  sequence.forEach((item, index) => {
    makePiece(item);
    makeTarget(item, index);
  });

  syncTargetPositions();

  if (calibrateMode) {
    calibrationHud = document.createElement("pre");
    calibrationHud.className = "calibration-hud";
    stage.appendChild(calibrationHud);
    updateCalibrationHud({ x: 0, y: 0 });
    stage.addEventListener("pointerdown", onCalibrationPointerDown, true);
    stage.addEventListener("pointermove", onCalibrationPointerMove);
    window.addEventListener("keydown", onCalibrationKeyDown);
  }

  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);
  resetBtn.addEventListener("click", reset);
  window.addEventListener("resize", fitStageToShell);

  activateStep();
}

init();
