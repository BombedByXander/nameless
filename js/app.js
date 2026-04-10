const STORAGE_KEY = "nameless-library-v1";

const dom = {
  featuredGrid: document.getElementById("featuredGrid"),
  emptyState: document.getElementById("emptyState"),
  projectList: document.getElementById("projectList"),
  queueList: document.getElementById("queueList"),
  cardTemplate: document.getElementById("cardTemplate"),
  audioPlayer: document.getElementById("audioPlayer"),
  floatingAddButton: document.getElementById("floatingAddButton"),
  createProjectButton: document.getElementById("createProjectButton"),
  quickProjectButton: document.getElementById("quickProjectButton"),
  emptyCreateButton: document.getElementById("emptyCreateButton"),
  recordSongButton: document.getElementById("recordSongButton"),
  emptyRecordButton: document.getElementById("emptyRecordButton"),
  homeButton: document.getElementById("homeButton"),
  projectModal: document.getElementById("projectModal"),
  songModal: document.getElementById("songModal"),
  projectDetailModal: document.getElementById("projectDetailModal"),
  projectForm: document.getElementById("projectForm"),
  songForm: document.getElementById("songForm"),
  songProjectSelect: document.getElementById("songProjectSelect"),
  recordProjectSelect: document.getElementById("recordProjectSelect"),
  startRecordingButton: document.getElementById("startRecordingButton"),
  stopRecordingButton: document.getElementById("stopRecordingButton"),
  recordingStatus: document.getElementById("recordingStatus"),
  recordingTimer: document.getElementById("recordingTimer"),
  recordingPreview: document.getElementById("recordingPreview"),
  nowPlayingCover: document.getElementById("nowPlayingCover"),
  nowPlayingTitle: document.getElementById("nowPlayingTitle"),
  nowPlayingMeta: document.getElementById("nowPlayingMeta"),
  statProjects: document.getElementById("statProjects"),
  statSongs: document.getElementById("statSongs"),
  statDuration: document.getElementById("statDuration"),
  detailTitle: document.getElementById("detailTitle"),
  detailCover: document.getElementById("detailCover"),
  detailType: document.getElementById("detailType"),
  detailArtist: document.getElementById("detailArtist"),
  detailDescription: document.getElementById("detailDescription"),
  detailTracklist: document.getElementById("detailTracklist"),
  detailAddSongButton: document.getElementById("detailAddSongButton"),
  detailPlayProjectButton: document.getElementById("detailPlayProjectButton"),
};

const state = loadState();
let activeProjectId = null;
let recorderState = {
  mediaRecorder: null,
  stream: null,
  chunks: [],
  startedAt: 0,
  timerId: null,
  recordingBlob: null,
};

seedLibraryIfEmpty();
render();

dom.createProjectButton.addEventListener("click", openProjectModal);
dom.quickProjectButton.addEventListener("click", openProjectModal);
dom.emptyCreateButton.addEventListener("click", openProjectModal);
dom.recordSongButton.addEventListener("click", () => openSongModal("record"));
dom.emptyRecordButton.addEventListener("click", () => openSongModal("record"));
dom.floatingAddButton.addEventListener("click", () => openSongModal("upload"));
dom.homeButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

dom.projectForm.addEventListener("submit", handleCreateProject);
dom.songForm.addEventListener("submit", handleSaveSong);
dom.startRecordingButton.addEventListener("click", startRecording);
dom.stopRecordingButton.addEventListener("click", stopRecording);
dom.detailAddSongButton.addEventListener("click", () => openSongModal("upload", activeProjectId));
dom.detailPlayProjectButton.addEventListener("click", playProject);
dom.audioPlayer.addEventListener("ended", handleTrackEnded);
dom.songModal.addEventListener("close", resetRecorderUi);
dom.projectModal.addEventListener("close", () => dom.projectForm.reset());

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const modalId = button.getAttribute("data-close-modal");
    document.getElementById(modalId)?.close();
  });
});

