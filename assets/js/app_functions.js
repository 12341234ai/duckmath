const supabaseUrl = "https://hqlgppguxhqeaonjzinv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxbGdwcGd1eGhxZWFvbmp6aW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2MjYwNDQsImV4cCI6MjA0ODIwMjA0NH0.4LuWk4qxp0NRZ5_erEIJq5BHq5qZiSE4zTUFS1ioZw8";
let supabaseClient = null;

try {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
  }
} catch (error) {
  console.warn("Supabase unavailable; using local fallback data.", error);
}

function getDescriptionFromMarkdown(markdown) {
  if (!markdown || typeof markdown !== "string") {
    return "";
  }

  const descriptionSection = markdown.split("## Description");
  if (descriptionSection[1]) {
    const creatorSection = descriptionSection[1].split("## Creator")[0];
    return creatorSection.replace(/\n+/g, " ").trim();
  }

  return markdown.replace(/\n+/g, " ").trim();
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAppEntry(app) {
  if (!app || typeof app !== "object") {
    return null;
  }

  const categories = Array.isArray(app.categories)
    ? app.categories
    : typeof app.categories === "string"
    ? app.categories.split(/\s+/).filter(Boolean)
    : [];

  return {
    ...app,
    title: app.title || app.slug || app.name || "",
    icon: app.icon || app.image || "",
    desc: app.desc || app.description || "",
    link: app.link || app.url || "",
    categories,
  };
}

const APP_VER = "apps11";
const REQUERY_TIME = 5; // in days

function readCachedApps() {
  try {
    const date_last_queryed = JSON.parse(localStorage.getItem("dlq") || "null");
    const local_apps = JSON.parse(localStorage.getItem(APP_VER) || "null");

    if (
      Array.isArray(local_apps) &&
      local_apps.length > 0 &&
      date_last_queryed &&
      (new Date().getTime() - date_last_queryed) / 1000 / 60 / 60 / 24 <=
        REQUERY_TIME
    ) {
      return local_apps
        .map(normalizeAppEntry)
        .filter(Boolean);
    }
  } catch (error) {
    console.warn("Unable to read cached app data.", error);
  }

  return null;
}

async function loadBackupApps() {
  try {
    const response = await fetch("/backup_classes.json", { cache: "no-store" });
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload.map(normalizeAppEntry).filter(Boolean);
  } catch (error) {
    console.warn("Backup app data could not be loaded.", error);
    return [];
  }
}

async function get_all_apps() {
  const cachedApps = readCachedApps();
  if (Array.isArray(cachedApps) && cachedApps.length > 0) {
    console.log("Using local apps data.");
    return cachedApps;
  }

  const backupApps = await loadBackupApps();
  if (Array.isArray(backupApps) && backupApps.length > 0) {
    try {
      localStorage.setItem(APP_VER, JSON.stringify(backupApps));
      localStorage.setItem("dlq", JSON.stringify(new Date().getTime()));
    } catch (error) {
      console.warn("Unable to cache backup app data.", error);
    }
    console.log("Using backup apps data.");
    return backupApps;
  }

  if (supabaseClient) {
    try {
      console.log("Fetching apps data from Supabase.");
      const { data, error } = await supabaseClient.rpc(
        "get_apps_ordered_by_title"
      );
      if (!error && Array.isArray(data)) {
        const normalized = data.map(normalizeAppEntry).filter(Boolean);
        if (normalized.length > 0) {
          localStorage.setItem(APP_VER, JSON.stringify(normalized));
          localStorage.setItem("dlq", JSON.stringify(new Date().getTime()));
          return normalized;
        }
      }
    } catch (error) {
      console.warn("Supabase app fetch failed.", error);
    }
  }

  return [];
}

function remove_all_children(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 *
 * @param {Element} element
 */
async function list_all_apps(element) {
  const query = await get_all_apps();
  if (!Array.isArray(query)) {
    return;
  }
  remove_all_children(element);
  for (let i = 0; i < query.length; i++) {
    /**
     * <a id="Retro Bowl" class="Sports 2D" href="games/retro_bowl.html"
          ><img
            onmouseover="viewFig(this)"
            onmouseout="hideFig(this)"
            src="assets/img/icons/retro_bowl_icon.webp"
            alt="Icon"
            loading="lazy"
          />
          <figcaption>Retro Bowl</figcaption></a
        >
        re create this code with the data from the query
     */
    const app = query[i];
    const appTitle = app.title;
    const appCategories = Array.isArray(app.categories)
      ? app.categories
      : typeof app.categories === "string"
      ? app.categories.split(/\s+/).filter(Boolean)
      : [];
    const appCategory = appCategories.join(" ") || "Other";
    const appIcon = app.icon;

    // now create the element
    const a = document.createElement("a");
    a.id = appTitle;
    a.className = appCategory;
    a.href = `/g4m3s/?title=${appTitle}`;
    const img = document.createElement("img");
    img.onmouseover = function () {
      viewFig(this);
    };
    img.onmouseout = function () {
      hideFig(this);
    };
    img.src = appIcon;
    img.alt = appTitle;
    img.loading = "lazy";
    const figcaption = document.createElement("figcaption");
    figcaption.innerText = appTitle.replaceAll("-", " ");
    a.appendChild(img);
    a.appendChild(figcaption);

    element.appendChild(a);
  }
}

async function get_app_by_title(title) {
  const apps = await get_all_apps();

  if (!Array.isArray(apps)) {
    console.error("Error fetching apps list");
    return null;
  }
  const app = apps.find(
    (app) => normalizeTitle(app.title) === normalizeTitle(title)
  );
  if (!app) {
    console.error("App not found:", title);
    return null;
  }

  return app;
}

function renderGameNotFound(message) {
  try {
    const reason =
      message ||
      "We couldn't find that game. It may have been moved or removed.";
    const pagePrefix = window.location.hostname.split(".")[0];
    try {
      window.document.title = `Game Not Found - ${pagePrefix}`;
    } catch (_) {}

    const titleEl = document.getElementById("game-title");
    if (titleEl) {
      titleEl.textContent = "Game not found";
    }

    const iframeWrap = document.querySelector(".game-iframe-container");
    if (iframeWrap) {
      iframeWrap.innerHTML =
        '<div style="padding:24px; text-align:center; min-height:200px; display:flex; align-items:center; justify-content:center;">' +
        `<div>` +
        `<div style="font-size:1.25rem; font-weight:600; margin-bottom:8px;">Game not found</div>` +
        `<div style="opacity:0.9; margin-bottom:12px;">${reason}</div>` +
        `<a href="/" style="color:#ff6b6b; text-decoration:none;">\u2190 Back to games</a>` +
        `</div>` +
        `</div>`;
    }

    const descTarget = document.getElementById("game-description");
    if (descTarget) {
      descTarget.textContent = "";
    }

    const relatedWrap = document.getElementById("related-games");
    if (relatedWrap) {
      try {
        get_all_apps()
          .then((all) => {
            if (!Array.isArray(all)) return;
            remove_all_children(relatedWrap);
            const picks = all.slice(0, 3);
            for (const rel of picks) {
              const a = document.createElement("a");
              a.href = `/g4m3s/?title=${rel.title}`;
              const img = document.createElement("img");
              img.src = rel.icon;
              img.alt = rel.title;
              img.loading = "lazy";
              img.style.width = "120px";
              img.style.height = "120px";

              a.appendChild(img);
              relatedWrap.appendChild(a);
            }
          })
          .catch(() => {});
      } catch (_) {}
    }
  } catch (e) {
    // As a last resort, fall back to 404 page
    try {
      window.location.href = "/g404.html";
    } catch (_) {}
  }
}

async function hydrateAppPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const appTitle = urlParams.get("title");

  if (!appTitle) {
    console.error("No app title provided in the URL.");
    renderGameNotFound("No game specified in the URL.");
    return;
  }

  const appData = await get_app_by_title(appTitle);

  if (!appData) {
    console.error("Game not found:", appTitle);
    renderGameNotFound(
      `We couldn't find "${appTitle.replaceAll(
        "-",
        " "
      )}". It may have been moved or renamed.`
    );
    return;
  }

  // remove current canonical and add new one
  const existingCanonical = document.querySelector('link[rel="canonical"]');
  if (existingCanonical) {
    existingCanonical.remove();
  }

  const canonicalLink = document.createElement("link");
  canonicalLink.rel = "canonical";
  canonicalLink.href = `/g4m3s/?title=${appData.title}`;
  document.head.appendChild(canonicalLink);

  window.document.title =
    appTitle.replaceAll("-", " ") +
    ` - ${window.location.hostname.split(".")[0]}`;

  // Update meta description using app.desc
  if (appData.desc) {
    const existingMetaDesc = document.querySelector('meta[name="description"]');
    if (existingMetaDesc) {
      existingMetaDesc.remove();
    }

    const metaDescMeta = document.createElement("meta");
    metaDescMeta.setAttribute("name", "description");
    metaDescMeta.setAttribute(
      "content",
      getDescriptionFromMarkdown(appData.desc)
    );
    document.head.appendChild(metaDescMeta);
  }

  // Set image meta tags for social media sharing
  const existingOgImage = document.querySelector('meta[property="og:image"]');
  if (existingOgImage) {
    existingOgImage.remove();
  }

  const existingTwitterImage = document.querySelector(
    'meta[name="twitter:image"]'
  );
  if (existingTwitterImage) {
    existingTwitterImage.remove();
  }

  const ogImageMeta = document.createElement("meta");
  ogImageMeta.setAttribute("property", "og:image");
  ogImageMeta.setAttribute("content", appData.icon);
  ogImageMeta.setAttribute("alt", `${appData.title} unblocked game icon`);
  document.head.appendChild(ogImageMeta);

  const twitterImageMeta = document.createElement("meta");
  twitterImageMeta.setAttribute("name", "twitter:image");
  twitterImageMeta.setAttribute("content", appData.icon);
  twitterImageMeta.setAttribute("alt", `${appData.title} unblocked game icon`);
  document.head.appendChild(twitterImageMeta);

  // Populate the page with app data
  // Render markdown description safely under the game
  try {
    const descTarget = document.getElementById("game-description");
    if (descTarget && appData.desc) {
      const rawHtml =
        typeof window !== "undefined" && window.marked && window.marked.parse
          ? window.marked.parse(appData.desc)
          : appData.desc;
      const safeHtml =
        typeof window !== "undefined" &&
        window.DOMPurify &&
        window.DOMPurify.sanitize
          ? window.DOMPurify.sanitize(rawHtml)
          : rawHtml;
      descTarget.innerHTML = safeHtml;
    }
  } catch (e) {
    console.warn(
      "Failed to render markdown description; falling back to text.",
      e
    );
    const descTarget = document.getElementById("game-description");
    if (descTarget && appData.desc) {
      descTarget.innerText = appData.desc;
    }
  }

  const titleText = `${(appData.title || "Game").replaceAll("-", " ")} Unblocked`;
  const gameTitleEl = document.getElementById("game-title");
  if (gameTitleEl) {
    gameTitleEl.textContent = titleText;
  }

  // Add small text under title about .top_message property
  if (appData?.top_message) {
    const titleElement = document.getElementById("game-title");
    const infoText = document.createElement("div");
    infoText.style.fontSize = ".6rem";
    infoText.style.color = "#666";
    infoText.style.marginTop = ".5rem";
    infoText.textContent = appData?.top_message;
    titleElement.appendChild(infoText);
  }
  document.getElementById("gameFrame").src = appData.link;

  // Populate minimal related games (3 items) after fullscreen button
  try {
    const allApps = await get_all_apps();
    const relatedWrap = document.getElementById("related-games");
    if (relatedWrap && Array.isArray(allApps)) {
      remove_all_children(relatedWrap);
      const currentCats = new Set(
        Array.isArray(appData.categories)
          ? appData.categories
          : typeof appData.categories === "string"
          ? appData.categories.split(" ")
          : []
      );
      const scored = allApps
        .filter((a) => a.title !== appData.title)
        .map((a) => {
          const aCats = Array.isArray(a.categories)
            ? a.categories
            : typeof a.categories === "string"
            ? a.categories.split(" ")
            : [];
          const overlap = aCats.some((c) => currentCats.has(c));
          return { app: a, score: overlap ? 1 : 0 };
        })
        .filter((x) => x.score > 0)
        .slice(0, 6);
      const finalList =
        scored.length > 0 ? scored.map((x) => x.app) : allApps.slice(0, 3);

      for (const rel of finalList) {
        const a = document.createElement("a");
        a.href = `/g4m3s/?title=${rel.title}`;
        const img = document.createElement("img");
        img.src = rel.icon;
        img.alt = rel.title;
        img.loading = "lazy";
        img.style.width = "120px";
        img.style.height = "120px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "10px";
        a.appendChild(img);
        relatedWrap.appendChild(a);
      }
    }
  } catch (e) {
    console.warn("Unable to populate related games", e);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const appListElement = document.getElementById("icon_image");
  if (appListElement) {
    list_all_apps(appListElement).then(() => {
      document.dispatchEvent(new Event("GamesLoaded"));
    });
  }

  if (
    window.location.pathname.includes("g4m3s") &&
    window.location.search.includes("title")
  ) {
    hydrateAppPage();
  } else if (window.location.pathname.includes("g4m3s")) {
    renderGameNotFound("No game specified in the URL.");
  }
});
