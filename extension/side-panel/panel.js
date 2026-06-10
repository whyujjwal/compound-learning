const API_BASE = "http://localhost:8000/api";

const elements = {
  title: document.getElementById("title"),
  track: document.getElementById("track"),
  difficulty: document.getElementById("difficulty"),
  saveBtn: document.getElementById("save-btn"),
  status: document.getElementById("status"),
};

let currentTab = null;
let pageContent = "";

function showStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.className = "status " + (isError ? "error" : "success");
}

async function init() {
  try {
    // 1. Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showStatus("Could not identify current tab", true);
      return;
    }
    currentTab = tab;
    elements.title.value = tab.title || tab.url;

    // 2. Fetch tracks from backend
    const tracksRes = await fetch(`${API_BASE}/tracks`, { credentials: "include" });
    if (!tracksRes.ok) throw new Error("Failed to fetch tracks. Are you logged in to Compound on localhost:8000?");
    const tracks = await tracksRes.json();
    
    elements.track.innerHTML = "";
    if (tracks.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No tracks found";
      elements.track.appendChild(opt);
    } else {
      tracks.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name;
        elements.track.appendChild(opt);
      });
      elements.saveBtn.disabled = false;
    }

    // 3. Extract page content in background
    if (tab.url && !tab.url.startsWith("chrome://")) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // A very naive article extractor: take text from main, article, or body
          const main = document.querySelector('main, article');
          if (main) return main.innerText;
          return document.body.innerText;
        }
      });
      if (results && results[0]) {
        pageContent = results[0].result;
      }
    }
  } catch (err) {
    showStatus(err.message, true);
    console.error(err);
  }
}

elements.saveBtn.addEventListener("click", async () => {
  try {
    elements.saveBtn.disabled = true;
    showStatus("Saving and generating cards...");

    const trackId = elements.track.value;
    const difficulty = parseFloat(elements.difficulty.value);

    // Send to backend
    const res = await fetch(`${API_BASE}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        track_id: trackId,
        title: currentTab.title,
        external_url: currentTab.url,
        raw_content: pageContent || currentTab.title,
        cognitive_cost_multiplier: difficulty,
        resource_type: "article",
        estimated_minutes: 15
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to save: ${res.status} ${errorText}`);
    }

    showStatus("Saved! AI is generating cards in the background.");
    setTimeout(() => window.close(), 2000);
  } catch (err) {
    showStatus(err.message, true);
    elements.saveBtn.disabled = false;
  }
});

// Start
init();
