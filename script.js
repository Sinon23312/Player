/*
 * YONETE player — GitHub Pages
 * Pentru repository public GitHub Pages, folderul /piese este citit automat
 * prin GitHub Contents API. Nu este posibilă enumerarea automată a fișierelor
 * într-un folder static fără API/manifest.
 *
 * Pentru domeniu personalizat, completează githubOwner, githubRepo și branch.
 */
const CONFIG = {
  githubOwner: "",
  githubRepo: "",
  branch: "auto",
  musicFolder: "piese",
  artist: "YONETE"
};

const audio = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const playGlyph = document.getElementById("playGlyph");
const seek = document.getElementById("seek");
const volume = document.getElementById("volume");
const titleEl = document.getElementById("trackTitle");
const artistEl = document.getElementById("trackArtist");
const currentEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const listEl = document.getElementById("trackList");
const countEl = document.getElementById("trackCount");
const statusEl = document.getElementById("status");

let tracks = [];
let currentIndex = -1;
let shuffle = true;
let repeat = false;

const audioExtensions = /\.(mp3|m4a|aac|ogg|oga|wav|flac|opus)$/i;
const formatTime = value => {
  if (!Number.isFinite(value)) return "00:00";
  const m = Math.floor(value / 60);
  const s = Math.floor(value % 60);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};
const prettyName = file => decodeURIComponent(file.replace(/\.[^.]+$/,""))
  .replace(/[_-]+/g," ").replace(/\s+/g," ").trim();

function getRepoInfo() {
  if (CONFIG.githubOwner && CONFIG.githubRepo) {
    return {owner:CONFIG.githubOwner, repo:CONFIG.githubRepo, branch:CONFIG.branch};
  }
  const host = location.hostname;
  if (!host.endsWith(".github.io")) return null;
  const owner = host.split(".")[0];
  const parts = location.pathname.split("/").filter(Boolean);
  const repo = parts.length ? parts[0] : `${owner}.github.io`;
  return {owner, repo, branch:CONFIG.branch};
}

async function loadTracks() {
  statusEl.textContent = "Se caută automat piesele din /piese...";
  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    showError("Configurează repository-ul GitHub în script.js pentru a încărca automat piesele.");
    return;
  }
  try {
    let branch = repoInfo.branch;
    if (!branch || branch === "auto") {
      const repoResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`, {headers:{"Accept":"application/vnd.github+json"}});
      if (!repoResponse.ok) throw new Error(`Nu pot accesa repository-ul GitHub (${repoResponse.status}).`);
      const repoData = await repoResponse.json();
      branch = repoData.default_branch || "main";
    }
    const endpoint = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${CONFIG.musicFolder}?ref=${encodeURIComponent(branch)}`;
    const response = await fetch(endpoint, {headers:{"Accept":"application/vnd.github+json"}});
    if (!response.ok) throw new Error(response.status === 404 ? "Folderul piese nu există sau repository-ul nu este public." : `GitHub API: ${response.status}`);
    const files = await response.json();
    tracks = files
      .filter(file => file.type === "file" && audioExtensions.test(file.name))
      .sort((a,b) => a.name.localeCompare(b.name, "ro", {numeric:true}))
      .map(file => ({
        title: prettyName(file.name),
        artist: CONFIG.artist,
        url: file.download_url || `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${branch}/${CONFIG.musicFolder}/${encodeURIComponent(file.name)}`
      }));
    renderPlaylist();
    if (tracks.length) {
      statusEl.textContent = `${tracks.length} piese încărcate din folderul /${CONFIG.musicFolder}/`;
      loadTrack(0, false);
    } else {
      showError("Folderul /piese/ a fost găsit, dar nu conține fișiere audio suportate.");
    }
  } catch (error) {
    showError(`${error.message} Verifică dacă repository-ul este public și folderul se numește exact „piese”.`);
  }
}

function showError(message) {
  statusEl.textContent = message;
  listEl.innerHTML = `<div class="empty-state">${message}<small>Formate acceptate: MP3, M4A, AAC, OGG, WAV, FLAC.</small></div>`;
  countEl.textContent = "(0)";
}

