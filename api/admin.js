/*
  Publishing for the admin page
  -----------------------------
  POST /api/admin?action=photo    { data: "<base64 jpeg>" }  -> { sha }
  POST /api/admin?action=publish  { piece, photos: [sha] }   -> { id, commit }

  "photo" saves one photo to GitHub (photos go one at a time to stay under
  Vercel's request size limit). "publish" then makes a single commit that
  adds the photos to images/ and the piece to products.js. Vercel sees the
  commit and redeploys the site.

  Settings (Vercel → Settings → Environment Variables):
    ADMIN_PASSWORD   see lib/auth.js
    GITHUB_TOKEN     fine-grained token with Contents: read and write on the repo
    GITHUB_REPO      optional, defaults to "almiravelas/inya-rental-site"
    GITHUB_BRANCH    optional, defaults to "main"
*/
import { checkAuth } from "../lib/auth.js";

var MAX_PHOTO_BYTES = 3 * 1024 * 1024;
var MAX_PHOTOS = 10;

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

class Problem extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ---------- GitHub ----------
function github(env) {
  return async function (path, opts) {
    opts = opts || {};
    var res = await fetch("https://api.github.com/repos/" + env.repo + path, {
      method: opts.method || "GET",
      headers: {
        Authorization: "Bearer " + env.token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "hi-inya-admin",
        "Content-Type": "application/json",
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.ok) return res.json();
    if (opts.allow && opts.allow.indexOf(res.status) >= 0) return { _status: res.status };
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new Problem(502, "GitHub refused the request. Check that GITHUB_TOKEN is set, hasn't expired, and has Contents: read and write on " + env.repo + ".");
    }
    var detail = "";
    try { detail = (await res.json()).message || ""; } catch (e) {}
    throw new Problem(502, "GitHub error " + res.status + (detail ? ": " + detail : ""));
  };
}

// ---------- validation ----------
var DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(v, label, max, required) {
  if (v == null) v = "";
  if (typeof v !== "string") throw new Problem(400, label + " must be text.");
  v = v.trim();
  if (required && !v) throw new Problem(400, "Add a " + label.toLowerCase() + ".");
  if (v.length > max) throw new Problem(400, label + " is too long.");
  return v;
}

function dates(list, label) {
  if (list == null) return [];
  if (!Array.isArray(list) || list.length > 100) throw new Problem(400, label + " look wrong.");
  return list.map(function (d) {
    if (typeof d === "string" && DATE.test(d)) return d;
    if (Array.isArray(d) && d.length === 2 && DATE.test(d[0]) && DATE.test(d[1]) && d[0] <= d[1]) return [d[0], d[1]];
    throw new Problem(400, label + " look wrong.");
  });
}

function cleanPiece(p) {
  if (!p || typeof p !== "object") throw new Problem(400, "Missing piece details.");
  var id = text(p.id, "Link id", 60, true);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw new Problem(400, "The link id can only use lowercase letters, numbers and dashes.");
  if (p.category !== "dress" && p.category !== "top") throw new Problem(400, "Pick Dress or Top.");
  return {
    id: id,
    category: p.category,
    name: text(p.name, "Name", 140, true),
    shortName: text(p.shortName, "Short name", 80, false),
    brand: text(p.brand, "Brand", 120, false),
    size: text(p.size, "Size", 120, false) || "TBA",
    price: text(p.price, "Price", 120, false) || "TBA",
    booked: dates(p.booked, "Booked dates"),
    laundering: dates(p.laundering, "Laundering dates"),
  };
}

// ---------- products.js ----------
function str(s) { return JSON.stringify(s); }
function dateList(list) {
  return "[" + list.map(function (d) {
    return Array.isArray(d) ? "[" + str(d[0]) + ", " + str(d[1]) + "]" : str(d);
  }).join(", ") + "]";
}
export function entryText(p) {
  var lines = [
    "  {",
    "    id: " + str(p.id) + ",",
    "    category: " + str(p.category) + ",",
    "    name: " + str(p.name) + ",",
  ];
  if (p.shortName) lines.push("    shortName: " + str(p.shortName) + ",");
  lines.push(
    "    brand: " + str(p.brand) + ",",
    "    size: " + str(p.size) + ",",
    "    price: " + str(p.price) + ",",
    "    images: [" + p.images.map(str).join(", ") + "],",
    "    booked: " + dateList(p.booked) + ",",
    "    laundering: " + dateList(p.laundering) + ",",
    "  },"
  );
  return lines.join("\n") + "\n";
}

// Add an entry to the end of the product list, leaving the rest of the
// file (comments, other pieces, config) exactly as it was.
export function addToProducts(source, piece) {
  var start = source.indexOf("window.INYA_PRODUCTS");
  var end = start < 0 ? -1 : source.indexOf("\n];", start);
  if (end < 0) throw new Problem(500, "Couldn't find the product list in products.js.");
  var before = source.slice(0, end + 1);
  if (!/[\[,]\s*$/.test(before)) before = before.replace(/\s*$/, ",\n");
  return before + entryText(piece) + source.slice(end + 1);
}

export function existingIds(source) {
  var ids = {}, re = /\bid:\s*["']([^"']+)["']/g, m;
  while ((m = re.exec(source))) ids[m[1]] = true;
  return ids;
}

function decodeUtf8Base64(b64) {
  var bin = atob(b64.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, function (c) { return c.charCodeAt(0); }));
}

// ---------- actions ----------
async function savePhoto(gh, body) {
  var data = body && body.data;
  if (typeof data !== "string" || !/^[A-Za-z0-9+/]+=*$/.test(data)) throw new Problem(400, "That photo didn't upload properly. Try again.");
  if (data.length * 0.75 > MAX_PHOTO_BYTES) throw new Problem(413, "That photo is too large.");
  var head = atob(data.slice(0, 8));
  if (head.charCodeAt(0) !== 0xff || head.charCodeAt(1) !== 0xd8) throw new Problem(400, "Photos must be sent as JPEG.");
  var blob = await gh("/git/blobs", { method: "POST", body: { content: data, encoding: "base64" } });
  return { sha: blob.sha };
}

async function publish(gh, env, body) {
  var piece = cleanPiece(body && body.piece);
  var photos = body && body.photos;
  if (!Array.isArray(photos) || !photos.length) throw new Problem(400, "Add at least one photo.");
  if (photos.length > MAX_PHOTOS) throw new Problem(400, "Use " + MAX_PHOTOS + " photos or fewer.");
  photos.forEach(function (sha) {
    if (typeof sha !== "string" || !/^[0-9a-f]{40}$/.test(sha)) throw new Problem(400, "A photo didn't upload properly. Try again.");
  });
  piece.images = photos.map(function (_, i) { return "images/" + piece.id + "-" + (i + 1) + ".jpg"; });

  // Retry once if someone else pushed in between.
  for (var attempt = 0; attempt < 2; attempt++) {
    var ref = await gh("/git/ref/heads/" + env.branch);
    var head = ref.object.sha;
    var commit = await gh("/git/commits/" + head);
    var file = await gh("/contents/products.js?ref=" + head);
    var source = decodeUtf8Base64(file.content);

    if (existingIds(source)[piece.id]) throw new Problem(409, 'The link id "' + piece.id + '" is already used. Pick another.');

    var tree = await gh("/git/trees", {
      method: "POST",
      body: {
        base_tree: commit.tree.sha,
        tree: [{ path: "products.js", mode: "100644", type: "blob", content: addToProducts(source, piece) }].concat(
          photos.map(function (sha, i) { return { path: piece.images[i], mode: "100644", type: "blob", sha: sha }; })
        ),
      },
    });
    var made = await gh("/git/commits", {
      method: "POST",
      body: { message: "Add " + piece.name + " (from admin)", tree: tree.sha, parents: [head] },
    });
    var moved = await gh("/git/refs/heads/" + env.branch, {
      method: "PATCH",
      body: { sha: made.sha, force: false },
      allow: [409, 422],
    });
    if (!moved._status) return { id: piece.id, commit: made.sha };
  }
  throw new Problem(409, "The site changed while publishing. Click Publish again.");
}

export default {
  async fetch(request) {
    var denied = await checkAuth(request);
    if (denied) return denied;
    if (request.method !== "POST") return json(405, { error: "Use POST." });

    var env = {
      token: process.env.GITHUB_TOKEN,
      repo: process.env.GITHUB_REPO || "almiravelas/inya-rental-site",
      branch: process.env.GITHUB_BRANCH || "main",
    };
    if (!env.token) return json(503, { error: "Publishing isn't set up yet: add GITHUB_TOKEN in Vercel, then redeploy." });

    var body;
    try { body = await request.json(); } catch (e) { return json(400, { error: "Bad request." }); }

    var gh = github(env);
    var action = new URL(request.url).searchParams.get("action");
    try {
      if (action === "photo") return json(200, await savePhoto(gh, body));
      if (action === "publish") return json(200, await publish(gh, env, body));
      return json(404, { error: "Unknown action." });
    } catch (err) {
      if (err instanceof Problem) return json(err.status, { error: err.message });
      console.error(err);
      return json(500, { error: "Something went wrong. Try again." });
    }
  },
};
