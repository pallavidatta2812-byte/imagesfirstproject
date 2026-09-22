gsap.registerPlugin(Draggable);

const canvas = document.getElementById("canvas");
const fileInput = document.getElementById("file-input");
const addBtn = document.getElementById("add-btn");
const gridBtn = document.getElementById("grid-btn");
const scatterBtn = document.getElementById("scatter-btn");
const clearBtn = document.getElementById("clear-btn");
const countEl = document.getElementById("count");
const emptyState = document.getElementById("empty-state");

const ITEM_SIZE = 150;
const ITEM_MIN_SIZE = 90;
const ITEM_MAX_SIZE = 190;

let items = []; // { el, draggable }
let zCounter = 1;

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateCount() {
  countEl.textContent = items.length;
  emptyState.style.display = items.length ? "none" : "flex";
}

function bringToFront(el) {
  zCounter += 1;
  el.style.zIndex = zCounter;
}

function addImagesFromFiles(fileList) {
  [...fileList]
    .filter((file) => file.type.startsWith("image/"))
    .forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => createImageItem(event.target.result);
      reader.readAsDataURL(file);
    });
}

function createImageItem(src) {
  const rect = canvas.getBoundingClientRect();

  const wrapper = document.createElement("div");
  wrapper.className = "canvas-item";
  wrapper.style.width = `${ITEM_SIZE}px`;
  wrapper.style.height = `${ITEM_SIZE}px`;

  const img = document.createElement("img");
  img.src = src;
  img.draggable = false;
  img.alt = "";
  wrapper.appendChild(img);

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-btn";
  removeBtn.innerHTML = "&times;";
  removeBtn.setAttribute("aria-label", "Remove image");
  wrapper.appendChild(removeBtn);

  canvas.appendChild(wrapper);

  // Random "stack" placement near the center, spreading out a little
  // further as the pile grows, with a random tilt for a tossed-photo look.
  const centerX = rect.width / 2 - ITEM_SIZE / 2;
  const centerY = rect.height / 2 - ITEM_SIZE / 2;
  const spread = Math.min(rect.width, rect.height) * 0.28;
  const x = clamp(centerX + randRange(-spread, spread), 0, Math.max(0, rect.width - ITEM_SIZE));
  const y = clamp(centerY + randRange(-spread, spread), 0, Math.max(0, rect.height - ITEM_SIZE));
  const rotation = randRange(-18, 18);

  gsap.set(wrapper, { x, y, rotation, scale: 0, opacity: 0 });
  bringToFront(wrapper);
  gsap.to(wrapper, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" });

  const [draggable] = Draggable.create(wrapper, {
    type: "x,y",
    bounds: canvas,
    onPress() {
      bringToFront(wrapper);
      wrapper.classList.add("dragging");
    },
    onRelease() {
      wrapper.classList.remove("dragging");
    },
  });

  removeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    removeItem(wrapper, draggable);
  });

  items.push({ el: wrapper, draggable });
  updateCount();
}

function removeItem(wrapper, draggable) {
  gsap.to(wrapper, {
    scale: 0,
    opacity: 0,
    duration: 0.25,
    ease: "power1.in",
    onComplete() {
      draggable.kill();
      wrapper.remove();
      items = items.filter((item) => item.el !== wrapper);
      updateCount();
    },
  });
}

function arrangeGrid() {
  if (!items.length) return;

  const rect = canvas.getBoundingClientRect();
  const n = items.length;
  const cols = Math.max(1, Math.round(Math.sqrt((n * rect.width) / rect.height)));
  const rows = Math.ceil(n / cols);

  const cellW = rect.width / cols;
  const cellH = rect.height / rows;
  const gap = 16;
  const itemSize = clamp(Math.min(cellW, cellH) - gap, ITEM_MIN_SIZE, ITEM_MAX_SIZE);

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellW + (cellW - itemSize) / 2;
    const y = row * cellH + (cellH - itemSize) / 2;

    gsap.to(item.el, {
      x,
      y,
      rotation: 0,
      width: itemSize,
      height: itemSize,
      duration: 0.7,
      ease: "power2.inOut",
      delay: i * 0.02,
      onComplete() {
        item.draggable.update();
      },
    });
  });
}

function scatter() {
  if (!items.length) return;

  const rect = canvas.getBoundingClientRect();

  items.forEach((item, i) => {
    const size = item.el.offsetWidth;
    const x = randRange(0, Math.max(0, rect.width - size));
    const y = randRange(0, Math.max(0, rect.height - size));
    const rotation = randRange(-25, 25);

    bringToFront(item.el);
    gsap.to(item.el, {
      x,
      y,
      rotation,
      duration: 0.7,
      ease: "power2.inOut",
      delay: i * 0.02,
      onComplete() {
        item.draggable.update();
      },
    });
  });
}

function clearAll() {
  items.forEach((item) => {
    item.draggable.kill();
    item.el.remove();
  });
  items = [];
  updateCount();
}

// --- Toolbar events ---
addBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => {
  addImagesFromFiles(event.target.files);
  fileInput.value = "";
});
gridBtn.addEventListener("click", arrangeGrid);
scatterBtn.addEventListener("click", scatter);
clearBtn.addEventListener("click", clearAll);

// --- Drag & drop from the OS onto the canvas ---
["dragenter", "dragover"].forEach((evtName) => {
  canvas.addEventListener(evtName, (event) => {
    event.preventDefault();
    canvas.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((evtName) => {
  canvas.addEventListener(evtName, (event) => {
    if (evtName === "dragleave" && event.target !== canvas) return;
    canvas.classList.remove("drag-over");
  });
});

canvas.addEventListener("drop", (event) => {
  event.preventDefault();
  const files = event.dataTransfer?.files;
  if (files && files.length) addImagesFromFiles(files);
});

// Keep existing items within bounds if the window is resized.
window.addEventListener("resize", () => {
  items.forEach((item) => item.draggable.applyBounds(canvas));
});

updateCount();
