const socket = io();
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const colorPicker = document.getElementById("colorPicker");
const sizeSlider = document.getElementById("sizeSlider");
const eraserBtn = document.getElementById("eraserBtn");
const clearBtn = document.getElementById("clearBtn");
const userList = document.getElementById("userList");

let username = prompt("Enter your name:") || "Guest";
let brushColor = colorPicker.value;
let brushSize = sizeSlider.value;
let isEraser = false;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* === Toast Notifications === */
function showToast(message, color = "#00e0ff") {
  const container = document.getElementById("notifications");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.borderLeft = `4px solid ${color}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => container.removeChild(toast), 400);
  }, 2500);
}

/* === Brush controls === */
colorPicker.addEventListener("input", (e) => (brushColor = e.target.value));
sizeSlider.addEventListener("input", (e) => (brushSize = e.target.value));

eraserBtn.addEventListener("click", () => {
  isEraser = !isEraser;
  eraserBtn.textContent = isEraser ? "🎨 Brush" : "🧽 Eraser";
});

clearBtn.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit("draw:clear");
});

/* === Drawing Logic === */
let drawing = false;

canvas.addEventListener("pointerdown", (e) => {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
  socket.emit("draw:start", { x: e.offsetX, y: e.offsetY });
});

canvas.addEventListener("pointermove", (e) => {
  if (!drawing) {
    socket.emit("cursor:move", { x: e.clientX, y: e.clientY });
    return;
  }

  ctx.lineWidth = brushSize;
ctx.lineCap = "round";

if (isEraser) {
  ctx.globalCompositeOperation = "destination-out";
} else {
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = brushColor;
}

ctx.lineTo(e.offsetX, e.offsetY);
ctx.stroke();


  socket.emit("draw:point", {
    x: e.offsetX,
    y: e.offsetY,
    color: brushColor,
    size: brushSize,
    erase: isEraser,
  });
});

window.addEventListener("pointerup", () => {
  drawing = false;
  socket.emit("draw:end");
});

/* === Receive Drawing Data === */
socket.on("draw:start", ({ x, y }) => {
  ctx.beginPath();
  ctx.moveTo(x, y);
});

socket.on("draw:point", ({ x, y, color, size, erase }) => {
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.strokeStyle = erase ? "#0b0f12" : color;
  ctx.lineTo(x, y);
  ctx.stroke();
});

socket.on("draw:clear", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

/* === User Logic === */
socket.emit("user:join", { username });

socket.on("user:list", (users) => {
  userList.textContent = users.map((u) => u.username).join(", ");
});

socket.on("user:joined", (username) => {
  showToast(`🎉 ${username} joined the room`, "#00e0ff");
});

socket.on("user:leftNotify", (username) => {
  showToast(`👋 ${username} left the room`, "#ff4444");
});

/* === Cursor Handling === */
const cursors = {};

socket.on("cursor:move", ({ id, x, y, username }) => {
  let cursor = cursors[id];
  if (!cursor) {
    cursor = document.createElement("div");
    cursor.classList.add("user-cursor");
    cursor.textContent = username;
    document.body.appendChild(cursor);
    cursors[id] = cursor;
  }
  cursor.style.left = x + "px";
  cursor.style.top = y + "px";
});

socket.on("user:left", (id) => {
  if (cursors[id]) {
    cursors[id].remove();
    delete cursors[id];
  }
});
