import { menuDocument } from "./firebase.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const loading = document.getElementById("loading");
const errorBox = document.getElementById("errorBox");
const menuRoot = document.getElementById("menuRoot");
const categoryNav = document.getElementById("categoryNav");
const recommendedSection = document.getElementById("recommendedSection");
const recommendedGrid = document.getElementById("recommendedGrid");
const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalClose = document.getElementById("modalClose");

const yen = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function normalizeItem(item = {}) {
  if (Array.isArray(item)) {
    return {
      id: crypto.randomUUID(),
      name: item[0] || "",
      meta: item[1] || "",
      price: Number(item[2]) || 0,
      imageUrl: "",
      recommended: false,
      seasonal: false,
      soldOut: false,
      hidden: false
    };
  }

  return {
    id: item.id || crypto.randomUUID(),
    name: item.name || "",
    meta: item.meta || "",
    price: Number(item.price) || 0,
    imageUrl: item.imageUrl || item.image || "",
    recommended: Boolean(item.recommended),
    seasonal: Boolean(item.seasonal),
    soldOut: Boolean(item.soldOut),
    hidden: Boolean(item.hidden)
  };
}

function normalizeSections(sections = []) {
  return sections.map((section, index) => ({
    id: section.id || `section-${index + 1}`,
    title: section.title || "Menu",
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

modalClose.addEventListener("click", closeModal);
imageModal.addEventListener("click", (event) => {
  if (event.target === imageModal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

function createCard(item, compact = false) {
  const article = document.createElement("article");
  article.className = [
    compact ? "recommended-card" : "menu-item",
    item.imageUrl ? "has-image" : "",
    item.soldOut ? "is-sold-out" : ""
  ].filter(Boolean).join(" ");

  const badges = [
    item.recommended ? '<span class="badge recommended-badge">Recommended</span>' : "",
    item.seasonal ? '<span class="badge seasonal-badge">Seasonal</span>' : ""
  ].join("");

  article.innerHTML = `
    ${item.imageUrl ? `
      <button class="image-button" type="button" aria-label="Enlarge ${escapeHtml(item.name)}">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy">
      </button>
    ` : ""}
    <div class="item-body">
      <div class="title-row">
        <h3>${escapeHtml(item.name)}</h3>
        <div class="badges">${badges}</div>
      </div>
      ${item.meta ? `<p class="item-meta">${escapeHtml(item.meta)}</p>` : ""}
      <div class="item-bottom">
        ${item.soldOut ? '<span class="sold-out-label">SOLD OUT</span>' : "<span></span>"}
        <strong>${yen.format(item.price)}</strong>
      </div>
    </div>
  `;

  const button = article.querySelector(".image-button");
  if (button) button.addEventListener("click", () => openModal(item.imageUrl, item.name));
  return article;
}

function render(sections) {
  menuRoot.innerHTML = "";
  categoryNav.innerHTML = "";
  recommendedGrid.innerHTML = "";
  recommendedSection.hidden = true;
  errorBox.hidden = true;

  const visibleSections = normalizeSections(sections)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.hidden)
    }))
    .filter((section) => section.items.length > 0);

  const recommendations = visibleSections.flatMap((section) =>
    section.items.filter((item) => item.recommended)
  );

  if (recommendations.length) {
    recommendedSection.hidden = false;
    recommendations.forEach((item) => recommendedGrid.appendChild(createCard(item, true)));
  }

  visibleSections.forEach((section) => {
    const link = document.createElement("a");
    link.href = `#${section.id}`;
    link.textContent = section.title;
    categoryNav.appendChild(link);

    const sectionElement = document.createElement("section");
    sectionElement.className = "menu-section";
    sectionElement.id = section.id;
    sectionElement.innerHTML = `
      <div class="section-heading">
        <h2>${escapeHtml(section.title)}</h2>
        ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ""}
      </div>
      <div class="menu-list"></div>
    `;

    const list = sectionElement.querySelector(".menu-list");
    section.items.forEach((item) => list.appendChild(createCard(item)));
    menuRoot.appendChild(sectionElement);
  });

  if (!visibleSections.length) {
    errorBox.textContent = "The menu is currently being prepared.";
    errorBox.hidden = false;
  }
}

function fallbackData() {
  return Array.isArray(window.MENU_DATA) ? window.MENU_DATA : [];
}

onSnapshot(
  menuDocument,
  (snapshot) => {
    loading.hidden = true;
    const data = snapshot.exists() ? snapshot.data() : null;
    render(Array.isArray(data?.sections) ? data.sections : fallbackData());
  },
  (error) => {
    console.error(error);
    loading.hidden = true;
    errorBox.textContent = "Firebase could not be reached. Showing the backup menu.";
    errorBox.hidden = false;
    render(fallbackData());
  }
);
