(function () {
  "use strict";

  var PRODUCTS = window.INYA_PRODUCTS || [];
  var CONFIG = window.INYA_CONFIG || {};
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  var DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  var CATEGORY_LABEL = { dress: "dress", top: "top" };

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function key(y, m, d) { return y + "-" + pad(m + 1) + "-" + pad(d); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }

  // Expand ["2026-11-20", ["2026-11-21","2026-11-23"]] into a Set of date keys
  function dateSet(list) {
    var set = {};
    (list || []).forEach(function (item) {
      if (Array.isArray(item)) {
        var d = parse(item[0]), end = parse(item[1]);
        while (d <= end) {
          set[key(d.getFullYear(), d.getMonth(), d.getDate())] = true;
          d.setDate(d.getDate() + 1);
        }
      } else if (item) {
        set[item] = true;
      }
    });
    return set;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.hidden = true; }, 3200);
  }

  function setTitle(t) { document.title = t ? t + " · Hi.Inya Rental" : "Hi.Inya Rental"; }

  // ---------- views ----------
  function collectionView(cat) {
    var items = PRODUCTS.filter(function (p) { return p.category === cat; });
    var cards = items.map(function (p) {
      return (
        '<a class="card" href="#item-' + esc(p.id) + '">' +
          '<div class="ph"><img src="' + esc(p.cover || p.images[0]) + '" alt="' + esc(p.name) + '" loading="lazy" /></div>' +
          "<h2>" + esc(p.shortName || p.name) + "</h2>" +
          "<p>" + esc(p.brand) + " · " + esc(CATEGORY_LABEL[p.category] || p.category) + "</p>" +
        "</a>"
      );
    }).join("");

    app.innerHTML =
      '<section class="collection-head">' +
        "<h1>THE COLLECTION</h1>" +
        '<nav class="tabs" aria-label="Category">' +
          '<a href="#dress" ' + (cat === "dress" ? 'aria-current="page"' : "") + ">DRESS</a>" +
          '<a href="#tops" ' + (cat === "top" ? 'aria-current="page"' : "") + ">TOPS</a>" +
        "</nav>" +
      "</section>" +
      (items.length
        ? '<div class="grid">' + cards + "</div>"
        : '<p class="empty-state">New pieces coming soon.</p>');
    setTitle("");
  }

  function detailView(p) {
    var backHref = p.category === "top" ? "#tops" : "#dress";
    var imgs = p.images.map(function (src, i) {
      return '<img src="' + esc(src) + '" alt="' + esc(p.name) + " photo " + (i + 1) + '" ' + (i ? 'loading="lazy"' : "") + " draggable=\"false\" />";
    }).join("");

    app.innerHTML =
      '<a class="back" href="' + backHref + '">&larr; Back to collection</a>' +
      '<article class="detail">' +
        '<div class="gallery">' +
          '<div class="frame"><div class="track">' + imgs + "</div></div>" +
          '<div class="controls">' +
            '<button class="round prev" aria-label="Previous photo">&larr;</button>' +
            '<span class="count"></span>' +
            '<button class="round next" aria-label="Next photo">&rarr;</button>' +
          "</div>" +
        "</div>" +
        '<div class="info">' +
          '<p class="eyebrow">HI.INYA / THE COLLECTION</p>' +
          "<h1>" + esc(p.name) + "</h1>" +
          '<dl class="specs">' +
            "<div><dt>Brand</dt><dd>" + esc(p.brand) + "</dd></div>" +
            '<div><dt>Dress name</dt><dd class="serif">' + esc(p.name) + "</dd></div>" +
            "<div><dt>Size</dt><dd>" + esc(p.size) + "</dd></div>" +
            "<div><dt>Rental price</dt><dd>" + esc(p.price) + "</dd></div>" +
          "</dl>" +
          '<section class="avail">' +
            '<p class="eyebrow">AVAILABILITY</p>' +
            "<h2>Dress availability</h2>" +
            '<div class="month-row">' +
              '<p class="month"></p>' +
              '<div class="month-nav">' +
                '<button class="round mprev" aria-label="Previous month">&larr;</button>' +
                '<button class="round mnext" aria-label="Next month">&rarr;</button>' +
              "</div>" +
            "</div>" +
            '<div class="legend">' +
              '<span><i class="sw booked"></i>Booked</span>' +
              '<span><i class="sw laundering"></i>Laundering</span>' +
              '<span><i class="sw"></i>Available to book</span>' +
            "</div>" +
            '<div class="cal" role="grid"></div>' +
            '<p class="pick-note">Tap an open date to pick your start date.</p>' +
            '<a class="book" href="' + esc(CONFIG.bookingLink || "#") + '" target="_blank" rel="noopener">Book your dress</a>' +
          "</section>" +
        "</div>" +
      "</article>";

    setTitle(p.name);
    initGallery(app.querySelector(".gallery"), p.images.length);
    initCalendar(app.querySelector(".avail"), p);
    window.scrollTo(0, 0);
  }

  function textPage(kind) {
    var ig = CONFIG.instagram || "hi.inya";
    var igLink = '<a href="https://instagram.com/' + esc(ig) + '" target="_blank" rel="noopener">@' + esc(ig) + "</a>";
    var html;
    if (kind === "terms") {
      setTitle("Terms & Support");
      html =
        '<p class="eyebrow">HI.INYA</p><h1>Terms &amp; Support</h1>' +
        "<h2>How to rent</h2>" +
        "<ol>" +
          "<li>Browse the collection and open a piece to see its size, price and calendar.</li>" +
          "<li>Pick an open date on the calendar.</li>" +
          "<li>Tap <strong>Book your dress</strong> to message us on Instagram with your date.</li>" +
          "<li>We'll confirm availability, payment and pickup or delivery details in the DM.</li>" +
        "</ol>" +
        "<h2>Rental periods</h2>" +
        "<p>Pieces are rented for 2 or 3 days. Prices for each are listed on the item's page.</p>" +
        "<h2>Calendar</h2>" +
        "<p>Black dates are booked. Striped dates are set aside for laundering between rentals. Everything else is open to book.</p>" +
        "<h2>Questions</h2>" +
        "<p>Send us a message on Instagram at " + igLink + ". We're based in Quezon City.</p>";
    } else {
      setTitle("Privacy Policy");
      html =
        '<p class="eyebrow">HI.INYA</p><h1>Privacy Policy</h1>' +
        "<p>This website doesn't use accounts, cookies or tracking, and it doesn't collect any personal information.</p>" +
        "<p>Bookings happen through Instagram direct messages. Anything you send us there is handled under Instagram's own privacy policy, and we only use it to arrange your rental.</p>" +
        "<p>Questions? Message us at " + igLink + ".</p>";
    }
    app.innerHTML = '<a class="back" href="#dress">&larr; Back to collection</a><article class="page">' + html + "</article>";
    window.scrollTo(0, 0);
  }

  // ---------- gallery ----------
  function initGallery(root, total) {
    var track = root.querySelector(".track");
    var count = root.querySelector(".count");
    var prev = root.querySelector(".prev");
    var next = root.querySelector(".next");
    var i = 0;

    function go(n) {
      i = (n + total) % total;
      track.style.transform = "translateX(" + (-100 * i) + "%)";
      count.textContent = (i + 1) + " / " + total;
    }
    prev.onclick = function () { go(i - 1); };
    next.onclick = function () { go(i + 1); };
    if (total < 2) { prev.disabled = next.disabled = true; }

    // swipe
    var frame = root.querySelector(".frame"), x0 = null;
    frame.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    frame.addEventListener("touchend", function (e) {
      if (x0 == null || total < 2) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    go(0);
  }

  // ---------- calendar ----------
  function initCalendar(root, p) {
    var booked = dateSet(p.booked);
    var laundering = dateSet(p.laundering);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var minY = today.getFullYear(), minM = today.getMonth();
    var y = minY, m = minM;
    var selected = null;

    var cal = root.querySelector(".cal");
    var monthEl = root.querySelector(".month");
    var mprev = root.querySelector(".mprev");
    var note = root.querySelector(".pick-note");
    var book = root.querySelector(".book");

    function render() {
      monthEl.textContent = MONTHS[m] + " " + y;
      mprev.disabled = (y === minY && m === minM);
      var first = new Date(y, m, 1);
      var lead = (first.getDay() + 6) % 7; // Monday first
      var days = new Date(y, m + 1, 0).getDate();
      var html = DOW.map(function (d) { return '<div class="dow">' + d + "</div>"; }).join("");
      for (var e = 0; e < lead; e++) html += '<div class="day empty"></div>';
      for (var d = 1; d <= days; d++) {
        var k = key(y, m, d);
        var date = new Date(y, m, d);
        var cls = "day", label = "available";
        if (booked[k]) { cls += " booked"; label = "booked"; }
        else if (laundering[k]) { cls += " laundering"; label = "laundering"; }
        else if (date < today) { cls += " past"; label = "past"; }
        if (selected === k) cls += " selected";
        var open = label === "available";
        html += '<button type="button" class="' + cls + '" data-k="' + k + '"' +
          (open ? "" : " disabled") +
          ' aria-label="' + MONTHS[m] + " " + d + ", " + label + '">' + d + "</button>";
      }
      cal.innerHTML = html;
    }

    cal.addEventListener("click", function (e) {
      var b = e.target.closest("button.day");
      if (!b || b.disabled) return;
      selected = selected === b.dataset.k ? null : b.dataset.k;
      if (selected) {
        var d = parse(selected);
        note.textContent = "Start date: " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
      } else {
        note.textContent = "Tap an open date to pick your start date.";
      }
      render();
    });

    mprev.onclick = function () { if (--m < 0) { m = 11; y--; } render(); };
    root.querySelector(".mnext").onclick = function () { if (++m > 11) { m = 0; y++; } render(); };

    // Copy a ready-made message so it can be pasted into the Instagram DM
    book.addEventListener("click", function () {
      var msg = "Hi Inya! I'd like to rent the " + p.name;
      if (selected) {
        var d = parse(selected);
        msg += " starting " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
      }
      msg += ". Is it available?";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(function () {
          toast("Message copied. Paste it in the Instagram DM.");
        }, function () {});
      }
    });

    render();
  }

  // ---------- router ----------
  // Plain hashes (#tops, #item-dahlia, #terms) so links can be shared
  function route() {
    var h = location.hash.replace(/^#\/?/, "");
    if (h.indexOf("item-") === 0) {
      var id = h.slice(5);
      var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
      if (p) return detailView(p);
    }
    if (h === "terms") return textPage("terms");
    if (h === "privacy") return textPage("privacy");
    collectionView(h === "tops" ? "top" : "dress");
  }

  window.addEventListener("hashchange", route);
  route();
})();