document.querySelectorAll(".tab").forEach((tabButton) => {
  tabButton.addEventListener("click", () => {
    const targetId = tabButton.getAttribute("data-tab-target");
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
    tabButton.classList.add("active");
    document.getElementById(targetId)?.classList.add("active");
  });
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { projects: [], songs: [], queue: [], nowPlayingId: null };
    }
    return JSON.parse(raw);
  } catch (error) {
    return { projects: [], songs: [], queue: [], nowPlayingId: null };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seedLibraryIfEmpty() {
  if (state.projects.length || state.songs.length) {
    return;
  }

  const projectA = createProjectObject({
    name: "Transcendence",
    artist: "prodbyxander",
    description: "An atmospheric placeholder project showing how uploaded releases appear.",
    typePreference: "single",
    coverDataUrl: buildGradientCover("#7a3cff", "#1a0530"),
  });

  const projectB = createProjectObject({
    name: "Fake",
    artist: "wfiskeleton, ja",
    description: "A second placeholder card to mirror the reference while real uploads replace it.",
    typePreference: "single",
    coverDataUrl: buildGradientCover("#ff8b2d", "#230408"),
  });

  state.projects.push(projectA, projectB);
  state.songs.push(
    createSongObject({
      projectId: projectA.id,
      title: "Transcendence",
      artist: "prodbyxander",
      coverDataUrl: projectA.coverDataUrl,
    }),
    createSongObject({
      projectId: projectB.id,
      title: "fake",
      artist: "wfiskeleton, ja",
      coverDataUrl: projectB.coverDataUrl,
    }),
  );
  saveState();
}

function createProjectObject({ name, artist, description, typePreference, coverDataUrl }) {
  return {
    id: crypto.randomUUID(),
    name,
    artist,
    description,
    typePreference,
    coverDataUrl: coverDataUrl || "",
    createdAt: Date.now(),
  };
}

function createSongObject({ projectId, title, artist, audioDataUrl = "", audioMimeType = "", coverDataUrl = "", duration = 0 }) {
  return {
    id: crypto.randomUUID(),
    projectId,
    title,
    artist,
    audioDataUrl,
    audioMimeType,
    coverDataUrl,
    duration,
    createdAt: Date.now(),
  };
}

function render() {
  renderFeatured();
  renderProjects();
  renderQueue();
  renderStats();
  renderNowPlaying();
  populateProjectSelects();
}

function renderFeatured() {
  const sortedSongs = [...state.songs].sort((a, b) => b.createdAt - a.createdAt);
  dom.featuredGrid.innerHTML = "";
  const hasSongs = sortedSongs.length > 0;
  dom.emptyState.classList.toggle("hidden", hasSongs);
  dom.featuredGrid.classList.toggle("hidden", !hasSongs);

  sortedSongs.slice(0, 8).forEach((song) => {
    const project = state.projects.find((item) => item.id === song.projectId);
    const fragment = dom.cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".music-card");
    const cover = fragment.querySelector(".cover-art");
    const playButton = fragment.querySelector(".play-button");
    const title = fragment.querySelector("h3");
    const artist = fragment.querySelector(".card-artist");
    const projectLabel = fragment.querySelector(".card-project");
    const moreButton = fragment.querySelector(".more-button");

    applyArtwork(cover, song.coverDataUrl || project?.coverDataUrl);
    title.textContent = song.title;
    artist.textContent = song.artist;
    projectLabel.textContent = project ? `${formatProjectType(getProjectType(project.id))} / ${project.name}` : "Unsorted track";
    playButton.addEventListener("click", () => playSong(song.id, true));
    moreButton.addEventListener("click", () => openProjectDetail(song.projectId));
    dom.featuredGrid.appendChild(card);
  });
}

function renderProjects() {
  dom.projectList.innerHTML = "";
  if (!state.projects.length) {
    dom.projectList.innerHTML = `<div class="project-row"><div><strong>No projects yet</strong><p class="project-meta">Create one to start uploading or recording songs.</p></div></div>`;
    return;
  }

  const sortedProjects = [...state.projects].sort((a, b) => b.createdAt - a.createdAt);
  sortedProjects.forEach((project) => {
    const trackCount = getSongsForProject(project.id).length;
    const projectRow = document.createElement("article");
    projectRow.className = "project-row";
    const thumb = document.createElement("div");
    thumb.className = "project-thumb";
    applyArtwork(thumb, project.coverDataUrl);

    const copy = document.createElement("div");
    copy.innerHTML = `
      <div class="project-name-row">
        <strong>${escapeHtml(project.name)}</strong>
        <span class="type-chip">${formatProjectType(getProjectType(project.id))}</span>
      </div>
      <p class="project-meta">${escapeHtml(project.artist)} / ${trackCount} ${trackCount === 1 ? "track" : "tracks"}</p>
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Open";
    button.addEventListener("click", () => openProjectDetail(project.id));

    projectRow.append(thumb, copy, button);
    dom.projectList.appendChild(projectRow);
  });
}

function renderQueue() {
  dom.queueList.innerHTML = "";
  const queueSongs = state.queue.map((songId) => state.songs.find((song) => song.id === songId)).filter(Boolean);

  if (!queueSongs.length) {
    dom.queueList.innerHTML = `<div class="queue-item"><div><strong>Queue is empty</strong><p>Add songs from the library or play a full project.</p></div></div>`;
    return;
  }

  queueSongs.forEach((song) => {
    const project = state.projects.find((item) => item.id === song.projectId);
    const item = document.createElement("article");
    item.className = "queue-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(song.title)}</strong>
        <p>${escapeHtml(song.artist)}${project ? ` / ${escapeHtml(project.name)}` : ""}</p>
      </div>
    `;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Play";
    button.addEventListener("click", () => playSong(song.id));
    item.appendChild(button);
    dom.queueList.appendChild(item);
  });
}

