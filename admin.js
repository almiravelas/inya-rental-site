/*
  HI.INYA admin: add a piece
  --------------------------
  Photos are resized in the browser, sent to /api/admin one at a time, then
  "publish" commits the piece to GitHub and Vercel redeploys the site.
*/
(function () {
  "use strict";

  var PRODUCTS = window.INYA_PRODUCTS || [];
  var MAX_SIDE = 1600;       // longest edge of uploaded photos, in pixels
  var QUALITY = 0.85;        // JPEG quality
  var MAX_PHOTOS = 10;

  var form = document.getElementById("piece-form");
  var f = form.elements;
  var thumbs = document.getElementById("thumbs");
  var preview = document.getElementById("preview");
  var errorEl = document.getElementById("form-error");
  var progress = document.getElementById("progress");
  var publishBtn = document.getElementById("publish");
  var editor = document.getElementById("editor");
  var done = document.getElementById("done");

  var photos = [];   // [{ file, url }]
  var idTouched = false;
  var busy = false;

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function slug(s) {
    return String(s).toLowerCase()
      .normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/^the\s+/, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      .slice(0, 40).replace(/-+$/, "");
  }
  function priceText(two, three) {
    two = two.trim(); three = three.trim();
    var parts = [];
    if (two) parts.push(two + " (2 days)");
    if (three) parts.push(three + " (3 days)");
    return parts.length ? parts.join(" · ") : "TBA";
  }
  function takenIds() {
    var ids = {};
    PRODUCTS.forEach(function (p) { ids[p.id] = true; });
    return ids;
  }

  // "2026-12-05" or "2026-12-05 to 2026-12-07", one per line or comma-separated
  function parseDates(text, label) {
    var out = [];
    var re = /^\d{4}-\d{2}-\d{2}$/;
    text.split(/[\n,]/).forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var parts = line.split(/\s*(?:to|–|—)\s*|\s+-\s+/);
      parts.forEach(function (d) {
        if (!re.test(d) || isNaN(new Date(d + "T00:00:00"))) {
          throw new Error(label + ': "' + line + '" isn\'t a date like 2026-12-05.');
        }
      });
      if (parts.length === 1) out.push(parts[0]);
      else if (parts.length === 2) {
        if (parts[1] < parts[0]) throw new Error(label + ': "' + line + '" ends before it starts.');
        out.push([parts[0], parts[1]]);
      } else throw new Error(label + ': "' + line + '" has too many dates.');
    });
    return out;
  }

  function readPiece() {
    return {
      id: f.id.value.trim(),
      category: f.category.value,
      name: f.name.value.trim(),
      shortName: f.shortName.value.trim(),
      brand: f.brand.value.trim(),
      size: f.size.value.trim(),
      price: priceText(f.price2.value, f.price3.value),
    };
  }

  // ---------- preview + photos ----------
  function renderPreview() {
    var p = readPiece();
    preview.innerHTML =
      '<div class="card">' +
        '<div class="ph">' + (photos[0] ? '<img src="' + photos[0].url + '" alt="" />' : "") + "</div>" +
        "<h2>" + esc(p.shortName || p.name || "Piece name") + "</h2>" +
        "<p>" + esc(p.brand || "Brand") + " · " + esc(p.category) + "</p>" +
      "</div>";
  }

  function renderThumbs() {
    thumbs.innerHTML = photos.map(function (ph, i) {
      return '<figure><img src="' + ph.url + '" alt="" />' +
        '<button type="button" class="thumb-x" data-remove="' + i + '" aria-label="Remove photo ' + (i + 1) + '">&times;</button>' +
        "<figcaption>" + (i === 0 ? "Cover" : "Photo " + (i + 1)) + "</figcaption></figure>";
    }).join("");
  }

  f.photos.addEventListener("change", function () {
    Array.prototype.forEach.call(f.photos.files, function (file) {
      if (photos.length < MAX_PHOTOS) photos.push({ file: file, url: URL.createObjectURL(file) });
    });
    f.photos.value = "";   // so the same photo can be picked again after removing it
    renderThumbs();
    renderPreview();
  });
  thumbs.addEventListener("click", function (e) {
    var b = e.target.closest("[data-remove]");
    if (!b || busy) return;
    var removed = photos.splice(+b.getAttribute("data-remove"), 1)[0];
    URL.revokeObjectURL(removed.url);
    renderThumbs();
    renderPreview();
  });

  f.name.addEventListener("input", function () {
    if (!idTouched) f.id.value = slug(f.name.value);
    renderPreview();
  });
  f.id.addEventListener("input", function () {
    idTouched = f.id.value.trim() !== "";
    f.id.value = f.id.value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  });
  ["shortName", "brand", "category"].forEach(function (n) {
    f[n].addEventListener("input", renderPreview);
    f[n].addEventListener("change", renderPreview);
  });

  // ---------- upload ----------
  // Resize to at most MAX_SIDE px and re-encode as JPEG, so phone photos
  // upload quickly and the site loads fast.
  function toJpegBase64(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", QUALITY).split(",")[1]);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Couldn\'t read "' + file.name + '". Try a JPG or PNG photo.'));
      };
      img.src = url;
    });
  }

  function api(action, body) {
    return fetch("/api/admin?action=" + action, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.text().then(function (t) {
        var data = {};
        try { data = JSON.parse(t); } catch (e) {}
        if (!res.ok) {
          if (res.status === 401) throw new Error("You've been signed out. Reload the page and sign in again.");
          throw new Error(data.error || t || "Publishing failed (" + res.status + "). Try again.");
        }
        return data;
      });
    });
  }

  function setBusy(on, msg) {
    busy = on;
    publishBtn.disabled = on;
    Array.prototype.forEach.call(f, function (el) { el.disabled = on; });
    progress.textContent = msg || "";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    errorEl.textContent = "";

    var piece;
    try {
      piece = readPiece();
      if (!photos.length) throw new Error("Add at least one photo.");
      if (!piece.name) throw new Error("Add a name.");
      if (!piece.id) piece.id = slug(piece.name);
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(piece.id)) throw new Error("The link id (under More options) can only use lowercase letters, numbers and dashes.");
      if (takenIds()[piece.id]) throw new Error('There\'s already a piece with the link id "' + piece.id + '". Change it under More options.');
      piece.booked = parseDates(f.booked.value, "Booked dates");
      piece.laundering = parseDates(f.laundering.value, "Laundering dates");
    } catch (err) {
      errorEl.textContent = err.message;
      return;
    }

    var shas = [];
    var chain = Promise.resolve();
    photos.forEach(function (ph, i) {
      chain = chain.then(function () {
        setBusy(true, "Uploading photo " + (i + 1) + " of " + photos.length + "…");
        return toJpegBase64(ph.file).then(function (data) {
          return api("photo", { data: data });
        }).then(function (r) { shas.push(r.sha); });
      });
    });
    chain.then(function () {
      setBusy(true, "Publishing…");
      return api("publish", { piece: piece, photos: shas });
    }).then(function (r) {
      PRODUCTS.push({ id: r.id, name: piece.name, brand: piece.brand, category: piece.category });
      renderExisting();
      setBusy(false);
      showDone(piece.name, r.id);
    }).catch(function (err) {
      setBusy(false);
      errorEl.textContent = err.message;
    });
  });

  function showDone(name, id) {
    document.getElementById("done-title").textContent = name;
    document.getElementById("done-link").href = "/#item-" + id;
    editor.hidden = true;
    done.hidden = false;
    window.scrollTo(0, 0);
  }

  document.getElementById("add-another").addEventListener("click", function () {
    form.reset();
    idTouched = false;
    photos.forEach(function (ph) { URL.revokeObjectURL(ph.url); });
    photos = [];
    errorEl.textContent = "";
    renderThumbs();
    renderPreview();
    done.hidden = true;
    editor.hidden = false;
  });

  // ---------- pieces already on the site ----------
  function renderExisting() {
    document.getElementById("existing").innerHTML = PRODUCTS.map(function (p) {
      return "<li><div>" + esc(p.name) + "<br /><span>" + esc(p.brand) + " · " + esc(p.category) +
        '</span></div><a href="/#item-' + esc(p.id) + '" target="_blank" rel="noopener">View</a></li>';
    }).join("");
  }

  renderExisting();
  renderPreview();
})();
