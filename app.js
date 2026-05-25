const state = {
  people: [],
  visiblePeople: [],
  childrenByParent: new Map(),
  collapsedBranches: new Set(),
  compact: window.matchMedia("(max-width: 720px)").matches,
  allBranchesExpanded: false,
  scale: 0.88,
  translateX: 80,
  translateY: 72,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  startX: 0,
  startY: 0,
  hasMoved: false,
  suppressClick: false,
  activePointers: new Map(),
  gestureMode: "idle",
  pinchStartDistance: 0,
  pinchStartScale: 1,
  pinchStartCenterX: 0,
  pinchStartCenterY: 0,
  pinchStartTranslateX: 0,
  pinchStartTranslateY: 0
};

const viewport = document.querySelector("#treeViewport");
const canvas = document.querySelector("#treeCanvas");
const nodesLayer = document.querySelector("#treeNodes");
const linesLayer = document.querySelector("#treeLines");
const mobileTreeView = document.querySelector("#mobileTreeView");
const dialog = document.querySelector("#profileDialog");
const closeProfile = document.querySelector("#closeProfile");
const referenceDialog = document.querySelector("#referenceDialog");
const openReference = document.querySelector("#openReference");
const closeReference = document.querySelector("#closeReference");

init();

async function init() {
  const response = await fetch("data/people.json?v=20260525-mobile-outline", { cache: "no-store" });
  const data = await response.json();
  state.people = data.people;
  state.childrenByParent = buildChildrenMap(state.people);
  normalizeGenerations(state.people);
  applyInitialMobileBranchState();

  renderTree();
  bindControls();
  centerTree();
  window.addEventListener("resize", onResize);
}

function renderTree() {
  document.body.classList.toggle("is-compact", state.compact);
  updateControlLabels();
  renderMobileTree();

  state.visiblePeople = getVisiblePeople();
  const peopleById = new Map(state.visiblePeople.map((person) => [person.id, person]));
  assignTreeLayout(state.visiblePeople);

  canvas.style.width = `${Math.max(980, getMax(state.visiblePeople, "x") + 260)}px`;
  canvas.style.height = `${Math.max(680, getMax(state.visiblePeople, "y") + 220)}px`;
  linesLayer.setAttribute("viewBox", `0 0 ${canvas.offsetWidth} ${canvas.offsetHeight}`);

  nodesLayer.innerHTML = "";
  linesLayer.innerHTML = "";

  state.visiblePeople.forEach((person) => {
    person.parents.forEach((parentId) => {
      const parent = peopleById.get(parentId);
      if (parent) {
        linesLayer.appendChild(createLine(parent, person));
      }
    });

    nodesLayer.appendChild(createPersonButton(person));
  });
}

function renderMobileTree() {
  const peopleById = new Map(state.people.map((person) => [person.id, person]));
  const childIds = new Set();

  state.childrenByParent.forEach((children) => {
    children.forEach((childId) => childIds.add(childId));
  });

  const roots = state.people
    .filter((person) => !childIds.has(person.id))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));

  mobileTreeView.innerHTML = roots.map((root) => mobileNodeMarkup(root, peopleById, 0)).join("");

  mobileTreeView.querySelectorAll("[data-profile-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const person = peopleById.get(button.dataset.profileId);
      if (person) {
        openProfile(person);
      }
    });
  });

  mobileTreeView.querySelectorAll("[data-mobile-toggle]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleBranch(button.dataset.mobileToggle);
    });
  });
}

function mobileNodeMarkup(person, peopleById, level) {
  const children = (state.childrenByParent.get(person.id) ?? [])
    .map((childId) => peopleById.get(childId))
    .filter(Boolean);
  const hasChildren = children.length > 0;
  const isCollapsed = state.collapsedBranches.has(person.id);
  const descendantCount = getDescendantCount(person.id);
  const visibleChildren = isCollapsed ? [] : children;
  const levelOffset = Math.min(level * 14, 56);

  return `
    <article class="mobile-branch" style="--level: ${level}; --level-offset: ${levelOffset}px;">
      <div class="mobile-node-card">
        <button class="mobile-person-button" type="button" data-profile-id="${person.id}">
          <span class="mobile-portrait-wrap">${mobilePortraitMarkup(person)}</span>
          <span class="mobile-person-text">
            <span class="mobile-person-name">${getDisplayName(person)}</span>
            <span class="mobile-person-meta">${getTimeline(person) || `Generation ${person.generation + 1}`}</span>
          </span>
        </button>
        ${
          hasChildren
            ? `<button class="mobile-branch-button" type="button" data-mobile-toggle="${person.id}" aria-label="${isCollapsed ? "Expand" : "Collapse"} ${getDisplayName(person)} branch">
                ${isCollapsed ? `+${descendantCount}` : "Less"}
              </button>`
            : ""
        }
      </div>
      ${
        visibleChildren.length
          ? `<div class="mobile-children">${visibleChildren.map((child) => mobileNodeMarkup(child, peopleById, level + 1)).join("")}</div>`
          : ""
      }
    </article>
  `;
}

