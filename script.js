const STAGE_W = 1280;
const STAGE_H = 720;

const stage = document.getElementById("stage");
const instruction = document.getElementById("instruction");
const resetBtn = document.getElementById("resetBtn");

const layers = [
  { src: "resources/assets/image5.png", x: -5.0, y: -3.0, w: 1340.1, h: 750.9, z: 1 },
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
    target: { x: 233.1, y: 135.2 },
    snap: 88
  },
  {
    id: "kick-shaft",
    label: "2) Kick Shaft",
    src: "resources/assets/image13.png",
    rect: { x: 374.0, y: 376.3, w: 278.0, h: 176.2 },
    z: 10,
    rot: 84.2025,
    target: { x: 566.0, y: 136.9 },
    snap: 94
  },
  {
    id: "dipstick",
    label: "3) Dipstick",
    src: "resources/assets/image8.png",
    rect: { x: 683.5, y: 337.4, w: 52.0, h: 238.4 },
    z: 3,
    target: { x: 944.9, y: 135.2 },
    snap: 84
  },
  {
    id: "clutch-cover-bolt-1",
    label: "4) Clutch Cover Bolt",
    src: "resources/assets/image12.png",
    rect: { x: 623.8, y: 365.6, w: 35.1, h: 37.5 },
    z: 7,
    group: "bolt",
    target: { x: 1248.0, y: 156.9 },
    snap: 76
  },
  {
    id: "clutch-cover-bolt-2",
    label: "4) Clutch Cover Bolt",
    src: "resources/assets/image12.png",
    rect: { x: 464.6, y: 393.8, w: 35.1, h: 37.5 },
    z: 8,
    group: "bolt",
    target: { x: 1248.0, y: 156.9 },
    snap: 76
  },
  {
    id: "clutch-cover-bolt-3",
    label: "4) Clutch Cover Bolt",
    src: "resources/assets/image12.png",
    rect: { x: 739.1, y: 387.7, w: 35.1, h: 37.5 },
    z: 9,
    group: "bolt",
    target: { x: 1248.0, y: 156.9 },
    snap: 76
  },
  {
    id: "clutch-cover",
    label: "5) Clutch Cover",
    src: "resources/assets/image11.png",
    rect: { x: 462.0, y: 301.3, w: 256.0, h: 406.1 },
    z: 6,
    rot: 270,
    target: { x: 239.2, y: 383.7 },
    snap: 96
  },
  {
    id: "clutch-cover-gasket",
    label: "6) Clutch Cover Gasket",
    src: "resources/assets/image10.png",
    rect: { x: 495.2, y: 355.8, w: 207.6, h: 315.4 },
    z: 5,
    rot: 270,
    target: { x: 1248.0, y: 373.3 },
    snap: 94
  }
];

const pieces = new Map();
const targets = [];
const boltIds = new Set(sequence.filter((item) => item.group === "bolt").map((item) => item.id));
let step = 0;
let dragState = null;

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

function stagePoint(event) {
  const r = stage.getBoundingClientRect();
  return {
    x: ((event.clientX - r.left) / r.width) * STAGE_W,
    y: ((event.clientY - r.top) / r.height) * STAGE_H
  };
}

function getCenter(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function activateStep() {
  const currentItem = getCurrentItem();
  const inBoltPhase = isBoltStep(currentItem);

  sequence.forEach((item, idx) => {
    const node = pieces.get(item.id);
    const active = inBoltPhase ? boltIds.has(item.id) && !item.placed : idx === step && !item.placed;
    node.classList.toggle("active", active);
  });

  targets.forEach((t, idx) => {
    const isCurrent = idx === step;
    t.classList.toggle("active", isCurrent);
    t.classList.toggle("filled", idx < step);
  });

  if (step < sequence.length && currentItem) {
    instruction.classList.remove("status-done");
    if (inBoltPhase) {
      const totalBolts = sequence.filter((item) => item.group === "bolt").length;
      const placedBolts = sequence.filter((item) => item.group === "bolt" && item.placed).length;
      instruction.textContent = `Drag ${currentItem.label} to its arrow target (${placedBolts}/${totalBolts}).`;
    } else {
      instruction.textContent = `Drag ${currentItem.label} to its arrow target.`;
    }
  } else {
    instruction.classList.add("status-done");
    instruction.textContent = "Completed: all parts matched to their labels.";
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

  item.current.x = Math.max(-item.rect.w * 0.6, Math.min(STAGE_W - item.rect.w * 0.4, nextX));
  item.current.y = Math.max(-item.rect.h * 0.6, Math.min(STAGE_H - item.rect.h * 0.2, nextY));

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

  const center = getCenter(item.current);
  const dx = center.x - item.target.x;
  const dy = center.y - item.target.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= item.snap) {
    item.current.x = item.target.x - item.rect.w / 2;
    item.current.y = item.target.y - item.rect.h / 2;
    setRect(node, item.current);
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
    node.classList.remove("placed", "dragging");
    node.style.zIndex = item.z;
  });

  activateStep();
}

function init() {
  layers.forEach(addLayer);
  sequence.forEach((item, index) => {
    makePiece(item);
    makeTarget(item, index);
  });

  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);
  resetBtn.addEventListener("click", reset);

  activateStep();
}

init();
