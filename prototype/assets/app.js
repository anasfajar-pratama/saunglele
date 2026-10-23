/* ============================================================
   Saung Lele CRM — Shared prototype behaviour
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Icon sprite ---------- */

  const ICONS = {
    "dashboard": '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "user": '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    "target": '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    "message": '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    "message-square": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    "file": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/>',
    "file-check": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/>',
    "package": '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    "refresh": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    "chart": '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
    "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "bell": '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    "calendar": '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    "calendar-check": '<path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m16 19 2 2 4-4"/>',
    "menu": '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    "plus": '<path d="M5 12h14"/><path d="M12 5v14"/>',
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    "upload": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    "whatsapp": '<path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2z"/><path d="M8.5 7.5c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .6.5l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.4.7 1.4 1.8 2.6 2.3.3.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.2.1.4.3.4.5 0 .3-.1 1.2-.6 1.6-.5.5-1.2.8-2 .8-.8 0-2.4-.4-4.2-2.1-1.8-1.7-2.4-3.2-2.4-4 0-.8.3-1.5.8-1.9z"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "check-circle": '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    "alert": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    "alert-circle": '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    "filter": '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "arrow-up-right": '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
    "more-horizontal": '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    "x": '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    "send": '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    "copy": '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    "phone": '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    "map-pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    "utensils": '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/>',
    "fish": '<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6-3.56 0-7.56-2.53-8.5-6Z"/><path d="M18 12v.5"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.63-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/>',
    "sprout": '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    "edit": '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
    "eye": '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    "cash": '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    "truck": '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    "clipboard": '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    "link": '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    "star": '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    "sparkles": '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
    "inbox": '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    "trending-up": '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    "list": '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
    "settings": '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    "activity": '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    "layers": '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    "pie": '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    "percent": '<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    "trash": '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    "external": '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    "circle": '<circle cx="12" cy="12" r="9"/>'
  };

  function iconMarkup(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.circle) + "</svg>";
  }

  function hydrateIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      if (el.getAttribute("data-icon-ready") === "true") return;
      el.innerHTML = iconMarkup(el.getAttribute("data-icon"));
      el.setAttribute("data-icon-ready", "true");
    });
  }

  /* ---------- Sidebar ---------- */

  const NAV = [
    {
      label: "Utama",
      items: [
        { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "index.html" }
      ]
    },
    {
      label: "Pelanggan",
      items: [
        { id: "customers", label: "Pelanggan", icon: "users", href: "customers.html", badge: "126" },
        { id: "pipeline", label: "Pipeline Lead", icon: "target", href: "pipeline.html", badge: "18" }
      ]
    },
    {
      label: "Komunikasi",
      items: [
        { id: "templates", label: "Template Pesan", icon: "message", href: "templates.html" }
      ]
    },
    {
      label: "Penjualan",
      items: [
        { id: "quotations", label: "Quotation", icon: "file", href: "quotations.html" },
        { id: "pos", label: "Pesanan (PO)", icon: "package", href: "purchase-orders.html", badge: "12" }
      ]
    },
    {
      label: "Kemitraan",
      items: [
        { id: "buyback", label: "Buyback Panen", icon: "refresh", href: "buyback.html", badge: "23" }
      ]
    },
    {
      label: "Analitik",
      items: [
        { id: "reports", label: "Laporan", icon: "chart", href: "reports.html" }
      ]
    }
  ];

  function renderSidebar() {
    const el = document.getElementById("sidebar");
    if (!el) return;

    const active = document.body.getAttribute("data-page") || "dashboard";
    let navHtml = "";

    NAV.forEach(function (section) {
      navHtml += '<div class="nav-section">';
      navHtml += '<div class="nav-label">' + section.label + "</div>";
      section.items.forEach(function (item) {
        const isActive = item.id === active ? " active" : "";
        const badge = item.badge ? '<span class="nav-badge">' + item.badge + "</span>" : "";
        navHtml +=
          '<a class="nav-item' + isActive + '" href="' + item.href + '">' +
          '<span data-icon="' + item.icon + '"></span>' +
          "<span>" + item.label + "</span>" +
          badge +
          "</a>";
      });
      navHtml += "</div>";
    });

    el.innerHTML =
      '<div class="brand">' +
        '<span class="brand-mark"><span data-icon="fish"></span></span>' +
        '<div><span class="brand-name">Saung Lele</span><span class="brand-sub">CRM Ternak &amp; Jual Beli</span></div>' +
      "</div>" +
      '<div class="workspace">' +
        '<span class="workspace-dot"></span>' +
        "<div><strong>Saung Lele</strong><span>Cabang Utama · Semarang</span></div>" +
        '<span data-icon="chevron-down"></span>' +
      "</div>" +
      navHtml +
      '<div class="sidebar-foot">' +
        '<div class="sidebar-card">' +
          '<span class="sidebar-card-icon" data-icon="clock"></span>' +
          "<div><strong>8 follow-up hari ini</strong><span>3 sudah terlambat</span>" +
          '<a href="index.html#followups">Lihat antrean</a></div>' +
        "</div>" +
        '<div class="sidebar-user">' +
          '<span class="avatar avatar-sm">SL</span>' +
          "<div><strong>Saung Lele</strong><span>Pemilik · Admin</span></div>" +
        "</div>" +
      "</div>";

    hydrateIcons(el);
  }

  function setupSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    let backdrop = document.querySelector(".sidebar-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "sidebar-backdrop";
      document.body.appendChild(backdrop);
    }

    function close() {
      sidebar.classList.remove("open");
      backdrop.classList.remove("show");
      document.body.classList.remove("sidebar-open");
    }

    function toggle() {
      const isOpen = sidebar.classList.toggle("open");
      backdrop.classList.toggle("show", isOpen);
      document.body.classList.toggle("sidebar-open", isOpen);
    }

    document.querySelectorAll("[data-sidebar-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggle);
    });

    backdrop.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ---------- Generic tabs ---------- */

  function setupTabs() {
    document.querySelectorAll("[data-tabs]").forEach(function (scope) {
      scope.querySelectorAll("[data-tab]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const id = btn.getAttribute("data-tab");
          scope.querySelectorAll("[data-tab]").forEach(function (b) {
            b.classList.toggle("active", b === btn);
          });
          scope.querySelectorAll("[data-panel]").forEach(function (panel) {
            panel.classList.toggle("active", panel.getAttribute("data-panel") === id);
          });
        });
      });

      scope.querySelectorAll("[data-tab-link]").forEach(function (link) {
        link.addEventListener("click", function () {
          const target = scope.querySelector('[data-tab="' + link.getAttribute("data-tab-link") + '"]');
          if (target) target.click();
        });
      });
    });
  }

  /* ---------- Modals ---------- */

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("open");
    document.body.classList.add("sidebar-open");
    const focusable = modal.querySelector("input, select, textarea, button");
    if (focusable) {
      window.setTimeout(function () { focusable.focus(); }, 40);
    }
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("open");
    if (!document.querySelector(".modal-backdrop.open")) {
      document.body.classList.remove("sidebar-open");
    }
  }

  function setupModals() {
    document.querySelectorAll("[data-modal-open]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openModal(btn.getAttribute("data-modal-open"));
      });
    });

    document.querySelectorAll("[data-modal-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeModal(btn.closest(".modal-backdrop"));
      });
    });

    document.querySelectorAll(".modal-backdrop").forEach(function (backdrop) {
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) closeModal(backdrop);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-backdrop.open").forEach(function (m) {
          closeModal(m);
        });
      }
    });
  }

  /* ---------- Toast ---------- */

  let toastTimer = null;

  function showToast(message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<span data-icon="check-circle"></span><span>' + message + "</span>";
    hydrateIcons(toast);
    window.clearTimeout(toastTimer);
    requestAnimationFrame(function () {
      toast.classList.add("show");
    });
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 2800);
  }

  window.showToast = showToast;

  function setupToastTriggers() {
    document.querySelectorAll("[data-toast]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        if (el.tagName === "A" && el.getAttribute("href") === "#") e.preventDefault();
        showToast(el.getAttribute("data-toast"));
      });
    });

    document.querySelectorAll("[data-demo-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        const message = form.getAttribute("data-demo-form") || "Tersimpan.";
        showToast(message);
        closeModal(form.closest(".modal-backdrop"));
        form.reset();
      });
    });
  }

  /* ---------- Reminder checkboxes ---------- */

  function setupReminders() {
    document.querySelectorAll(".reminder-check").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const row = btn.closest(".reminder");
        if (!row) return;
        row.classList.toggle("done");
        if (row.classList.contains("done")) {
          showToast("Follow-up ditandai selesai.");
        }
      });
    });
  }

  /* ---------- Copy buttons ---------- */

  function setupCopyButtons() {
    document.querySelectorAll("[data-copy-target]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const target = document.querySelector(btn.getAttribute("data-copy-target"));
        if (!target) return;
        const text = target.tagName === "TEXTAREA" || target.tagName === "INPUT" ? target.value : target.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text.trim()).then(function () {
            showToast("Pesan disalin ke clipboard.");
          }).catch(function () {
            showToast("Gagal menyalin. Silakan salin manual.");
          });
        } else {
          showToast("Pesan siap disalin manual.");
        }
      });
    });
  }

  /* ---------- Customer filters ---------- */

  function setupCustomerFilters() {
    const rows = Array.prototype.slice.call(document.querySelectorAll("[data-customer-row]"));
    if (!rows.length) return;

    const segmentButtons = document.querySelectorAll("[data-segment-filter]");
    const search = document.getElementById("customerSearch");
    const status = document.getElementById("customerStatus");
    const shown = document.getElementById("customerShown");
    let segment = "all";

    function apply() {
      const q = (search ? search.value : "").toLowerCase().trim();
      const statusValue = status ? status.value : "all";
      let visible = 0;

      rows.forEach(function (row) {
        const matchesSegment = segment === "all" ||
          (segment === "berisiko"
            ? row.getAttribute("data-health") === "berisiko"
            : row.getAttribute("data-segment") === segment);
        const matchesQuery = !q || row.textContent.toLowerCase().indexOf(q) !== -1;
        const matchesStatus = statusValue === "all" || row.getAttribute("data-health") === statusValue;
        const show = matchesSegment && matchesQuery && matchesStatus;
        row.style.display = show ? "" : "none";
        if (show) visible += 1;
      });

      if (shown) {
        shown.textContent = visible + " dari " + rows.length + " pelanggan";
      }
    }

    segmentButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        segment = btn.getAttribute("data-segment-filter");
        segmentButtons.forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        apply();
      });
    });

    if (search) search.addEventListener("input", apply);
    if (status) status.addEventListener("change", apply);
    apply();
  }

  /* ---------- PO filters ---------- */

  function setupPoFilters() {
    const rows = Array.prototype.slice.call(document.querySelectorAll("[data-po-row]"));
    if (!rows.length) return;

    const buttons = document.querySelectorAll("[data-po-filter]");
    const empty = document.getElementById("poEmpty");

    function apply(value) {
      let visible = 0;
      rows.forEach(function (row) {
        const show = value === "all" || row.getAttribute("data-po-status") === value;
        row.style.display = show ? "" : "none";
        if (show) visible += 1;
      });
      if (empty) empty.classList.toggle("hidden", visible > 0);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        apply(btn.getAttribute("data-po-filter"));
      });
    });
  }

  /* ---------- Templates & WhatsApp preview ---------- */

  function setupTemplates() {
    const items = Array.prototype.slice.call(document.querySelectorAll("[data-template-item]"));
    if (!items.length) return;

    const message = document.getElementById("waMessage");
    const bubble = document.getElementById("waBubble");
    const vars = document.getElementById("waVars");
    const templateName = document.getElementById("waTemplateName");
    const empty = document.getElementById("templateEmpty");

    function setBubble(text) {
      if (!bubble) return;
      bubble.textContent = text;
      const time = document.createElement("span");
      time.className = "wa-time";
      time.innerHTML = '09.05 <span class="tick">✓✓</span>';
      bubble.appendChild(time);
    }

    function select(item) {
      items.forEach(function (i) { i.classList.toggle("selected", i === item); });

      const preview = item.getAttribute("data-preview") || "";
      if (message) message.value = preview;
      setBubble(preview);
      if (templateName) templateName.textContent = item.getAttribute("data-template-name") || "Template";

      if (vars) {
        const raw = item.getAttribute("data-vars") || "";
        vars.innerHTML = raw.split(",").filter(Boolean).map(function (v) {
          return '<span class="var-chip">' + v.trim() + "</span>";
        }).join("");
      }
    }

    items.forEach(function (item) {
      item.addEventListener("click", function () { select(item); });
    });

    if (items[0]) select(items[0]);

    if (message && bubble) {
      message.addEventListener("input", function () {
        setBubble(message.value);
      });
    }

    const categories = Array.prototype.slice.call(document.querySelectorAll("[data-template-category]"));
    const search = document.getElementById("templateSearch");
    let activeCategory = "all";

    function applyFilter() {
      const query = search ? search.value.toLowerCase().trim() : "";
      let visible = 0;

      items.forEach(function (item) {
        const matchCategory = activeCategory === "all" || item.getAttribute("data-category") === activeCategory;
        const matchQuery = !query || item.textContent.toLowerCase().indexOf(query) !== -1;
        const show = matchCategory && matchQuery;
        item.classList.toggle("hidden", !show);
        if (show) visible += 1;
      });

      if (empty) empty.classList.toggle("hidden", visible > 0);
    }

    categories.forEach(function (cat) {
      cat.addEventListener("click", function () {
        activeCategory = cat.getAttribute("data-template-category");
        categories.forEach(function (c) { c.classList.toggle("active", c === cat); });
        applyFilter();
      });
    });

    if (search) search.addEventListener("input", applyFilter);
    applyFilter();
  }

  /* ---------- Quotation builder ---------- */

  function formatMoney(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(Math.round(value || 0));
  }

  function parseNumber(value) {
    const parsed = parseInt(String(value || "").replace(/[^\d]/g, ""), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  function setupQuotation() {
    const tbody = document.getElementById("quoteItems");
    if (!tbody) return;

    function recalc() {
      let subtotal = 0;
      let totalDiscount = 0;
      const rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));

      rows.forEach(function (row) {
        const qty = parseNumber(row.querySelector(".qty-input") ? row.querySelector(".qty-input").value : 0);
        const price = parseNumber(row.querySelector(".price-input") ? row.querySelector(".price-input").value : 0);
        const discount = parseNumber(row.querySelector(".discount-input") ? row.querySelector(".discount-input").value : 0);
        const line = Math.max(0, qty * price - discount);
        const totalCell = row.querySelector(".line-total");
        if (totalCell) totalCell.textContent = formatMoney(line);
        subtotal += qty * price;
        totalDiscount += discount;
      });

      const shipping = parseNumber(document.getElementById("shippingInput") ? document.getElementById("shippingInput").value : 0);
      const taxable = Math.max(0, subtotal - totalDiscount + shipping);
      const tax = Math.round(taxable * 0.11);
      const total = taxable + tax;

      const set = function (id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };

      set("sumSubtotal", formatMoney(subtotal));
      set("sumDiscount", "- " + formatMoney(totalDiscount));
      set("sumShipping", formatMoney(shipping));
      set("sumTax", formatMoney(tax));
      set("sumTotal", formatMoney(total));
      set("sumItems", rows.length + " item");
      set("sumLineCount", rows.length);

      const docTotal = document.getElementById("docTotal");
      if (docTotal) docTotal.textContent = formatMoney(total);
    }

    tbody.addEventListener("input", recalc);
    tbody.addEventListener("change", function (e) {
      if (e.target.classList.contains("product-select")) {
        const row = e.target.closest("tr");
        const option = e.target.options[e.target.selectedIndex];
        const priceInput = row.querySelector(".price-input");
        const unit = row.querySelector(".qty-unit");
        if (option) {
          if (priceInput && option.getAttribute("data-price")) {
            priceInput.value = option.getAttribute("data-price");
          }
          if (unit) unit.textContent = option.getAttribute("data-unit") || "";
        }
      }
      recalc();
    });

    tbody.addEventListener("click", function (e) {
      const remove = e.target.closest(".line-remove");
      if (remove) {
        const row = remove.closest("tr");
        if (tbody.querySelectorAll("tr").length > 1) {
          row.remove();
          recalc();
          showToast("Item quotation dihapus.");
        } else {
          showToast("Quotation harus punya minimal satu item.");
        }
      }
    });

    const shipping = document.getElementById("shippingInput");
    if (shipping) shipping.addEventListener("input", recalc);

    const firstRow = tbody.querySelector("tr");

    function addRow(data) {
      if (!firstRow) return;
      const row = firstRow.cloneNode(true);
      const select = row.querySelector(".product-select");
      if (select && data.name) {
        Array.prototype.forEach.call(select.options, function (opt) {
          if (opt.value === data.name) select.value = data.name;
        });
      }
      const qty = row.querySelector(".qty-input");
      const price = row.querySelector(".price-input");
      const discount = row.querySelector(".discount-input");
      const unit = row.querySelector(".qty-unit");
      if (qty) qty.value = "1";
      if (price) price.value = data.price || "0";
      if (discount) discount.value = "0";
      if (unit) unit.textContent = data.unit || "kg";
      tbody.appendChild(row);
      recalc();
    }

    document.querySelectorAll("[data-add-product]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        addRow({
          name: btn.getAttribute("data-name"),
          price: btn.getAttribute("data-price"),
          unit: btn.getAttribute("data-unit")
        });
        showToast("Produk ditambahkan ke quotation.");
      });
    });

    const productTabs = document.querySelectorAll("[data-product-tab]");
    productTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        const value = tab.getAttribute("data-product-tab");
        productTabs.forEach(function (t) { t.classList.toggle("active", t === tab); });
        document.querySelectorAll("[data-product-group]").forEach(function (group) {
          group.classList.toggle("hidden", group.getAttribute("data-product-group") !== value);
        });
      });
    });

    recalc();
  }

  /* ---------- Customer detail note composer ---------- */

  function setupNoteComposer() {
    const form = document.getElementById("noteForm");
    if (!form) return;
    const timeline = document.getElementById("timelineList");
    const textarea = document.getElementById("noteText");
    const typeButtons = form.querySelectorAll("[data-note-type]");

    typeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        typeButtons.forEach(function (b) { b.classList.toggle("active", b === btn); });
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const text = textarea ? textarea.value.trim() : "";
      if (!text) {
        showToast("Tulis catatan terlebih dahulu.");
        return;
      }

      const activeType = form.querySelector("[data-note-type].active");
      const type = activeType ? activeType.getAttribute("data-note-type") : "Catatan";

      if (timeline) {
        const item = document.createElement("div");
        item.className = "timeline-item";
        item.innerHTML =
          '<span class="timeline-dot"><span data-icon="edit"></span></span>' +
          '<div class="timeline-head"><strong>' + type + "</strong><time>Baru saja · Admin</time></div>" +
          '<div class="timeline-body">' + text.replace(/</g, "&lt;") + "</div>";
        timeline.prepend(item);
        hydrateIcons(item);
      }

      if (textarea) textarea.value = "";
      showToast("Catatan disimpan dan follow-up dijadwalkan.");
    });
  }

  /* ---------- Segmented controls (generic) ---------- */

  function setupSegmented() {
    document.querySelectorAll(".segmented").forEach(function (group) {
      group.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          group.querySelectorAll("button").forEach(function (b) {
            b.classList.toggle("active", b === btn);
          });
        });
      });
    });
  }

  /* ---------- Init ---------- */

  function init() {
    renderSidebar();
    hydrateIcons(document);
    setupSidebar();
    setupTabs();
    setupModals();
    setupToastTriggers();
    setupReminders();
    setupCopyButtons();
    setupCustomerFilters();
    setupPoFilters();
    setupTemplates();
    setupQuotation();
    setupNoteComposer();
    setupSegmented();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
