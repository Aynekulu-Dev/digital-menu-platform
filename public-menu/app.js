(function () {
  "use strict";

  var app = document.getElementById("app");
  var lang = "en"; // 'en' | 'am'
  var menuData = null;

  function slugFromPath() {
    // Expects /menu/<slug>  (see render.yaml rewrite rule that routes
    // everything under /menu/* back to this index.html)
    var parts = window.location.pathname.split("/").filter(Boolean);
    var idx = parts.indexOf("menu");
    return idx >= 0 && parts[idx + 1] ? decodeURIComponent(parts[idx + 1]) : null;
  }

  function formatPrice(price) {
    var n = Number(price);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  function renderError(message) {
    app.innerHTML =
      '<div class="error-state"><div>' +
      '<p class="title">This menu isn\u2019t available</p>' +
      '<p>' + escapeHtml(message) + "</p>" +
      "</div></div>";
  }

  function renderLoading() {
    app.innerHTML = '<div class="loading">Loading menu\u2026</div>';
  }

  function catName(cat) { return lang === "en" ? cat.name_en : cat.name_am; }
  function itemTitle(item) { return lang === "en" ? item.title_en : item.title_am; }
  function itemDesc(item) { return lang === "en" ? item.description_en : item.description_am; }

  function render() {
    if (!menuData) return;
    var cats = menuData.menu_categories || [];

    var pills = cats
      .map(function (cat, i) {
        return (
          '<button class="cat-pill' + (i === 0 ? " active" : "") + '" data-cat="' + cat.id + '">' +
          escapeHtml(catName(cat)) +
          "</button>"
        );
      })
      .join("");

    var sections = cats.length
      ? cats
          .map(function (cat) {
            var items = (cat.items || [])
              .map(function (item) {
                var img = item.image_s3_url
                  ? '<img src="' + escapeHtml(item.image_s3_url) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />'
                  : "";
                var desc = itemDesc(item)
                  ? '<p class="item-desc">' + escapeHtml(itemDesc(item)) + "</p>"
                  : "";
                var soldOut = !item.is_available
                  ? '<span class="sold-out-badge">Sold out</span>'
                  : "";
                return (
                  '<li class="item-row' + (!item.is_available ? " sold-out" : "") + '">' +
                  img +
                  '<div class="item-body">' +
                  '<div class="item-title-row">' +
                  '<span class="item-title">' + escapeHtml(itemTitle(item)) + "</span>" +
                  '<span class="leader"></span>' +
                  '<span class="item-price">' + formatPrice(item.price) + "</span>" +
                  "</div>" +
                  desc +
                  soldOut +
                  "</div></li>"
                );
              })
              .join("");
            return (
              '<section class="cat-section" id="cat-' + cat.id + '">' +
              "<h2>" + escapeHtml(catName(cat)) + "</h2>" +
              '<ul class="item-list">' + items + "</ul>" +
              "</section>"
            );
          })
          .join("")
      : '<p class="empty-note">This menu doesn\u2019t have any items yet.</p>';

    app.innerHTML =
      '<header class="hero">' +
      '<p class="eyebrow">Today\u2019s Menu</p>' +
      "<h1>" + escapeHtml(menuData.restaurant_name) + "</h1>" +
      "</header>" +
      '<div class="nav-bar">' +
      '<div class="cat-scroller">' + pills + "</div>" +
      '<div class="lang-toggle">' +
      '<button data-lang="en" class="' + (lang === "en" ? "active" : "") + '">EN</button>' +
      '<button data-lang="am" class="' + (lang === "am" ? "active" : "") + '">\u12A0\u121B</button>' +
      "</div></div>" +
      "<main>" + sections + "</main>" +
      '<footer><p>Prices in ETB \u00B7 Ask your server for allergen details</p></footer>';

    app.querySelectorAll(".cat-pill").forEach(function (btn) {
      btn.addEventListener("click", function () {
        app.querySelectorAll(".cat-pill").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var target = document.getElementById("cat-" + btn.dataset.cat);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    app.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        lang = btn.dataset.lang;
        render();
      });
    });
  }

  function load() {
    var slug = slugFromPath();
    if (!slug) {
      renderError("No restaurant was specified in this link.");
      return;
    }
    renderLoading();
    var base = (window.API_BASE_URL || "").replace(/\/$/, "");
    fetch(base + "/api/v1/public/menu/" + encodeURIComponent(slug) + "/")
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (body) {
            throw new Error((body && body.message) || "Could not load this menu.");
          });
        }
        return res.json();
      })
      .then(function (data) {
        menuData = data;
        render();
      })
      .catch(function (err) {
        renderError(err.message || "Could not load this menu.");
      });
  }

  load();
})();
