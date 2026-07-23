import { auth, menuDocument, storage } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

const editor = document.getElementById("editor");
const status = document.getElementById("status");
const sectionTemplate = document.getElementById("sectionTemplate");
const itemTemplate = document.getElementById("itemTemplate");
const publishButton = document.getElementById("publishButton");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const DRAFT_KEY = "boyorou-menu-v2-draft";

let publishedSections = [];
let currentUser = null;

const clone = (value) => JSON.parse(JSON.stringify(value));

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function uid() {
  return crypto.randomUUID();
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `category-${Date.now()}`;
}

function normalizeItem(item = {}) {
  if (Array.isArray(item)) {
    return {
      id: uid(),
      name: item[0] || "",
      meta: item[1] || "",
      price: Number(item[2]) || 0,
      imageUrl: "",
      storagePath: "",
      recommended: false,
      seasonal: false,
      soldOut: false,
      hidden: false
    };
  }
  return {
    id: item.id || uid(),
    name: item.name || "",
    meta: item.meta || "",
    price: Number(item.price) || 0,
    imageUrl: item.imageUrl || item.image || "",
    storagePath: item.storagePath || "",
    recommended: Boolean(item.recommended),
    seasonal: Boolean(item.seasonal),
    soldOut: Boolean(item.soldOut),
    hidden: Boolean(item.hidden)
  };
}

function normalizeSections(sections = []) {
  return sections.map((section, index) => ({
    id: section.id || `category-${index + 1}`,
    title: section.title || "New Category",
    description: section.description || "",
    items: (section.items || []).map(normalizeItem)
  }));
}

function moveNode(node, direction) {
  const sibling = direction < 0 ? node.previousElementSibling : node.nextElementSibling;
  if (!sibling) return;
  if (direction < 0) node.parentElement.insertBefore(node, sibling);
  else node.parentElement.insertBefore(sibling, node);
}

function sanitizeFilename(name) {
  const extension = name.includes(".") ? name.split(".").pop().toLowerCase() : "jpg";
  return `${Date.now()}-${uid()}.${extension.replace(/[^a-z0-9]/g, "")}`;
}

function updatePreview(itemNode, source = "") {
  const image = itemNode.querySelector(".preview-image");
  const empty = itemNode.querySelector(".no-image");
  if (!source) {
    image.hidden = true;
    image.removeAttribute("src");
    empty.hidden = false;
    return;
  }
  image.src = source;
  image.hidden = false;
  empty.hidden = true;
}