function mobilePortraitMarkup(person) {
  if (!person.partner) {
    return `<span class="mobile-single-portrait">${portraitMarkup(person)}</span>`;
  }

  return `
    <span class="mobile-couple-portrait">
      <span>${portraitMarkup(person)}</span>
      <span class="mobile-heart">♥</span>
      <span>${portraitMarkup(person.partner)}</span>
    </span>
  `;
}

function assignTreeLayout(people) {
  const childrenByParent = new Map();
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const childIds = new Set();
  const leafGap = state.compact ? 170 : 230;
  const levelGap = state.compact ? 158 : 190;
  const startX = state.compact ? 116 : 150;
  const startY = state.compact ? 102 : 120;
  let cursorX = startX;

  people.forEach((person) => {
    const primaryParentId = person.parents?.[0];

    if (!primaryParentId || !peopleById.has(primaryParentId)) {
      return;
    }

    childIds.add(person.id);

    if (!childrenByParent.has(primaryParentId)) {
      childrenByParent.set(primaryParentId, []);
    }

    childrenByParent.get(primaryParentId).push(person);
  });

  people.forEach((person) => {
    if (!person.parents?.length) {
      return;
    }

    person.generation = Math.max(...person.parents.map((parentId) => peopleById.get(parentId)?.generation ?? 0)) + 1;
  });

  childrenByParent.forEach((children) => {
    children.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
  });

  const roots = people
    .filter((person) => !childIds.has(person.id))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));

  roots.forEach((root) => {
    layoutBranch(root);
    cursorX += leafGap;
  });

  function layoutBranch(person) {
    const children = childrenByParent.get(person.id) ?? [];
    person.y = startY + person.generation * levelGap;

    if (!children.length) {
      person.x = cursorX;
      cursorX += leafGap;
      return;
    }

    children.forEach(layoutBranch);
    person.x = (children[0].x + children[children.length - 1].x) / 2;
  }
}

function createLine(parent, child) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const start = getChildBranchAnchor(parent);
  const end = getParentBranchAnchor(child);
  const midpointY = start.y + (end.y - start.y) / 2;

  path.setAttribute(
    "d",
    `M ${start.x} ${start.y} L ${start.x} ${midpointY} L ${end.x} ${midpointY} L ${end.x} ${end.y}`
  );

  return path;
}

function getParentBranchAnchor(person) {
  return {
    x: person.x + getPersonAnchorOffset(person),
    y: person.y - 62
  };
}

function getChildBranchAnchor(person) {
  return {
    x: person.x,
    y: person.y + (person.partner ? 84 : 62)
  };
}

function getPersonAnchorOffset(person) {
  return person.partner ? -76 : 0;
}

function createPersonButton(person) {
  const button = document.createElement("button");
  button.className = `person-card${person.partner ? " has-partner" : ""}`;
  button.type = "button";
  button.style.left = `${person.x}px`;
  button.style.top = `${person.y}px`;
  button.setAttribute("aria-label", `Open profile for ${getDisplayName(person)}`);
  const childCount = getChildCount(person.id);
  button.innerHTML = `
    ${cardPortraitMarkup(person)}
    ${person.order ? `<span class="order-badge" aria-label="Marked order ${person.order}">${person.order}</span>` : ""}
    ${childCount ? branchToggleMarkup(person, childCount) : ""}
    <span class="person-name">${getDisplayName(person)}</span>
    <span class="person-meta">${getTimeline(person) || `Generation ${person.generation + 1}`}</span>
  `;
  const branchToggle = button.querySelector(".branch-toggle");
  branchToggle?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleBranch(person.id);
  });
  button.addEventListener("click", (event) => {
    if (state.suppressClick) {
      event.preventDefault();
      return;
    }

    openProfile(person);
  });
  return button;
}

function branchToggleMarkup(person, childCount) {
  const isCollapsed = state.collapsedBranches.has(person.id);
  const hiddenCount = isCollapsed ? getDescendantCount(person.id) : childCount;
  const label = isCollapsed ? `Expand ${hiddenCount} descendants` : `Collapse ${childCount} children`;

  return `
    <span
      class="branch-toggle ${isCollapsed ? "is-collapsed" : ""}"
      role="button"
      tabindex="0"
      aria-label="${label}"
      title="${label}"
    >
      ${isCollapsed ? `+${hiddenCount}` : "−"}
    </span>
  `;
}

