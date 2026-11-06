/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");
let currentShows = [];
const sortBtn = document.getElementById("sortBtn");

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

async function getJSON(url) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error("Can't reach TVmaze. Check your internet connection.");
  }

  if (response.status === 429) {
    throw new Error("Too many requests. Please wait 10 seconds and try again.");
  }

  if (!response.ok) {
    if (response.status === 404 && USE_SAMPLE_DATA) {
      throw new Error(
        "Sample not found. Try searching for Friends or Sample."
      );
    }

    throw new Error(`Request failed. HTTP status: ${response.status}`);
  }

  return await response.json();
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in
modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);

// STEP 1 — Your first API request
// TODO: async function testRequest(): fetch searchURL("friends"), log the status and the JSON array

// STEP 2 — Search and show the results
// TODO: renderResults(items), searchShows(query), and a submit listener on the form

function renderDetails(show, cast, seasons) {
  detailsBody.replaceChildren();

  const poster = createPoster(show, "original");
  const title = el("h2", "", show.name);

  const network =
    show.network?.name ||
    show.webChannel?.name ||
    "Unknown network";

  const genres = show.genres?.length
    ? show.genres.join(", ")
    : "No genres";

  const runtime = show.runtime ?? show.averageRuntime;
  const runtimeText = runtime == null
    ? "Runtime unknown"
    : `${runtime} min`;

  const info = el(
    "p",
    "details-info",
    `${yearRange(show)} · ${network} · ${genres} · ${runtimeText}`
  );

  const ratingValue = show.rating?.average;

  const rating = el(
    "p",
    "details-rating",
    ratingValue == null ? "Not rated yet" : `★ ${ratingValue}`
  );

  const summary = el(
    "p",
    "details-summary",
    stripTags(show.summary)
  );

  const seasonCount = seasons.length;
  const seasonText = seasonCount === 1 ? "season" : "seasons";
  const seasonsInfo = el(
    "p",
    "seasons-info",
    `${seasonCount} ${seasonText}`
  );

  const castTitle = el("h3", "", "Cast");
  const list = el("ul", "cast-list");

  cast.slice(0, 6).forEach((member) => {
    const li = el("li", "", member.person.name + " ");
    li.append(el("span", "", "as " + member.character.name));
    list.append(li);
  });

  const link = el("a", "tvmaze-link", "View on TVmaze");
  link.href = show.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  detailsBody.append(
    poster,
    title,
    info,
    rating,
    summary,
    seasonsInfo,
    castTitle,
    list,
    link
  );
}

results.addEventListener("click", (event) => {
  const card = event.target.closest(".card");

  if (!card) return;

  showDetails(card.dataset.id);
});

function renderResults(items) {
  results.innerHTML = "";
  currentShows = items;

  if (items.length === 0) {
    setStatus("No shows found. Try another title.", "info");
    return;
  }

  items.forEach(item => {
    const show = item.show;

    const card = document.createElement("button");
    card.className = "card";
    card.type = "button";
    card.dataset.id = show.id;

    const poster = createPoster(show);
    const title = el("h2", "", show.name);
    const years = el("p", "years", yearRange(show));

    const genres = el(
      "p",
      "genres",
      show.genres?.join(", ") || "No genres"
    );

    const rating = el(
      "p",
      "rating",
      show.rating?.average
        ? `★ ${show.rating.average}`
        : "Not rated yet"
    );

    card.append(poster, title, years, genres, rating);
    results.appendChild(card);
  });

  setStatus(`${items.length} show(s) found.`, "info");
}

function sortByRating() {
  const sortedShows = [...currentShows].sort((a, b) => {
    const ratingA = a.show.rating?.average ?? -1;
    const ratingB = b.show.rating?.average ?? -1;

    return ratingB - ratingA;
  });

  renderResults(sortedShows);
}

sortBtn.addEventListener("click", sortByRating);

async function searchShows(query) {
  setStatus(`⏳ Searching for ${query}...`, "loading");

  try {
    const items = await getJSON(searchURL(query));

    if (items.length === 0) {
      setStatus(`No shows found for "${query}". Try another title.`, "error");
      results.innerHTML = "";
      return;
    }

    renderResults(items);

    const count = items.length;
    const word = count === 1 ? "show" : "shows";

    setStatus(`${count} ${word} found for "${query}".`, "info");

  } catch (error) {
    console.error(error);
    results.innerHTML = "";
    setStatus(error.message, "error");
  }
}

async function showDetails(id) {
  detailsBody.replaceChildren(
    el("p", "status loading", "Loading details…")
  );

  dialog.showModal();

  try {
    const start = performance.now();

    const [show, cast, seasons] = await Promise.all([
      getJSON(showURL(id)),
      getJSON(castURL(id)),
      getJSON(seasonsURL(id))
    ]);

    console.log(
      `3 requests in ${Math.round(performance.now() - start)} ms`
    );

    renderDetails(show, cast, seasons);

  } catch (error) {
    detailsBody.replaceChildren(
      el("p", "status error", error.message)
    );
  }
}

function renderDetails(show) {
  detailsBody.replaceChildren();

  const poster = createPoster(show, "original");

  const title = el("h2", "", show.name);

  const network =
    show.network?.name ||
    show.webChannel?.name ||
    "Unknown network";

  const genres = show.genres?.length
    ? show.genres.join(", ")
    : "No genres";

  const runtime = show.runtime ?? show.averageRuntime;
  const runtimeText = runtime == null
    ? "Runtime unknown"
    : `${runtime} min`;

  const info = el(
    "p",
    "details-info",
    `${yearRange(show)} · ${network} · ${genres} · ${runtimeText}`
  );

  const ratingValue = show.rating?.average;

  const rating = el(
    "p",
    "details-rating",
    ratingValue == null ? "Not rated yet" : `★ ${ratingValue}`
  );

  const summary = el(
    "p",
    "details-summary",
    stripTags(show.summary)
  );

  const link = el("a", "tvmaze-link", "View on TVmaze");
  link.href = show.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  detailsBody.append(
    poster,
    title,
    info,
    rating,
    summary,
    link
  );
}

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const query = input.value.trim();

  if (!query) return;

  searchShows(query);
});

// STEP 3 — getJSON(): one careful helper for every request
// TODO: catch network errors, check 429 and response.ok; rewrite searchShows with try / catch and an empty-array check

// STEP 4 — Click a show to see its details
// TODO: one click listener on #results, showDetails(id), renderDetails(show)

// STEP 5 — Promise.all: show + cast + seasons at the same time
// TODO: rewrite showDetails with Promise.all, and renderDetails(show, cast, seasons)