async function uploadSelectedImage(itemNode) {
  const fileInput = itemNode.querySelector(".item-file");
  const file = fileInput.files?.[0];
  if (!file) return null;

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("写真は8MB以下にしてください。");
  }

  const state = itemNode.querySelector(".upload-state");
  state.textContent = "アップロード中…";

  const path = `menu-images/${sanitizeFilename(file.name)}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const imageUrl = await getDownloadURL(storageRef);

  state.textContent = "アップロード完了";
  return { imageUrl, storagePath: path };
}

function buildItem(item = normalizeItem()) {
  const node = itemTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.itemId = item.id;
  node.dataset.imageUrl = item.imageUrl;
  node.dataset.storagePath = item.storagePath;
  node.dataset.removeExistingImage = "false";

  node.querySelector(".item-name").value = item.name;
  node.querySelector(".item-meta").value = item.meta;
  node.querySelector(".item-price").value = item.price || "";
  node.querySelector(".item-recommended").checked = item.recommended;
  node.querySelector(".item-seasonal").checked = item.seasonal;
  node.querySelector(".item-soldout").checked = item.soldOut;
  node.querySelector(".item-hidden").checked = item.hidden;
  updatePreview(node, item.imageUrl);

  node.querySelector(".item-up").addEventListener("click", () => moveNode(node, -1));
  node.querySelector(".item-down").addEventListener("click", () => moveNode(node, 1));

  node.querySelector(".item-file").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    node.dataset.removeExistingImage = "false";
    updatePreview(node, URL.createObjectURL(file));
    node.querySelector(".upload-state").textContent = "更新時にアップロード";
  });

  node.querySelector(".remove-image").addEventListener("click", () => {
    node.querySelector(".item-file").value = "";
    node.dataset.removeExistingImage = "true";
    updatePreview(node);
    node.querySelector(".upload-state").textContent = "更新時に削除";
  });

  node.querySelector(".delete-item").addEventListener("click", () => {
    if (!confirm("この料理を削除しますか？")) return;
    node.dataset.deleted = "true";
    node.hidden = true;
  });

  return node;
}

function buildSection(section) {
  const node = sectionTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.sectionId = section.id;

  const title = node.querySelector(".section-title");
  const id = node.querySelector(".section-id");
  const items = node.querySelector(".items");

  title.value = section.title;
  id.value = section.id;
  node.querySelector(".section-description").value = section.description;
  section.items.forEach((item) => items.appendChild(buildItem(item)));

  title.addEventListener("blur", () => {
    if (!id.value.trim()) id.value = slugify(title.value);
  });

  node.querySelector(".section-up").addEventListener("click", () => moveNode(node, -1));
  node.querySelector(".section-down").addEventListener("click", () => moveNode(node, 1));
  node.querySelector(".add-item").addEventListener("click", () => items.appendChild(buildItem()));
  node.querySelector(".delete-section").addEventListener("click", () => {
    if (!confirm("このカテゴリーを削除しますか？")) return;
    node.dataset.deleted = "true";
    node.hidden = true;
  });

  return node;
}

function render(sections) {
  editor.innerHTML = "";
  normalizeSections(sections).forEach((section) => editor.appendChild(buildSection(section)));
}

function collectRawSections() {
  return [...editor.querySelectorAll(".section-card")]
    .filter((section) => section.dataset.deleted !== "true")
    .map((section, sectionIndex) => ({
      id: section.querySelector(".section-id").value.trim() || `category-${sectionIndex + 1}`,
      title: section.querySelector(".section-title").value.trim() || "New Category",
      description: section.querySelector(".section-description").value.trim(),
      itemNodes: [...section.querySelectorAll(".item-editor")]
        .filter((item) => item.dataset.deleted !== "true")
    }));
}

async function collectAndUpload() {
  const rawSections = collectRawSections();
  const output = [];

  for (const section of rawSections) {
    const items = [];

    for (const node of section.itemNodes) {
      let imageUrl = node.dataset.imageUrl || "";
      let storagePath = node.dataset.storagePath || "";
      const oldStoragePath = storagePath;

      if (node.dataset.removeExistingImage === "true") {
        imageUrl = "";
        storagePath = "";
        if (oldStoragePath) {
          deleteObject(ref(storage, oldStoragePath)).catch(() => {});
        }
      }

      const uploaded = await uploadSelectedImage(node);
      if (uploaded) {
        if (oldStoragePath && oldStoragePath !== uploaded.storagePath) {
          deleteObject(ref(storage, oldStoragePath)).catch(() => {});
        }
        imageUrl = uploaded.imageUrl;
        storagePath = uploaded.storagePath;
      }

      items.push({
        id: node.dataset.itemId || uid(),
        name: node.querySelector(".item-name").value.trim() || "Unnamed Item",
        meta: node.querySelector(".item-meta").value.trim(),
        price: Number(node.querySelector(".item-price").value) || 0,
        imageUrl,
        storagePath,
        recommended: node.querySelector(".item-recommended").checked,
        seasonal: node.querySelector(".item-seasonal").checked,
        soldOut: node.querySelector(".item-soldout").checked,
        hidden: node.querySelector(".item-hidden").checked
      });
    }

    output.push({
      id: section.id,
      title: section.title,
      description: section.description,
      items
    });
  }

  return output;
}

function fallbackData() {
  return Array.isArray(window.MENU_DATA) ? window.MENU_DATA : [];
}

async function loadPublished() {
  setStatus("公開中のメニューを読み込んでいます…");
  try {
    const snapshot = await getDoc(menuDocument);
    const sections = snapshot.exists() && Array.isArray(snapshot.data()?.sections)
      ? snapshot.data().sections
      : fallbackData();
    publishedSections = normalizeSections(sections);
    render(publishedSections);
    setStatus("読み込みました。");
  } catch (error) {
    console.error(error);
    publishedSections = normalizeSections(fallbackData());
    render(publishedSections);
    setStatus("Firebaseから読み込めなかったため、予備データを表示しています。", true);
  }
}

async function publish() {
  if (!currentUser) {
    setStatus("先にログインしてください。", true);
    return;
  }

  publishButton.disabled = true;
  publishButton.textContent = "更新中…";
  setStatus("写真とメニューを更新しています…");

  try {
    const sections = await collectAndUpload();
    await setDoc(menuDocument, {
      sections,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.email || ""
    }, { merge: true });

    publishedSections = normalizeSections(sections);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(sections));
    render(publishedSections);
    setStatus("更新完了。公開メニューへ反映されました。");
  } catch (error) {
    console.error(error);
    setStatus(`更新に失敗しました：${error.message || "Firebase設定を確認してください。"}`, true);
  } finally {
    publishButton.disabled = !currentUser;
    publishButton.textContent = "更新する";
  }
}

loginButton.addEventListener("click", async () => {
  loginButton.disabled = true;
  setStatus("ログイン中…");
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    passwordInput.value = "";
    setStatus("ログインしました。");
  } catch (error) {
    console.error(error);
    setStatus("ログインできません。メールアドレスとパスワードを確認してください。", true);
  } finally {
    loginButton.disabled = false;
  }
});

logoutButton.addEventListener("click", () => signOut(auth));

document.getElementById("addSectionButton").addEventListener("click", () => {
  editor.appendChild(buildSection({
    id: "",
    title: "",
    description: "",
    items: []
  }));
});

document.getElementById("saveDraftButton").addEventListener("click", () => {
  const sections = collectRawSections().map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    items: section.itemNodes.map((node) => ({
      id: node.dataset.itemId || uid(),
      name: node.querySelector(".item-name").value.trim(),
      meta: node.querySelector(".item-meta").value.trim(),
      price: Number(node.querySelector(".item-price").value) || 0,
      imageUrl: node.dataset.imageUrl || "",
      storagePath: node.dataset.storagePath || "",
      recommended: node.querySelector(".item-recommended").checked,
      seasonal: node.querySelector(".item-seasonal").checked,
      soldOut: node.querySelector(".item-soldout").checked,
      hidden: node.querySelector(".item-hidden").checked
    }))
  }));
  localStorage.setItem(DRAFT_KEY, JSON.stringify(sections));
  setStatus("このブラウザに下書きを保存しました。写真の未アップロードファイルは保存されません。");
});

document.getElementById("loadDraftButton").addEventListener("click", () => {
  const draft = localStorage.getItem(DRAFT_KEY);
  if (!draft) {
    setStatus("保存された下書きがありません。", true);
    return;
  }
  try {
    render(JSON.parse(draft));
    setStatus("下書きを読み込みました。");
  } catch {
    setStatus("下書きの読み込みに失敗しました。", true);
  }
});

document.getElementById("resetButton").addEventListener("click", () => {
  if (!confirm("編集中の内容を破棄して公開中の状態に戻しますか？")) return;
  render(clone(publishedSections));
  setStatus("公開中の状態に戻しました。");
});

publishButton.addEventListener("click", publish);

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  publishButton.disabled = !user;
  logoutButton.hidden = !user;
  loginButton.hidden = Boolean(user);
  emailInput.disabled = Boolean(user);
  passwordInput.disabled = Boolean(user);

  if (user) {
    emailInput.value = user.email || "";
    setStatus("ログイン済みです。");
  } else {
    setStatus("更新するには管理者ログインが必要です。");
  }
});

loadPublished();
