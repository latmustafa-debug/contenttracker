(function () {
  "use strict";

  var STORAGE_KEY = "ugc-tracker-data-v1";
  var app = document.getElementById("app");

  var data = loadData();
  var state = { view: "home", currentBrandId: null, editingBrandId: null };

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { brands: [] };
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getBrand(id) {
    return data.brands.find(function (b) { return b.id === id; });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- date helpers ----------

  function startOfWeek(d) {
    var date = new Date(d);
    date.setHours(0, 0, 0, 0);
    var day = date.getDay(); // 0 Sun .. 6 Sat
    var diff = (day === 0 ? -6 : 1) - day; // Monday as start of week
    date.setDate(date.getDate() + diff);
    return date;
  }

  function startOfMonth(d) {
    var date = new Date(d);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function weeklyCount(brand) {
    var start = startOfWeek(new Date()).getTime();
    return brand.entries.filter(function (e) { return e.timestamp >= start; }).length;
  }

  function monthlyCount(brand) {
    var start = startOfMonth(new Date()).getTime();
    return brand.entries.filter(function (e) { return e.timestamp >= start; }).length;
  }

  function totalCount(brand) {
    return brand.entries.length;
  }

  // ---------- entry mutation ----------

  function addEntry(brand) {
    brand.entries.push({ timestamp: Date.now(), bonus: false });
    saveData();
  }

  function removeLastEntry(brand) {
    if (brand.entries.length) {
      brand.entries.pop();
      saveData();
    }
  }

  function toggleBonus(brand, idx) {
    if (brand.entries[idx]) {
      brand.entries[idx].bonus = !brand.entries[idx].bonus;
      saveData();
    }
  }

  // ---------- render ----------

  function render() {
    if (state.view === "detail" && !getBrand(state.currentBrandId)) state.view = "home";
    if (state.view === "home") renderHome();
    else if (state.view === "detail") renderDetail();
    else if (state.view === "form") renderForm();
    window.scrollTo(0, 0);
  }

  function renderHome() {
    var rows = data.brands.map(function (brand) {
      var total = totalCount(brand);
      var goal = brand.totalGoal || 0;
      var pct = goal > 0 ? Math.min(100, (total / goal) * 100) : 0;
      var hit = goal > 0 && total >= goal;
      return (
        '<div class="brand-row" data-id="' + brand.id + '">' +
          '<div class="brand-row-top">' +
            '<div class="brand-name">' + escapeHtml(brand.name) + "</div>" +
            '<div class="brand-tally' + (hit ? " hit" : "") + '">' + total + " / " + goal + "</div>" +
          "</div>" +
          '<div class="progress-track"><div class="progress-fill' + (hit ? " hit" : "") + '" style="width:' + pct + '%"></div></div>' +
        "</div>"
      );
    }).join("");

    var emptyState = data.brands.length === 0
      ? '<div class="empty-state">No brands yet.<br>Add one below to start tracking.</div>'
      : "";

    app.innerHTML =
      '<div class="header"><div class="title">UGC Tracker</div></div>' +
      '<div class="brand-list">' + rows + "</div>" +
      emptyState +
      '<div class="add-row" id="addBrandBtn"><span>+</span><span>Add Brand</span></div>';

    app.querySelectorAll(".brand-row").forEach(function (row) {
      row.addEventListener("click", function () {
        state.currentBrandId = row.dataset.id;
        state.view = "detail";
        render();
      });
    });

    document.getElementById("addBrandBtn").onclick = function () {
      state.editingBrandId = null;
      state.view = "form";
      render();
    };
  }

  function renderDetail() {
    var brand = getBrand(state.currentBrandId);
    var total = totalCount(brand);
    var week = weeklyCount(brand);
    var month = monthlyCount(brand);
    var goal = brand.totalGoal || 0;
    var gridLen = Math.max(goal, total);

    var squares = "";
    for (var i = 0; i < gridLen; i++) {
      if (i < total) {
        var e = brand.entries[i];
        squares += '<div class="square ' + (e.bonus ? "bonus" : "normal") + ' tappable" data-idx="' + i + '"></div>';
      } else if (i === total) {
        squares += '<div class="square tappable" data-idx="' + i + '"></div>';
      } else {
        squares += '<div class="square"></div>';
      }
    }
    if (gridLen === 0) {
      squares = '<div class="square tappable" data-idx="0"></div>';
    }

    app.innerHTML =
      '<div class="header">' +
        '<button class="icon-btn dim" id="backBtn">&lsaquo; Back</button>' +
        '<button class="icon-btn dim" id="editBtn">Edit</button>' +
      "</div>" +
      '<div class="stats-block">' +
        '<div class="stat-total">' + total + " / " + goal + "</div>" +
        '<div class="stat-total-label">' + escapeHtml(brand.name) + " &middot; Total Deliverables</div>" +
      "</div>" +
      '<div class="stat-pills">' +
        '<div class="stat-pill"><div class="stat-pill-value">' + week + " / " + (brand.weeklyGoal || 0) + '</div><div class="stat-pill-label">This Week</div></div>' +
        '<div class="stat-pill"><div class="stat-pill-value">' + month + " / " + (brand.monthlyGoal || 0) + '</div><div class="stat-pill-label">This Month</div></div>' +
      "</div>" +
      '<div class="grid-section-label">Progress</div>' +
      '<div class="square-grid">' + squares + "</div>" +
      '<div class="grid-legend">' +
        '<div class="legend-item"><span class="legend-swatch normal"></span>Delivered</div>' +
        '<div class="legend-item"><span class="legend-swatch bonus"></span>Bonus</div>' +
        '<div class="legend-item"><span class="legend-swatch empty"></span>Remaining</div>' +
      "</div>" +
      '<div class="controls-row">' +
        '<button class="round-btn minus" id="subtractBtn">&minus;</button>' +
        '<button class="round-btn" id="addBtn">+</button>' +
      "</div>";

    document.getElementById("backBtn").onclick = function () {
      state.view = "home";
      render();
    };
    document.getElementById("editBtn").onclick = function () {
      state.editingBrandId = brand.id;
      state.view = "form";
      render();
    };
    document.getElementById("addBtn").onclick = function () {
      addEntry(brand);
      render();
    };
    document.getElementById("subtractBtn").onclick = function () {
      removeLastEntry(brand);
      render();
    };
    app.querySelectorAll(".square.tappable").forEach(function (sq) {
      sq.addEventListener("click", function () {
        var idx = parseInt(sq.dataset.idx, 10);
        if (idx < brand.entries.length) {
          toggleBonus(brand, idx);
        } else {
          addEntry(brand);
        }
        render();
      });
    });
  }

  function renderForm() {
    var editing = state.editingBrandId ? getBrand(state.editingBrandId) : null;

    app.innerHTML =
      '<div class="header"><button class="icon-btn dim" id="cancelBtn">Cancel</button></div>' +
      '<div class="title" style="margin-bottom:28px;">' + (editing ? "Edit Brand" : "New Brand") + "</div>" +
      '<div class="form-group">' +
        '<label class="form-label">Brand Name</label>' +
        '<input class="form-input" id="nameInput" type="text" placeholder="e.g. Glossier" value="' + (editing ? escapeHtml(editing.name) : "") + '">' +
      "</div>" +
      '<div class="form-group">' +
        '<label class="form-label">Total Deliverables</label>' +
        '<input class="form-input" id="totalInput" type="number" inputmode="numeric" placeholder="e.g. 40" value="' + (editing ? editing.totalGoal : "") + '">' +
      "</div>" +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label class="form-label">Weekly Goal</label>' +
          '<input class="form-input" id="weeklyInput" type="number" inputmode="numeric" placeholder="e.g. 4" value="' + (editing ? editing.weeklyGoal : "") + '">' +
        "</div>" +
        '<div class="form-group">' +
          '<label class="form-label">Monthly Goal</label>' +
          '<input class="form-input" id="monthlyInput" type="number" inputmode="numeric" placeholder="e.g. 16" value="' + (editing ? editing.monthlyGoal : "") + '">' +
        "</div>" +
      "</div>" +
      '<button class="primary-btn" id="saveBtn">Save</button>' +
      (editing ? '<button class="delete-btn" id="deleteBtn">Delete Brand</button>' : "");

    document.getElementById("cancelBtn").onclick = function () {
      state.view = editing ? "detail" : "home";
      render();
    };

    document.getElementById("saveBtn").onclick = function () {
      var name = document.getElementById("nameInput").value.trim();
      var total = parseInt(document.getElementById("totalInput").value, 10);
      var weekly = parseInt(document.getElementById("weeklyInput").value, 10);
      var monthly = parseInt(document.getElementById("monthlyInput").value, 10);

      if (!name || !total || total < 1) {
        alert("Please enter a brand name and a total deliverables goal.");
        return;
      }

      if (editing) {
        editing.name = name;
        editing.totalGoal = total;
        editing.weeklyGoal = weekly || 0;
        editing.monthlyGoal = monthly || 0;
        saveData();
        state.view = "detail";
        state.currentBrandId = editing.id;
      } else {
        var brand = {
          id: uid(),
          name: name,
          totalGoal: total,
          weeklyGoal: weekly || 0,
          monthlyGoal: monthly || 0,
          entries: [],
          createdAt: Date.now()
        };
        data.brands.push(brand);
        saveData();
        state.view = "home";
      }
      render();
    };

    if (editing) {
      document.getElementById("deleteBtn").onclick = function () {
        if (!confirm('Delete "' + editing.name + '"? This can\'t be undone.')) return;
        data.brands = data.brands.filter(function (b) { return b.id !== editing.id; });
        saveData();
        state.view = "home";
        render();
      };
    }
  }

  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
