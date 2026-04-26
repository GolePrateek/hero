const STAGE_W = 1280;
const STAGE_H = 720;

const stage = document.getElementById("stage");
const instruction = document.getElementById("instruction");
const progress = document.getElementById("progress");
const resetBtn = document.getElementById("resetBtn");
const calibrateMode = new URLSearchParams(window.location.search).has("calibrate");

const staticLayers = [
  { src: "resources/assets/image6.png", rect: { x: 0, y: 0, w: 1280, h: 720 }, z: 0 },
  { src: "resources/assets/image16.png", rect: { x: 431.1, y: 316.8, w: 379.4, h: 254.9 }, z: 1 }
];

const coverInitial = { x: 610.1, y: 351.8, w: 204.8, h: 202.4 };
const baseAssemblyRect = { x: 431.1, y: 316.8, w: 379.4, h: 254.9 };

const sequence = [
  {
    id: "screen-filter",
    label: "1) Screen Filter",
    src: "resources/assets/image21.png",
    rect: { x: 606.2, y: 543.3, w: 88.8, h: 34.7 },
    target: { x: 83.9, y: 197.6 },
    z: 20,
    anchor: { x: 0.5, y: 0.5 },
    dropScale: 0.95,
    snap: 92
  },
  {
    id: "rotor-screw-1",
    label: "2) Rotor Oil Filter Screw",
    src: "resources/assets/image18.png",
    rect: { x: 612.8, y: 421.2, w: 30.1, h: 30.9 },
    target: { x: 509.2, y: 202.4 },
    z: 16,
    group: "screws",
    anchor: { x: 0.5, y: 0.5 },
    dropAnchor: { x: 0.48, y: 0.52 },
    dropScale: 0.88,
    snap: 82
  },
  {
    id: "rotor-screw-2",
    label: "2) Rotor Oil Filter Screw",
    src: "resources/assets/image18.png",
    rect: { x: 709.3, y: 350.9, w: 30.1, h: 30.9 },
    target: { x: 509.2, y: 202.4 },
    z: 17,
    group: "screws",
    anchor: { x: 0.5, y: 0.5 },
    dropAnchor: { x: 0.48, y: 0.52 },
    dropScale: 0.88,
    snap: 82
  },
  {
    id: "rotor-screw-3",
    label: "2) Rotor Oil Filter Screw",
    src: "resources/assets/image18.png",
    rect: { x: 780.6, y: 447.6, w: 30.1, h: 30.9 },
    target: { x: 509.2, y: 202.4 },
    z: 18,
    group: "screws",
    anchor: { x: 0.5, y: 0.5 },
    dropAnchor: { x: 0.48, y: 0.52 },
    dropScale: 0.88,
    snap: 82
  },
  {
    id: "rotor-screw-4",
    label: "2) Rotor Oil Filter Screw",
    src: "resources/assets/image18.png",
    rect: { x: 682.3, y: 518.3, w: 30.1, h: 30.9 },
    target: { x: 509.2, y: 202.4 },
    z: 19,
    group: "screws",
    anchor: { x: 0.5, y: 0.5 },
    dropAnchor: { x: 0.48, y: 0.52 },
    dropScale: 0.88,
    snap: 82
  },
  {
    id: "rotor-oil-filter-cover",
    label: "3) Rotor Oil Filter Cover",
    src: "resources/assets/image17.png",
    rect: { ...coverInitial },
    target: { x: 1054.4, y: 134.1 },
    z: 15,
    anchor: { x: 0.5, y: 0.5 },
    dropScale: 0.74,
    snap: 98
  },
  {
    id: "bin",
    label: "# Bin",
    src: "resources/assets/image19.png",
    rect: { x: 7.2, y: 418.3, w: 224.0, h: 153.4 },
    target: {
      x: coverInitial.x + coverInitial.w / 2,
      y: baseAssemblyRect.y + baseAssemblyRect.h + 60
    },
    z: 14,
    anchor: { x: 0.5, y: 0.5 },
    dropScale: 0.88,
    snap: 104
  },
  {
    id: "soft-nylon-brush",
    label: "# Soft Nylon Brush",
    src: "resources/assets/image20.png",
    rect: { x: 991.8, y: 434.8, w: 301.8, h: 50.8 },
    target: { x: 710.5, y: 455.8 },
    z: 21,
    anchor: { x: 0.35, y: 0.5 },
    dropAnchor: { x: 0.1, y: 0.58 },
    dropScale: 0.84,
    snap: 108
  }
];

