import { menuDocument } from "./firebase.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const loading = $("loading");
const errorBox = $("errorBox");
const menuRoot = $("menuRoot");
const categoryNav = $("categoryNav");
const recommendedSection = $("recommendedSection");
const recommendedGrid = $("recommendedGrid");
const imageModal = $("imageModal");
const modalImage = $("modalImage");

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}
function normalizeItem(item = {}) {
  // menu-data.jsの配列形式
  // ["料理名", "産地・説明", 価格]
  if (Array.isArray(item)) {
    return {
      id: crypto.randomUUID(),
      name: item[0] || "",
      meta: item[1] || "",
      price: Number(item[2]) || 0,
      imageUrl: item[3] || "",
      recommended: Boolean(item[4]),
      seasonal: Boolean(item[5]),
      soldOut: Boolean(item[6]),
      hidden: Boolean(item[7]),
    };
  }

  // 管理画面・Firestoreのオブジェクト形式
  const rawPrice =
    item.price ??
    item.priceYen ??
    item.priceJPY ??
    item.amount ??
    0;

  return {
    id: item.id || crypto.randomUUID(),

    name:
      item.name ||
      item.nameEn ||
      item.englishName ||
      item.title ||
      "",

    meta:
      item.meta ||
      item.description ||
      item.descriptionEn ||
      item.detail ||
      "",

    price:
      Number(
        String(rawPrice).replace(/[¥￥,\s]/g, "")
      ) || 0,

    imageUrl:
      item.imageUrl ||
      item.image ||
      item.photoUrl ||
      "",

    recommended: Boolean(
      item.recommended ?? item.isRecommended
    ),

    seasonal: Boolean(
      item.seasonal ?? item.isSeasonal
    ),

    soldOut: Boolean(
      item.soldOut ?? item.isSoldOut
    ),

    hidden: Boolean(
      item.hidden ?? item.isHidden
    ),
  };
}
function normalizeSections(sections = []) {
  return sections.map((section, i) => ({
    id: section.id || `section-${i + 1}`,
    title: section.title || "",
    description: section.description || "",
    items: (section.items || []).map(normalizeItem)
  }));
}

function openModal(url, alt) {
  if (!url) return;

  modalImage.src = url;
  modalImage.alt = alt;
  imageModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal() {
  imageModal.hidden = true;
  modalImage.removeAttribute("src");
  document.body.classList.remove("modal-open");
}

$("modalClose")?.addEventListener("click", closeModal);

imageModal?.addEventListener("click", (e) => {
  if (e.target === imageModal) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

function createCard(item, compact = false) {

  const card = document.createElement("article");

  card.className = [
    compact ? "recommended-card" : "menu-item",
    item.imageUrl ? "has-image" : "no-image",
    item.soldOut ? "is-sold-out" : ""
  ].filter(Boolean).join(" ");

  const badges = [
    item.recommended
      ? '<span class="badge recommended-badge">Recommended</span>'
      : "",
    item.seasonal
      ? '<span class="badge seasonal-badge">Seasonal</span>'
      : ""
  ].join("");

  card.innerHTML = `

    ${
      item.imageUrl
        ? `
          <button
            class="image-button"
            type="button"
            aria-label="Open image of ${escapeHtml(item.name)}"
          >
            <img
              src="${escapeHtml(item.imageUrl)}"
              alt="${escapeHtml(item.name)}"
              loading="lazy"
            >
          </button>
        `
        : ""
    }

    <div class="item-body">
      <div class="title-row">
        <h3>${escapeHtml(item.name)}</h3>

        ${
          badges
            ? `<div class="badges">${badges}</div>`
            : ""
        }
      </div>

      ${
        item.meta
          ? `<p class="item-meta">${escapeHtml(item.meta)}</p>`
          : ""
      }

      <div class="item-bottom">
        ${
          item.soldOut
            ? '<span class="sold-out-label">SOLD OUT</span>'
            : "<span></span>"
        }

        <span class="item-price">
          ${yen.format(item.price)}
        </span>
      </div>
    </div>
  `;

  card
    .querySelector(".image-button")
    ?.addEventListener("click", () => {
      openModal(item.imageUrl, item.name);
    });

  return card;
}

function render(sections) {
  menuRoot.innerHTML = "";
  categoryNav.innerHTML = "";
  recommendedGrid.innerHTML = "";
  recommendedSection.hidden = true;

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  const visibleSections = normalizeSections(sections)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.hidden)
    }))
    .filter((section) => section.items.length > 0);

  const recommendedItems = visibleSections.flatMap((section) =>
    section.items.filter((item) => item.recommended)
  );

  if (recommendedItems.length > 0) {
    recommendedSection.hidden = false;

    recommendedItems.forEach((item) => {
      recommendedGrid.appendChild(
        createCard(item, true)
      );
    });
  }

  visibleSections.forEach((section) => {
    const navLink = document.createElement("a");
    navLink.href = `#${section.id}`;
    navLink.textContent = section.title;
    categoryNav.appendChild(navLink);

    const sectionElement = document.createElement("section");
    sectionElement.id = section.id;
    sectionElement.className = "menu-section";

    sectionElement.innerHTML = `
      <div class="section-heading">
        <h2>${escapeHtml(section.title)}</h2>
        ${
          section.description
            ? `<p>${escapeHtml(section.description)}</p>`
            : ""
        }
      </div>

      <div class="menu-list"></div>
    `;

    const list = sectionElement.querySelector(".menu-list");

    section.items.forEach((item) => {
      list.appendChild(createCard(item));
    });

    menuRoot.appendChild(sectionElement);
  });

  if (visibleSections.length === 0 && errorBox) {
    errorBox.textContent = "The menu is currently being prepared.";
    errorBox.hidden = false;
  }
}

function fallbackMenu() {
  return Array.isArray(window.MENU_DATA)
    ? window.MENU_DATA
    : [];
}

onSnapshot(
  menuDocument,

  (snapshot) => {
    if (loading) {
      loading.hidden = true;
    }

    const data = snapshot.exists()
      ? snapshot.data()
      : null;

   const liveSections = Array.isArray(data?.sections)
  ? data.sections
  : [];

const hasValidItems = liveSections.some((section) =>
  Array.isArray(section.items) &&
  section.items.some((item) =>
    String(item.name || item.nameEn || item.title || "").trim() !== "" ||
    Number(item.price || item.priceYen || item.amount || 0) > 0
  )
);

const sections = hasValidItems
  ? liveSections
  : fallbackMenu();

render(sections);
  },

  (error) => {
    console.error("Firestore read failed:", error);

    if (loading) {
      loading.hidden = true;
    }

    if (errorBox) {
      errorBox.textContent =
        "The live menu could not be loaded. Showing the backup menu.";
      errorBox.hidden = false;
    }

    render(fallbackMenu());
  }
);
