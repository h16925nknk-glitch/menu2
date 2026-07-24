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

const yen = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function normalizeItem(item = {}) {
  if (Array.isArray(item)) {
    return {
      id: crypto.randomUUID(), name: item[0] || "", meta: item[1] || "",
      price: Number(item[2]) || 0, imageUrl: "", recommended: false,
      seasonal: false, soldOut: false, hidden: false
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

$("modalClose").addEventListener("click", closeModal);
imageModal.addEventListener("click", (event) => event.target === imageModal && closeModal());
document.addEventListener("keydown", (event) => event.key === "Escape" && closeModal());

function createCard(item, compact = false) {
  const card = document.createElement("article");
  card.className = [
  compact ? "recommended-card" : "menu-item",
  item.imageUrl ? "has-image" : "no-image",
  item.soldOut ? "is-sold-out" : ""
].filter(Boolean).join(" ");

  card.innerHTML = `
    ${item.imageUrl ? `<button class="image-button" type="button"><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy"></button>` : ""}
    <div class="item-body">
      <div class="title-row"><h3>${escapeHtml(item.name)}</h3><div class="badges">${badges}</div></div>
      ${item.meta ? `<p class="item-meta">${escapeHtml(item.meta)}</p>` : ""}
      <div class="item-bottom">${item.soldOut ? '<span class="sold-out-label">SOLD OUT</span>' : "<span></span>"}<strong>${yen.format(item.price)}</strong></div>
    </div>`;

  card.querySelector(".image-button")?.addEventListener("click", () => openModal(item.imageUrl, item.name));
  return card;
}

function render(sections) {
  menuRoot.innerHTML = "";
  categoryNav.innerHTML = "";
  recommendedGrid.innerHTML = "";
  recommendedSection.hidden = true;

  const visible = normalizeSections(sections)
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.hidden) }))
    .filter((section) => section.items.length);

  const recommended = visible.flatMap((section) => section.items.filter((item) => item.recommended));
  if (recommended.length) {
    recommendedSection.hidden = false;
    recommended.forEach((item) => recommendedGrid.appendChild(createCard(item, true)));
  }

  visible.forEach((section) => {
    const nav = document.createElement("a");
    nav.href = `#${section.id}`;
    nav.textContent = section.title;
    categoryNav.appendChild(nav);

    const el = document.createElement("section");
    el.id = section.id;
    el.className = "menu-section";
    el.innerHTML = `<div class="section-heading"><h2>${escapeHtml(section.title)}</h2>${section.description ? `<p>${escapeHtml(section.description)}</p>` : ""}</div><div class="menu-list"></div>`;
    const list = el.querySelector(".menu-list");
    section.items.forEach((item) => list.appendChild(createCard(item)));
    menuRoot.appendChild(el);
  });

  if (!visible.length) {
    errorBox.textContent = "The menu is currently being prepared.";
    errorBox.hidden = false;
  }
}

const fallback = () => Array.isArray(window.MENU_DATA) ? window.MENU_DATA : [];

onSnapshot(menuDocument, (snapshot) => {
  loading.hidden = true;
  const data = snapshot.exists() ? snapshot.data() : null;
  render(Array.isArray(data?.sections) ? data.sections : fallback());
}, (error) => {
  console.error("Firestore read failed", error);
  loading.hidden = true;
  errorBox.textContent = "The live menu could not be loaded. Showing the backup menu.";
  errorBox.hidden = false;
  render(fallback());
});