function renderPlaylist() {
  countEl.textContent = `(${tracks.length})`;
  if (!tracks.length) {
    listEl.innerHTML = `<div class="empty-state">Nu există încă piese în folderul <b>piese</b>.</div>`;
    return;
  }
  listEl.innerHTML = "";
  tracks.forEach((track,index) => {
    const row = document.createElement("div");
    row.className = `track${index === currentIndex ? " active" : ""}`;
    row.innerHTML = `
      <img class="track-art" src="cover-art.jpg" alt="">
      <div class="track-info"><strong></strong><small>${CONFIG.artist}</small></div>
      <span class="track-duration" data-duration="${index}">--:--</span>
      <span class="track-play">${index === currentIndex && !audio.paused ? "♫" : "▶"}</span>`;
    row.querySelector("strong").textContent = track.title;
    row.addEventListener("click", () => { loadTrack(index); playAudio(); });
    listEl.appendChild(row);

    const probe = new Audio();
    probe.preload = "metadata";
    probe.src = track.url;
    probe.addEventListener("loadedmetadata", () => {
      const duration = row.querySelector(`[data-duration="${index}"]`);
      if (duration) duration.textContent = formatTime(probe.duration);
    }, {once:true});
  });
  updateActiveRow();
}
function updateActiveRow() {
  [...listEl.querySelectorAll(".track")].forEach((row,index) => {
    row.classList.toggle("active", index === currentIndex);
    const icon = row.querySelector(".track-play");
    if (icon) icon.textContent = index === currentIndex && !audio.paused ? "♫" : "▶";
  });
}
function loadTrack(index, autoplay=false) {
  if (!tracks.length) return;
  currentIndex = (index + tracks.length) % tracks.length;
  const track = tracks[currentIndex];
  audio.src = track.url;
  titleEl.textContent = track.title;
  artistEl.textContent = track.artist;
  currentEl.textContent = "00:00";
  durationEl.textContent = "00:00";
  seek.value = 0;
  updateActiveRow();
  if (autoplay) playAudio();
}
async function playAudio() {
  if (currentIndex < 0 && tracks.length) loadTrack(0);
  try { await audio.play(); }
  catch(e) { statusEl.textContent = "Browserul nu a putut reda piesa. Verifică fișierul audio."; }
}
function pauseAudio(){ audio.pause(); }
function nextTrack() {
  if (!tracks.length) return;
  let next = currentIndex + 1;
  if (shuffle && tracks.length > 1) {
    do { next = Math.floor(Math.random() * tracks.length); } while (next === currentIndex);
  }
  loadTrack(next, true);
}
function previousTrack() {
  if (!tracks.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  loadTrack(currentIndex - 1, true);
}
playBtn.addEventListener("click", () => audio.paused ? playAudio() : pauseAudio());
document.getElementById("prevBtn").addEventListener("click", previousTrack);
document.getElementById("nextBtn").addEventListener("click", nextTrack);
document.getElementById("shuffleBtn").addEventListener("click", toggleShuffle);
document.getElementById("shuffleIcon").addEventListener("click", toggleShuffle);
document.getElementById("repeatBtn").addEventListener("click", toggleRepeat);
document.getElementById("repeatIcon").addEventListener("click", toggleRepeat);
document.getElementById("listToggle").addEventListener("click", () => document.getElementById("playlistPanel").classList.toggle("collapsed"));
function toggleShuffle() {
  shuffle = !shuffle;
  document.getElementById("shuffleBtn").classList.toggle("active", shuffle);
  document.getElementById("shuffleIcon").classList.toggle("active", shuffle);
}
function toggleRepeat() {
  repeat = !repeat;
  document.getElementById("repeatBtn").classList.toggle("active", repeat);
  document.getElementById("repeatIcon").classList.toggle("active", repeat);
}
audio.addEventListener("play", () => { playGlyph.textContent = "Ⅱ"; playBtn.setAttribute("aria-label","Pause"); updateActiveRow(); });
audio.addEventListener("pause", () => { playGlyph.textContent = "▶"; playBtn.setAttribute("aria-label","Play"); updateActiveRow(); });
audio.addEventListener("loadedmetadata", () => { durationEl.textContent = formatTime(audio.duration); });
audio.addEventListener("timeupdate", () => {
  currentEl.textContent = formatTime(audio.currentTime);
  if (Number.isFinite(audio.duration) && audio.duration) seek.value = (audio.currentTime / audio.duration) * 100;
});
audio.addEventListener("ended", () => repeat ? (audio.currentTime=0, playAudio()) : nextTrack());
audio.addEventListener("error", () => { statusEl.textContent = "Eroare la redarea piesei. Verifică dacă MP3-ul a fost încărcat corect în GitHub."; });
seek.addEventListener("input", () => { if (audio.duration) audio.currentTime = (seek.value/100)*audio.duration; });
volume.addEventListener("input", () => { audio.volume = Number(volume.value); });
audio.volume = Number(volume.value);
loadTracks();