function renderStats() {
  dom.statProjects.textContent = String(state.projects.length);
  dom.statSongs.textContent = String(state.songs.length);
  const totalMinutes = Math.round(state.songs.reduce((sum, song) => sum + (song.duration || 0), 0) / 60);
  dom.statDuration.textContent = `${totalMinutes}m`;
}

function renderNowPlaying() {
  const song = state.songs.find((item) => item.id === state.nowPlayingId);
  if (!song) {
    dom.nowPlayingTitle.textContent = "Select a song";
    dom.nowPlayingMeta.textContent = "Your preview player will appear here.";
    dom.audioPlayer.removeAttribute("src");
    dom.audioPlayer.load();
    applyArtwork(dom.nowPlayingCover, "");
    return;
  }

  const project = state.projects.find((item) => item.id === song.projectId);
  dom.nowPlayingTitle.textContent = song.title;
  dom.nowPlayingMeta.textContent = `${song.artist}${project ? ` / ${project.name}` : ""}`;
  applyArtwork(dom.nowPlayingCover, song.coverDataUrl || project?.coverDataUrl);
  if (song.audioDataUrl && dom.audioPlayer.src !== song.audioDataUrl) {
    dom.audioPlayer.src = song.audioDataUrl;
    dom.audioPlayer.play().catch(() => {});
  }
}

function populateProjectSelects() {
  const projects = [...state.projects].sort((a, b) => b.createdAt - a.createdAt);
  const buildOptions = () => {
    if (!projects.length) {
      return `<option value="">Create a project first</option>`;
    }
    return projects
      .map((project) => `<option value="${project.id}">${escapeHtml(project.name)} / ${formatProjectType(getProjectType(project.id))}</option>`)
      .join("");
  };

  dom.songProjectSelect.innerHTML = buildOptions();
  dom.recordProjectSelect.innerHTML = buildOptions();
}

function openProjectModal() {
  dom.projectForm.reset();
  dom.projectModal.showModal();
}

function openSongModal(tabName = "upload", projectId = "") {
  if (!state.projects.length) {
    openProjectModal();
    return;
  }
  resetRecorderUi();
  dom.songForm.reset();
  dom.songProjectSelect.value = projectId || state.projects[0].id;
  dom.recordProjectSelect.value = projectId || state.projects[0].id;
  switchSongTab(tabName);
  dom.songModal.showModal();
}

function switchSongTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
  const targetTab = tabName === "record" ? "recordTab" : "uploadTab";
  document.querySelector(`[data-tab-target="${targetTab}"]`)?.classList.add("active");
  document.getElementById(targetTab)?.classList.add("active");
}

async function handleCreateProject(event) {
  event.preventDefault();
  const formData = new FormData(dom.projectForm);
  const coverFile = formData.get("cover");
  const coverDataUrl = coverFile instanceof File && coverFile.size ? await readFileAsDataUrl(coverFile) : "";
  const project = createProjectObject({
    name: String(formData.get("name")).trim(),
    artist: String(formData.get("artist")).trim(),
    description: String(formData.get("description")).trim(),
    typePreference: String(formData.get("type")).trim() || "auto",
    coverDataUrl,
  });

  state.projects.unshift(project);
  saveState();
  render();
  dom.projectModal.close();
  openProjectDetail(project.id);
}