const pieces = new Map();
const targets = [];
const screwIds = new Set(sequence.filter((item) => item.group === "screws").map((item) => item.id));
const calibrationSteps = sequence.reduce((acc, item, idx) => {
  if (item.group !== "screws" || !acc.some((stepIdx) => sequence[stepIdx].group === "screws")) {
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

function isScrewStep(item) {
  return Boolean(item && item.group === "screws");
}

function nextStepIndex() {
  const next = sequence.findIndex((item, idx) => idx >= step && !item.placed);
  return next === -1 ? sequence.length : next;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pctX(value) {
  return `${(value / STAGE_W) * 100}%`;
}

function pctY(value) {
  return `${(value / STAGE_H) * 100}%`;
}

function setRect(node, rect) {
  node.style.left = pctX(rect.x);
  node.style.top = pctY(rect.y);
  node.style.width = pctX(rect.w);
  node.style.height = pctY(rect.h);
}

function addLayer(layer) {
  const img = document.createElement("img");
  img.src = layer.src;
  img.className = "layer";
  img.alt = "";
  img.draggable = false;
  img.style.zIndex = layer.z;
  setRect(img, layer.rect);
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

  stage.appendChild(node);
  pieces.set(item.id, node);
}

function makeTarget(item, index) {
  const marker = document.createElement("div");
  marker.className = "target";
  marker.style.left = pctX(item.target.x);
  marker.style.top = pctY(item.target.y);
  marker.style.zIndex = 60 + index;
  stage.appendChild(marker);
  targets.push(marker);
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

function rotatedBounds(item, rect) {
  const angle = ((item.rot || 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  return {
    w: rect.w * c + rect.h * s,
    h: rect.w * s + rect.h * c
  };
}

function clampRectToStage(item, rect) {
  const bound = rotatedBounds(item, rect);
  const cx = clamp(rect.x + rect.w / 2, bound.w / 2, STAGE_W - bound.w / 2);
  const cy = clamp(rect.y + rect.h / 2, bound.h / 2, STAGE_H - bound.h / 2);
  return {
    x: cx - rect.w / 2,
    y: cy - rect.h / 2,
    w: rect.w,
    h: rect.h
  };
}

function getAnchor(item, rect) {
  const anchor = item.anchor || { x: 0.5, y: 0.5 };
  return {
    x: rect.x + rect.w * anchor.x,
    y: rect.y + rect.h * anchor.y
  };
}

function snapRect(item) {
  const anchor = item.dropAnchor || item.anchor || { x: 0.5, y: 0.5 };
  const scale = item.dropScale || 1;
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

  if (currentItem.group === "screws") {
    sequence
      .filter((item) => item.group === "screws")
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
  )}, y=${point.y.toFixed(1)}\nShift+Tap/Click: set target\nAlt+Shift+Tap/Click: set initial center\nN/P: next/prev grouped step\nJ/K: next/prev exact step\nR: reset`;
}

function onCalibrationPointerDown(event) {
  if (!calibrateMode || !event.shiftKey) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const p = stagePoint(event);

  if (event.altKey) {
    const currentItem = getCurrentItem();
    if (!currentItem) {
      return;
    }

    currentItem.rect = {
      x: Number((p.x - currentItem.rect.w / 2).toFixed(1)),
      y: Number((p.y - currentItem.rect.h / 2).toFixed(1)),
      w: currentItem.rect.w,
      h: currentItem.rect.h
    };
    currentItem.current = { ...currentItem.rect };
    currentItem.placed = false;

    const node = pieces.get(currentItem.id);
    if (node) {
      setRect(node, currentItem.current);
      node.classList.remove("placed", "dragging", "brush-sweep-loop");
      node.style.zIndex = currentItem.z;
    }

    activateStep();
    console.log(
      `rect ${currentItem.id}: { x: ${currentItem.rect.x.toFixed(1)}, y: ${currentItem.rect.y.toFixed(
        1
      )}, w: ${currentItem.rect.w.toFixed(1)}, h: ${currentItem.rect.h.toFixed(1)} }`
    );
    return;
  }

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
  const point = item ? item.target : { x: 0, y: 0 };
  updateCalibrationHud(point);
}

function onCalibrationKeyDown(event) {
  if (!calibrateMode) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key !== "n" && key !== "p" && key !== "r" && key !== "j" && key !== "k") {
    return;
  }

  event.preventDefault();

  if (key === "r") {
    reset();
    const item = getCurrentItem();
    const point = item ? item.target : { x: 0, y: 0 };
    updateCalibrationHud(point);
    return;
  }

  if (key === "j") {
    setCalibrationStep(Math.min(step + 1, sequence.length - 1));
    return;
  }

  if (key === "k") {
    setCalibrationStep(Math.max(step - 1, 0));
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
  const inScrewStep = isScrewStep(currentItem);
  const totalScrews = sequence.filter((item) => item.group === "screws").length;
  const placedScrews = sequence.filter((item) => item.group === "screws" && item.placed).length;

  sequence.forEach((item, idx) => {
    const node = pieces.get(item.id);
    const active = inScrewStep ? screwIds.has(item.id) && !item.placed : idx === step && !item.placed;
    node.classList.toggle("active", active);
  });

  targets.forEach((targetNode, idx) => {
    const targetItem = sequence[idx];
    const isCurrent = inScrewStep ? targetItem.group === "screws" && idx === step : idx === step;
    targetNode.classList.toggle("active", isCurrent);
    targetNode.classList.toggle("filled", targetItem.placed);
    if (inScrewStep && targetItem.group === "screws" && idx !== step) {
      targetNode.classList.remove("active");
    }
  });

  progress.textContent = `Placed ${placedCount()} / ${sequence.length}`;

  if (step >= sequence.length || !currentItem) {
    instruction.classList.add("status-done");
    instruction.textContent = "Completed: all parts placed for Slide 3.";
    updateCalibrationHud({ x: 0, y: 0 });
    return;
  }

  instruction.classList.remove("status-done");
  if (inScrewStep) {
    instruction.textContent = `Drag ${currentItem.label} (${placedScrews}/${totalScrews}).`;
    return;
  }

  if (currentItem.id === "bin") {
    instruction.textContent = "Drag # Bin below rotor area under the initial cover position.";
    return;
  }

  if (currentItem.id === "soft-nylon-brush") {
    instruction.textContent = "Drag # Soft Nylon Brush and apply it on the exposed rotor part.";
    return;
  }

  instruction.textContent = `Drag ${currentItem.label} to its marked target.`;
  updateCalibrationHud(currentItem.target);
}

function onPointerDown(event) {
  const node = event.currentTarget;
  const item = sequence.find((entry) => entry.id === node.dataset.id);
  if (!item || item.placed) {
    return;
  }

  const currentItem = getCurrentItem();
  if (!currentItem) {
    return;
  }

  const allowed = isScrewStep(currentItem) ? screwIds.has(item.id) : currentItem.id === item.id;
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
  const item = dragState.item;
  const rect = clampRectToStage(item, {
    x: p.x - dragState.dx,
    y: p.y - dragState.dy,
    w: item.current.w,
    h: item.current.h
  });

  item.current.x = rect.x;
  item.current.y = rect.y;
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
    item.current = snapRect(item);
    item.placed = true;
    setRect(node, item.current);
    if (item.id === "soft-nylon-brush") {
      node.classList.add("brush-sweep-loop");
    }
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
    node.classList.remove("placed", "dragging", "brush-sweep-loop");
    node.style.zIndex = item.z;
  });

  activateStep();
}

function init() {
  staticLayers.forEach(addLayer);

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

  activateStep();
}

init();