function cardPortraitMarkup(person) {
  if (person.partner) {
    return `
      <span class="couple-unit" aria-hidden="true">
        <span class="couple-person">
          <span class="portrait">${portraitMarkup(person)}</span>
          <span class="couple-label">${person.name}</span>
        </span>
        <span class="couple-link">
          <span class="couple-heart">♥</span>
        </span>
        <span class="couple-person">
          <span class="portrait">${portraitMarkup(person.partner)}</span>
          <span class="couple-label">${person.partner.name}</span>
        </span>
      </span>
    `;
  }

  return `<span class="portrait">${portraitMarkup(person)}</span>`;
}

function portraitMarkup(person) {
  if (person.photo) {
    return `<img src="${person.photo}" alt="${person.name}" loading="lazy" decoding="async">`;
  }

  return `<span class="portrait-placeholder" aria-hidden="true">${getInitials(person.name)}</span>`;
}

function openProfile(person) {
  document.querySelector("#profilePhoto").innerHTML = profilePhotoMarkup(person);
  document.querySelector("#profileGeneration").textContent = `Generation ${person.generation + 1}`;
  if (person.order) {
    document.querySelector("#profileGeneration").textContent += ` | Marked child ${person.order}`;
  }
  document.querySelector("#profileName").textContent = getDisplayName(person);
  document.querySelector("#profileYears").textContent = getTimeline(person) || "Dates to be added";
  document.querySelector("#profileFacts").innerHTML = profileFactsMarkup(person);
  document.querySelector("#profileNote").textContent =
    person.note || "Profile details and biography can be added here.";

  dialog.showModal();
}

function profilePhotoMarkup(person) {
  if (!person.partner) {
    return portraitMarkup(person);
  }

  return `
    <div class="profile-photo-grid">
      <figure>
        ${portraitMarkup(person)}
        <figcaption>${person.name}</figcaption>
      </figure>
      <figure>
        ${portraitMarkup(person.partner)}
        <figcaption>${person.partner.name}</figcaption>
      </figure>
    </div>
  `;
}

function buildChildrenMap(people) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const map = new Map();

  people.forEach((person) => {
    const primaryParentId = person.parents?.[0];

    if (!primaryParentId || !peopleById.has(primaryParentId)) {
      return;
    }

    if (!map.has(primaryParentId)) {
      map.set(primaryParentId, []);
    }

    map.get(primaryParentId).push(person.id);
  });

  map.forEach((children) => {
    children.sort((firstId, secondId) => {
      const first = peopleById.get(firstId);
      const second = peopleById.get(secondId);
      return (first.order ?? 999) - (second.order ?? 999) || first.name.localeCompare(second.name);
    });
  });

  return map;
}

function normalizeGenerations(people) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const visiting = new Set();

  people.forEach((person) => assignGeneration(person));

  function assignGeneration(person) {
    if (!person.parents?.length) {
      person.generation = 0;
      return person.generation;
    }

    if (visiting.has(person.id)) {
      return person.generation ?? 0;
    }

    visiting.add(person.id);
    person.generation = Math.max(...person.parents.map((parentId) => {
      const parent = peopleById.get(parentId);
      return parent ? assignGeneration(parent) : -1;
    })) + 1;
    visiting.delete(person.id);
    return person.generation;
  }
}

function applyInitialMobileBranchState() {
  if (!state.compact) {
    return;
  }

  state.people.forEach((person) => {
    if (person.generation >= 3 && getChildCount(person.id)) {
      state.collapsedBranches.add(person.id);
    }
  });
}

function getVisiblePeople() {
  const hiddenIds = new Set();

  state.collapsedBranches.forEach((personId) => {
    collectDescendantIds(personId, hiddenIds);
  });

  return state.people.filter((person) => !hiddenIds.has(person.id));
}

function collectDescendantIds(personId, result) {
  const children = state.childrenByParent.get(personId) ?? [];

  children.forEach((childId) => {
    result.add(childId);
    collectDescendantIds(childId, result);
  });
}

function getChildCount(personId) {
  return state.childrenByParent.get(personId)?.length ?? 0;
}

function getDescendantCount(personId) {
  const descendants = new Set();
  collectDescendantIds(personId, descendants);
  return descendants.size;
}

