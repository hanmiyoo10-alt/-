const $ = (id) => document.getElementById(id);

const state = {
  session: null,
  path: null,
  chunkIndex: 0,
  chunkCount: 0,
  characterCount: 0,
  dirtyChunk: false,
  inputSamples: [],
  flushTimer: null,
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function setStatus(text, isError = false) {
  $("saveState").textContent = text;
  $("saveState").classList.toggle("error", isError);
}

function updateNavigation() {
  $("prev").disabled = !state.session || state.chunkIndex <= 0;
  $("next").disabled = !state.session || state.chunkIndex >= state.chunkCount - 1;
  $("save").disabled = !state.session;
  $("chunkLabel").textContent = state.session
    ? `${state.chunkIndex + 1} / ${state.chunkCount}`
    : "0 / 0";
}

async function loadFiles() {
  const data = await request("/api/files");
  const select = $("fileSelect");
  select.replaceChildren();

  if (!data.files.length) {
    const option = document.createElement("option");
    option.textContent = "지원되는 파일이 없습니다";
    option.value = "";
    select.append(option);
    return;
  }

  for (const path of data.files) {
    const option = document.createElement("option");
    option.value = path;
    option.textContent = path;
    select.append(option);
  }
}

async function flushChunk() {
  if (!state.session || !state.dirtyChunk) return;
  const text = $("editor").value;
  await request("/api/chunk", {
    method: "POST",
    body: JSON.stringify({
      session: state.session,
      index: state.chunkIndex,
      text,
    }),
  });
  state.dirtyChunk = false;
  setStatus("메모리에 반영됨 · 파일 저장 필요");
}

function queueChunkFlush() {
  clearTimeout(state.flushTimer);
  state.flushTimer = setTimeout(() => {
    flushChunk().catch((error) => setStatus(error.message, true));
  }, 300);
}

async function loadChunk(index) {
  await flushChunk();
  const data = await request(
    `/api/chunk?session=${encodeURIComponent(state.session)}&index=${index}`
  );
  state.chunkIndex = index;
  $("editor").value = data.text;
  $("editor").scrollTop = 0;
  updateNavigation();
}

async function openSelectedFile() {
  const path = $("fileSelect").value;
  if (!path) return;

  setStatus("여는 중…");
  const data = await request("/api/open", {
    method: "POST",
    body: JSON.stringify({ path }),
  });

  state.session = data.session;
  state.path = data.path;
  state.chunkIndex = 0;
  state.chunkCount = data.chunkCount;
  state.characterCount = data.characterCount;
  state.dirtyChunk = false;

  $("documentMeta").textContent =
    `${state.path} · ${state.characterCount.toLocaleString()}자 · ${state.chunkCount} chunks`;
  $("editor").disabled = false;
  setStatus("저장됨");

  await loadChunk(0);
  $("editor").focus();
}

async function saveDocument() {
  await flushChunk();
  setStatus("파일 저장 중…");
  await request("/api/save", {
    method: "POST",
    body: JSON.stringify({ session: state.session }),
  });
  setStatus("파일 저장 완료");
}

function recordInputLatency() {
  const start = performance.now();
  requestAnimationFrame(() => {
    const latency = performance.now() - start;
    state.inputSamples.push(latency);
    if (state.inputSamples.length > 50) state.inputSamples.shift();
    const sorted = [...state.inputSamples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    $("latency").textContent = `input → paint median: ${median.toFixed(1)} ms`;
  });
}

$("editor").addEventListener("input", () => {
  state.dirtyChunk = true;
  setStatus("편집 중…");
  queueChunkFlush();
  recordInputLatency();
});

$("prev").addEventListener("click", () => loadChunk(state.chunkIndex - 1));
$("next").addEventListener("click", () => loadChunk(state.chunkIndex + 1));
$("save").addEventListener("click", () =>
  saveDocument().catch((error) => setStatus(error.message, true))
);
$("openFile").addEventListener("click", () =>
  openSelectedFile().catch((error) => setStatus(error.message, true))
);
$("refreshFiles").addEventListener("click", () =>
  loadFiles().catch((error) => setStatus(error.message, true))
);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushChunk().catch(() => {});
  }
});

loadFiles().catch((error) => setStatus(error.message, true));