async function handleSaveSong(event) {
  event.preventDefault();
  const uploadActive = document.getElementById("uploadTab").classList.contains("active");
  const formData = new FormData(dom.songForm);

  if (uploadActive) {
    const audioFile = formData.get("audio");
    if (!(audioFile instanceof File) || !audioFile.size) {
      alert("Please choose an audio file.");
      return;
    }

    const trackCover = formData.get("trackCover");
    const [audioDataUrl, coverDataUrl, duration] = await Promise.all([
      readFileAsDataUrl(audioFile),
      trackCover instanceof File && trackCover.size ? readFileAsDataUrl(trackCover) : Promise.resolve(""),
      getAudioDuration(audioFile),
    ]);

    const song = createSongObject({
      projectId: String(formData.get("projectId")),
      title: String(formData.get("title")).trim(),
      artist: String(formData.get("trackArtist")).trim(),
      audioDataUrl,
      audioMimeType: audioFile.type,
      coverDataUrl,
      duration,
    });

    state.songs.unshift(song);
    if (!state.queue.includes(song.id)) {
      state.queue.unshift(song.id);
    }
  } else {
    if (!recorderState.recordingBlob) {
      alert("Please record a song first.");
      return;
    }

    const title = String(formData.get("recordTitle")).trim() || `Voice memo ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const artist = String(formData.get("recordArtist")).trim() || "Untitled artist";
    const audioFile = new File([recorderState.recordingBlob], `${title}.webm`, { type: recorderState.recordingBlob.type || "audio/webm" });
    const [audioDataUrl, duration] = await Promise.all([readFileAsDataUrl(audioFile), getAudioDuration(audioFile)]);

    const song = createSongObject({
      projectId: String(formData.get("recordProjectId")),
      title,
      artist,
      audioDataUrl,
      audioMimeType: audioFile.type,
      duration,
    });

    state.songs.unshift(song);
    state.queue.unshift(song.id);
  }

  saveState();
  render();
  dom.songModal.close();
  const selectedProjectId = uploadActive ? String(formData.get("projectId")) : String(formData.get("recordProjectId"));
  openProjectDetail(selectedProjectId);
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    alert("Recording is not supported in this browser.");
    return;
  }

  try {
    recorderState.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorderState.chunks = [];
    recorderState.mediaRecorder = new MediaRecorder(recorderState.stream);
    recorderState.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) {
        recorderState.chunks.push(event.data);
      }
    });
    recorderState.mediaRecorder.addEventListener("stop", () => {
      recorderState.recordingBlob = new Blob(recorderState.chunks, { type: recorderState.mediaRecorder.mimeType || "audio/webm" });
      const previewUrl = URL.createObjectURL(recorderState.recordingBlob);
      dom.recordingPreview.src = previewUrl;
      dom.recordingPreview.classList.remove("hidden");
      dom.recordingStatus.textContent = "Recording saved";
      cleanupRecorderStream();
    });
    recorderState.startedAt = Date.now();
    recorderState.timerId = window.setInterval(updateRecordingTimer, 500);
    recorderState.mediaRecorder.start();
    dom.recordingStatus.textContent = "Recording...";
    dom.startRecordingButton.disabled = true;
    dom.stopRecordingButton.disabled = false;
    updateRecordingTimer();
  } catch (error) {
    alert("Microphone permission is required to record.");
  }
}

function stopRecording() {
  if (!recorderState.mediaRecorder || recorderState.mediaRecorder.state === "inactive") {
    return;
  }
  recorderState.mediaRecorder.stop();
  dom.startRecordingButton.disabled = false;
  dom.stopRecordingButton.disabled = true;
  clearInterval(recorderState.timerId);
}

function cleanupRecorderStream() {
  recorderState.stream?.getTracks().forEach((track) => track.stop());
  recorderState.stream = null;
  recorderState.mediaRecorder = null;
}

function resetRecorderUi() {
  if (recorderState.mediaRecorder && recorderState.mediaRecorder.state !== "inactive") {
    recorderState.mediaRecorder.stop();
  }
  cleanupRecorderStream();
  clearInterval(recorderState.timerId);
  recorderState.timerId = null;
  recorderState.recordingBlob = null;
  dom.recordingPreview.classList.add("hidden");
  dom.recordingPreview.removeAttribute("src");
  dom.recordingStatus.textContent = "Recorder idle";
  dom.recordingTimer.textContent = "00:00";
  dom.startRecordingButton.disabled = false;
  dom.stopRecordingButton.disabled = true;
}

function updateRecordingTimer() {
  const elapsedSeconds = Math.floor((Date.now() - recorderState.startedAt) / 1000);
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");
  dom.recordingTimer.textContent = `${minutes}:${seconds}`;
}

function openProjectDetail(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) {
    return;
  }

  activeProjectId = projectId;
  const projectSongs = getSongsForProject(projectId);
  dom.detailTitle.textContent = project.name;
  dom.detailType.textContent = formatProjectType(getProjectType(projectId));
  dom.detailArtist.textContent = project.artist;
  dom.detailDescription.textContent = project.description || "No description yet. Add tracks to shape the release.";
  applyArtwork(dom.detailCover, project.coverDataUrl);
  dom.detailTracklist.innerHTML = "";

  if (!projectSongs.length) {
    dom.detailTracklist.innerHTML = `<div class="detail-track"><div><strong>Empty project</strong><p>Upload files anytime or record a draft into this release.</p></div></div>`;
  } else {
    projectSongs.forEach((song, index) => {
      const track = document.createElement("article");
      track.className = "detail-track";
      track.innerHTML = `
        <div>
          <strong>${index + 1}. ${escapeHtml(song.title)}</strong>
          <p>${escapeHtml(song.artist)}${song.duration ? ` / ${formatDuration(song.duration)}` : ""}</p>
        </div>
      `;
      const playButton = document.createElement("button");
      playButton.type = "button";
      playButton.textContent = "Play";
      playButton.addEventListener("click", () => playSong(song.id, true));
      track.appendChild(playButton);
      dom.detailTracklist.appendChild(track);
    });
  }

  dom.projectDetailModal.showModal();
}

function playProject() {
  if (!activeProjectId) {
    return;
  }
  const songs = getSongsForProject(activeProjectId);
  if (!songs.length) {
    return;
  }
  state.queue = songs.map((song) => song.id);
  saveState();
  renderQueue();
  playSong(songs[0].id);
}

function playSong(songId, prioritize = false) {
  const song = state.songs.find((item) => item.id === songId);
  if (!song) {
    return;
  }
  state.nowPlayingId = songId;
  if (prioritize) {
    state.queue = [songId, ...state.queue.filter((id) => id !== songId)];
  } else if (!state.queue.includes(songId)) {
    state.queue.push(songId);
  }
  saveState();
  renderQueue();
  renderNowPlaying();
}

function handleTrackEnded() {
  const currentIndex = state.queue.findIndex((id) => id === state.nowPlayingId);
  const nextSongId = currentIndex >= 0 ? state.queue[currentIndex + 1] : null;
  if (nextSongId) {
    playSong(nextSongId);
  }
}

function getSongsForProject(projectId) {
  return state.songs.filter((song) => song.projectId === projectId).sort((a, b) => a.createdAt - b.createdAt);
}

function getProjectType(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  const songs = getSongsForProject(projectId);
  if (!project || project.typePreference !== "auto") {
    return project?.typePreference || "single";
  }

  const count = songs.length;
  if (count <= 3) {
    return "single";
  }
  if (count <= 6) {
    return "ep";
  }
  if (count <= 12) {
    return "album";
  }
  if (count <= 15) {
    return "lp";
  }
  return "mixtape";
}

function formatProjectType(type) {
  const map = {
    single: "Single",
    ep: "EP",
    album: "Album",
    lp: "LP",
    mixtape: "Mixtape",
    auto: "Auto",
  };
  return map[type] || "Release";
}

function applyArtwork(element, dataUrl) {
  if (!dataUrl) {
    element.classList.remove("has-image");
    element.style.backgroundImage = "";
    return;
  }
  element.classList.add("has-image");
  element.style.backgroundImage = `url("${dataUrl}")`;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getAudioDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = url;
    audio.addEventListener("loadedmetadata", () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      URL.revokeObjectURL(url);
    });
    audio.addEventListener("error", () => {
      resolve(0);
      URL.revokeObjectURL(url);
    });
  });
}

function buildGradientCover(start, end) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
      <defs>
        <linearGradient id="bg" x1="50%" x2="50%" y1="0%" y2="100%">
          <stop stop-color="${start}" offset="0%"/>
          <stop stop-color="${end}" offset="100%"/>
        </linearGradient>
      </defs>
      <rect width="640" height="640" fill="url(#bg)"/>
      <circle cx="320" cy="190" r="90" fill="rgba(255,255,255,0.18)"/>
      <path d="M110 480C180 360 255 310 320 310s140 50 210 170H110Z" fill="rgba(255,255,255,0.12)"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