function toggleBranch(personId) {
  if (state.collapsedBranches.has(personId)) {
    state.collapsedBranches.delete(personId);
  } else {
    state.collapsedBranches.add(personId);
  }

  state.allBranchesExpanded = state.collapsedBranches.size === 0;
  renderTree();
  centerTree();
}

function expandAllBranches() {
  state.collapsedBranches.clear();
  state.allBranchesExpanded = true;
  renderTree();
  centerTree();
}

function collapseDeepBranches() {
  state.collapsedBranches.clear();

  state.people.forEach((person) => {
    if (person.generation >= 2 && getChildCount(person.id)) {
      state.collapsedBranches.add(person.id);
    }
  });

  state.allBranchesExpanded = false;
  renderTree();
  centerTree();
}

function profileFactsMarkup(person) {
  const facts = [
    ["Birth", formatDateValue(person.birthDate, person.birthDateLabel || "To be added")],
    ["Death", formatDateValue(person.deathDate, person.deathDateLabel || "To be added")],
    ["Age", person.ageAtDeath ? `${person.ageAtDeath}` : "To be added"]
  ];

  return facts
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

function getTimeline(person) {
  if (person.birthDate || person.birthDateLabel || person.deathDate || person.deathDateLabel) {
    const birth = formatDateValue(person.birthDate, person.birthDateLabel || "?");
    const death = formatDateValue(person.deathDate, person.deathDateLabel || "Present");
    return `${birth} - ${death}`;
  }

  return person.years || "";
}

function formatDateValue(value, fallback) {
  if (!value) {
    return fallback;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function bindControls() {
  document.querySelector("[data-action='zoom-in']").addEventListener("click", () => zoomBy(1.16));
  document.querySelector("[data-action='zoom-out']").addEventListener("click", () => zoomBy(0.86));
  document.querySelector("[data-action='reset']").addEventListener("click", centerTree);
  document.querySelector("[data-action='toggle-compact']").addEventListener("click", toggleCompactMode);
  document.querySelector("[data-action='toggle-branches']").addEventListener("click", toggleAllBranches);
  closeProfile.addEventListener("click", () => dialog.close());
  openReference.addEventListener("click", () => referenceDialog.showModal());
  closeReference.addEventListener("click", () => referenceDialog.close());

  viewport.addEventListener("wheel", onWheel, { passive: false });
  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", onPointerUp);
  viewport.addEventListener("gesturestart", preventNativeGesture);
  viewport.addEventListener("gesturechange", preventNativeGesture);
  viewport.addEventListener("gestureend", preventNativeGesture);
}

function toggleCompactMode() {
  state.compact = !state.compact;
  renderTree();
  centerTree();
}

function toggleAllBranches() {
  if (state.allBranchesExpanded || state.collapsedBranches.size === 0) {
    collapseDeepBranches();
    return;
  }

  expandAllBranches();
}

function updateControlLabels() {
  const compactButton = document.querySelector("[data-action='toggle-compact']");
  const branchesButton = document.querySelector("[data-action='toggle-branches']");

  compactButton.textContent = state.compact ? "Full" : "C";
  compactButton.setAttribute("aria-label", state.compact ? "Switch to full-size view" : "Switch to compact view");

  branchesButton.textContent = state.collapsedBranches.size ? "All" : "Less";
  branchesButton.setAttribute(
    "aria-label",
    state.collapsedBranches.size ? "Expand all branches" : "Collapse deeper branches"
  );
}

function onResize() {
  const shouldCompact = window.matchMedia("(max-width: 720px)").matches;

  if (shouldCompact !== state.compact) {
    state.compact = shouldCompact;
    renderTree();
  }

  centerTree();
}

function onWheel(event) {
  event.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const nextScale = clamp(state.scale * (event.deltaY > 0 ? 0.92 : 1.08), 0.4, 1.8);
  const scaleRatio = nextScale / state.scale;

  state.translateX = mouseX - (mouseX - state.translateX) * scaleRatio;
  state.translateY = mouseY - (mouseY - state.translateY) * scaleRatio;
  state.scale = nextScale;
  applyTransform();
}

function preventNativeGesture(event) {
  event.preventDefault();
}

function onPointerDown(event) {
  event.preventDefault();
  state.activePointers.set(event.pointerId, getPointerPoint(event));
  state.dragging = true;
  state.hasMoved = false;
  viewport.classList.add("is-dragging");

  if (viewport.setPointerCapture) {
    viewport.setPointerCapture(event.pointerId);
  }

  if (state.activePointers.size >= 2) {
    startPinchGesture();
    return;
  }

  startPanGesture(event);
}

function onPointerMove(event) {
  if (!state.activePointers.has(event.pointerId)) {
    return;
  }

  event.preventDefault();
  state.activePointers.set(event.pointerId, getPointerPoint(event));

  if (state.activePointers.size >= 2) {
    updatePinchGesture();
    return;
  }

  updatePanGesture(event);
}

function onPointerUp(event) {
  state.activePointers.delete(event.pointerId);

  if (state.hasMoved) {
    state.suppressClick = true;
    window.setTimeout(() => {
      state.suppressClick = false;
    }, 250);
  }

  if (viewport.hasPointerCapture(event.pointerId)) {
    viewport.releasePointerCapture(event.pointerId);
  }

  if (state.activePointers.size === 1) {
    const remainingPoint = [...state.activePointers.values()][0];
    state.gestureMode = "pan";
    state.dragStartX = remainingPoint.x;
    state.dragStartY = remainingPoint.y;
    state.startX = state.translateX;
    state.startY = state.translateY;
    return;
  }

  state.dragging = false;
  state.gestureMode = "idle";
  viewport.classList.remove("is-dragging");
}

function startPanGesture(event) {
  const point = getPointerPoint(event);

  state.gestureMode = "pan";
  state.dragStartX = point.x;
  state.dragStartY = point.y;
  state.startX = state.translateX;
  state.startY = state.translateY;
}

function updatePanGesture(event) {
  if (state.gestureMode !== "pan") {
    return;
  }

  const point = getPointerPoint(event);
  const movedX = point.x - state.dragStartX;
  const movedY = point.y - state.dragStartY;
  state.hasMoved = state.hasMoved || Math.hypot(movedX, movedY) > 6;
  state.translateX = state.startX + movedX;
  state.translateY = state.startY + movedY;
  applyTransform();
}

function startPinchGesture() {
  const [firstPoint, secondPoint] = getPrimaryGesturePoints();
  const center = getGestureCenter(firstPoint, secondPoint);

  state.gestureMode = "pinch";
  state.hasMoved = true;
  state.pinchStartDistance = getGestureDistance(firstPoint, secondPoint);
  state.pinchStartScale = state.scale;
  state.pinchStartCenterX = center.x;
  state.pinchStartCenterY = center.y;
  state.pinchStartTranslateX = state.translateX;
  state.pinchStartTranslateY = state.translateY;
}

function updatePinchGesture() {
  if (state.gestureMode !== "pinch") {
    startPinchGesture();
  }

  const [firstPoint, secondPoint] = getPrimaryGesturePoints();
  const center = getGestureCenter(firstPoint, secondPoint);
  const distance = getGestureDistance(firstPoint, secondPoint);

  if (!state.pinchStartDistance || !distance) {
    return;
  }

  const nextScale = clamp(state.pinchStartScale * (distance / state.pinchStartDistance), 0.35, 2.2);
  const scaleRatio = nextScale / state.pinchStartScale;

  state.hasMoved = true;
  state.scale = nextScale;
  state.translateX = center.x - (state.pinchStartCenterX - state.pinchStartTranslateX) * scaleRatio;
  state.translateY = center.y - (state.pinchStartCenterY - state.pinchStartTranslateY) * scaleRatio;
  applyTransform();
}

function getPointerPoint(event) {
  const rect = viewport.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function getPrimaryGesturePoints() {
  return [...state.activePointers.values()].slice(0, 2);
}

function getGestureCenter(firstPoint, secondPoint) {
  return {
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2
  };
}

function getGestureDistance(firstPoint, secondPoint) {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}

function zoomBy(amount) {
  state.scale = clamp(state.scale * amount, 0.4, 1.8);
  applyTransform();
}

function centerTree() {
  const canvasWidth = canvas.offsetWidth;
  const canvasHeight = canvas.offsetHeight;
  const viewportWidth = viewport.clientWidth;
  const viewportHeight = viewport.clientHeight;
  const padding = Math.min(80, Math.max(28, viewportWidth * 0.08));
  const widthScale = (viewportWidth - padding * 2) / canvasWidth;
  const heightScale = (viewportHeight - padding * 2) / canvasHeight;

  state.scale = Math.min(0.92, Math.max(0.26, Math.min(widthScale, heightScale)));
  state.translateX = (viewportWidth - canvasWidth * state.scale) / 2;
  state.translateY = Math.max(24, (viewportHeight - canvasHeight * state.scale) / 2);
  applyTransform();
}

function applyTransform() {
  canvas.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function getDisplayName(person) {
  return person.partner ? `${person.name} & ${person.partner.name}` : person.name;
}

function getMax(items, key) {
  return Math.max(...items.map((item) => item[key]));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
