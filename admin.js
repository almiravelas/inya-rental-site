/*
  HI.INYA admin: add pieces
  -------------------------
  The site has no server, so this page can't change the live site itself.
  It builds an updated products.js and correctly named photos for you to
  put in the repo, commit and push.
*/
(function () {
  "use strict";

  var PRODUCTS = window.INYA_PRODUCTS || [];
  var form = document.getElementById("piece-form");
  var f = form.elements;
  var thumbs = document.getElementById("thumbs");
  var preview = document.getElementById("preview");
  var errorEl = document.getElementById("form-error");
  var queueEl = document.getElementById("queue");
  var queueCount = document.getElementById("queue-count");
  var exportEl = document.getElementById("export");
  var dlPhotos = document.getElementById("dl-photos");

  var queue = [];          // [{ piece, photos: [{ file, path, url }] }]
  var photos = [];         // File[] for the piece being edited
  var photoUrls = [];
  var idTouched = false;

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
  function ext(file) {
    var m = /\.([a-z0-9]+)$/i.exec(file.name);
    var e = m ? m[1].toLowerCase() : (file.type.split("/")[1] || "jpg");
    return e === "jpeg" ? "jpg" : e;
  }
  function takenIds() {
    var ids = {};
    PRODUCTS.forEach(function (p) { ids[p.id] = true; });
    queue.forEach(function (q) { ids[q.piece.id] = true; });
    return ids;
  }
  function priceText(two, three) {
    two = two.trim(); three = three.trim();
    var parts = [];
    if (two) parts.push(two + " (2 days)");
    if (three) parts.push(three + " (3 days)");
    return parts.length ? parts.join(" · ") : "TBA";
  }

  // "2026-12-05" or "2026-12-05 to 2026-12-07", one per line
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

  // ---------- current piece ----------
  function readPiece() {
    var id = f.id.value.trim();
    var piece = {
      id: id,
      category: f.category.value,
      name: f.name.value.trim(),
      shortName: f.shortName.value.trim(),
      brand: f.brand.value.trim(),
      size: f.size.value.trim() || "TBA",
      price: priceText(f.price2.value, f.price3.value),
      images: photos.map(function (file, i) { return "images/" + id + "-" + (i + 1) + "." + ext(file); }),
    };
    return piece;
  }

  function cardHtml(p, imgSrc) {
    return (
      '<div class="card">' +
        '<div class="ph">' + (imgSrc ? '<img src="' + esc(imgSrc) + '" alt="" />' : "") + "</div>" +
        "<h2>" + esc(p.shortName || p.name || "Piece name") + "</h2>" +
        "<p>" + esc(p.brand || "Brand") + " · " + esc(p.category) + "</p>" +
      "</div>"
    );
  }

  function renderPreview() {
    preview.innerHTML = cardHtml(readPiece(), photoUrls[0]);
  }

  function renderThumbs() {
    photoUrls.forEach(URL.revokeObjectURL);
    photoUrls = photos.map(function (file) { return URL.createObjectURL(file); });
    var id = f.id.value.trim() || "piece";
    thumbs.innerHTML = photos.map(function (file, i) {
      return '<figure><img src="' + photoUrls[i] + '" alt="" /><figcaption>' +
        (i === 0 ? "Cover · " : "") + esc(id + "-" + (i + 1) + "." + ext(file)) + "</figcaption></figure>";
    }).join("");
  }

  f.name.addEventListener("input", function () {
    if (!idTouched) f.id.value = slug(f.name.value);
    renderThumbs();
    renderPreview();
  });
  f.id.addEventListener("input", function () {
    idTouched = f.id.value.trim() !== "";
    f.id.value = f.id.value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    renderThumbs();
    renderPreview();
  });
  ["shortName", "brand", "category"].forEach(function (n) {
    f[n].addEventListener("input", renderPreview);
  });
  f.photos.addEventListener("change", function () {
    photos = Array.prototype.slice.call(f.photos.files);
    renderThumbs();
    renderPreview();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorEl.textContent = "";
    try {
      var piece = readPiece();
      if (!piece.name) throw new Error("Add a name.");
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(piece.id)) throw new Error("The link id can only use lowercase letters, numbers and dashes.");
      if (takenIds()[piece.id]) throw new Error('The link id "' + piece.id + '" is already used. Pick another.');
      if (!photos.length) throw new Error("Add at least one photo.");
      piece.booked = parseDates(f.booked.value, "Booked dates");
      piece.laundering = parseDates(f.laundering.value, "Laundering dates");

      queue.push({
        piece: piece,
        photos: photos.map(function (file, i) {
          return { file: file, path: piece.images[i], url: URL.createObjectURL(file) };
        }),
      });
      resetForm();
      renderQueue();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  function resetForm() {
    form.reset();
    idTouched = false;
    photos = [];
    renderThumbs();
    renderPreview();
  }

  // ---------- queue + export ----------
  function renderQueue() {
    queueCount.textContent = queue.length ? "(" + queue.length + ")" : "";
    queueEl.innerHTML = queue.map(function (q, i) {
      return "<li><div>" + esc(q.piece.name) + "<br /><span>" + esc(q.piece.category) + " · " +
        q.photos.length + " photo" + (q.photos.length === 1 ? "" : "s") + "</span></div>" +
        '<button type="button" class="link-btn" data-remove="' + i + '">Remove</button></li>';
    }).join("");
    exportEl.hidden = !queue.length;
    dlPhotos.innerHTML = queue.map(function (q) {
      return q.photos.map(function (ph) {
        var name = ph.path.replace(/^images\//, "");
        return '<li><a href="' + ph.url + '" download="' + esc(name) + '">' + esc(name) + "</a></li>";
      }).join("");
    }).join("");
  }

  queueEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-remove]");
    if (!b) return;
    var removed = queue.splice(+b.getAttribute("data-remove"), 1)[0];
    removed.photos.forEach(function (ph) { URL.revokeObjectURL(ph.url); });
    renderQueue();
  });

  function str(s) { return JSON.stringify(s); }
  function dateList(list) {
    return "[" + list.map(function (d) {
      return Array.isArray(d) ? "[" + str(d[0]) + ", " + str(d[1]) + "]" : str(d);
    }).join(", ") + "]";
  }
  function entryText(p) {
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

  // Add the new entries to the end of the list in products.js, keeping
  // everything else in the file (comments, config) exactly as it is.
  function buildProductsJs(source) {
    var added = queue.map(function (q) { return entryText(q.piece); }).join("");
    var start = source.indexOf("window.INYA_PRODUCTS");
    var end = start < 0 ? -1 : source.indexOf("\n];", start);
    if (end < 0) throw new Error("Couldn't find the product list in products.js.");
    var before = source.slice(0, end + 1);
    if (!/[\[,]\s*$/.test(before)) before = before.replace(/\s*$/, ",\n");
    return before + added + source.slice(end + 1);
  }

  document.getElementById("dl-products").addEventListener("click", function () {
    fetch("products.js", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
      .then(function (src) {
        var blob = new Blob([buildProductsJs(src)], { type: "text/javascript" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "products.js";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      })
      .catch(function (err) {
        alert(err && err.message ? err.message :
          "Couldn't read products.js. Open this page from the site (or a local server), not as a file.");
      });
  });

  // ---------- existing pieces ----------
  document.getElementById("existing").innerHTML = PRODUCTS.map(function (p) {
    return "<li><div>" + esc(p.name) + "<br /><span>" + esc(p.brand) + " · " + esc(p.category) +
      "</span></div><span>#item-" + esc(p.id) + "</span></li>";
  }).join("");

  renderPreview();
  renderQueue();
})();
