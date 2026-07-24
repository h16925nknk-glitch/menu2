import { auth, authReady, firebaseConfig, menuDocument, storage } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

const $ = (id) => document.getElementById(id);
const editor = $("editor");
const status = $("status");
const diagnosticsText = $("diagnosticsText");
const publishButton = $("publishButton");
const emailInput = $("email");
const passwordInput = $("password");
const DRAFT_KEY = "boyorou-menu-final-draft";
let currentUser = null;
let publishedSections = [];

function diagnostics(extra = {}) {
  diagnosticsText.textContent = JSON.stringify({
    page: location.href,
    hostname: location.hostname,
    online: navigator.onLine,
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    signedIn: Boolean(auth.currentUser),
    signedInEmail: auth.currentUser?.email || null,
    ...extra
  }, null, 2);
}

diagnostics();
window.addEventListener("online", () => diagnostics());
window.addEventListener("offline", () => diagnostics());

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function readableAuthError(error) {
  const code = error?.code || "unknown";
  const messages = {
    "auth/invalid-credential": "メールアドレスまたはパスワードが違います。パスワード再設定をお試しください。",
    "auth/user-disabled": "このユーザーは無効化されています。",
    "auth/too-many-requests": "試行回数が多いため、一時的に制限されています。少し待ってください。",
    "auth/network-request-failed": "通信に失敗しました。インターネット接続を確認してください。",
    "auth/invalid-email": "メールアドレスの形式が正しくありません。",
    "auth/operation-not-allowed": "Firebaseでメール/パスワードログインが有効になっていません。",
    "auth/unauthorized-domain": `Firebase Authenticationの承認済みドメインに「${location.hostname}」を追加してください。`,
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Firebase APIキーが無効です。firebase.jsを確認してください。"
  };
  return `${messages[code] || error?.message || "ログインに失敗しました。"}\nエラーコード: ${code}`;
}

const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = () => crypto.randomUUID();
const slugify = (text) => String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `category-${Date.now()}`;

function normalizeItem(item = {}) {
  if (Array.isArray(item)) return { id: uid(), name: item[0] || "", meta: item[1] || "", price: Number(item[2]) || 0, imageUrl: "", storagePath: "", recommended: false, seasonal: false, soldOut: false, hidden: false };
  return { id: item.id || uid(), name: item.name || "", meta: item.meta || "", price: Number(item.price) || 0, imageUrl: item.imageUrl || item.image || "", storagePath: item.storagePath || "", recommended: Boolean(item.recommended), seasonal: Boolean(item.seasonal), soldOut: Boolean(item.soldOut), hidden: Boolean(item.hidden) };
}
function normalizeSections(sections = []) {
  return sections.map((section, index) => ({ id: section.id || `category-${index + 1}`, title: section.title || "New Category", description: section.description || "", items: (section.items || []).map(normalizeItem) }));
}
function fallbackData() { return Array.isArray(window.MENU_DATA) ? window.MENU_DATA : []; }
function moveNode(node, direction) {
  const sibling = direction < 0 ? node.previousElementSibling : node.nextElementSibling;
  if (!sibling) return;
  if (direction < 0) node.parentElement.insertBefore(node, sibling); else node.parentElement.insertBefore(sibling, node);
}
function updatePreview(node, source = "") {
  const image = node.querySelector(".preview-image");
  const empty = node.querySelector(".no-image");
  image.hidden = !source;
  empty.hidden = Boolean(source);
  if (source) image.src = source; else image.removeAttribute("src");
}
function sanitizeFilename(name) {
  const ext = (name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${Date.now()}-${uid()}.${ext}`;
}

function buildItem(item = normalizeItem()) {
  const node = $("itemTemplate").content.firstElementChild.cloneNode(true);
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

  node.querySelector(".item-up").onclick = () => moveNode(node, -1);
  node.querySelector(".item-down").onclick = () => moveNode(node, 1);
  node.querySelector(".item-file").onchange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    node.dataset.removeExistingImage = "false";
    updatePreview(node, URL.createObjectURL(file));
    node.querySelector(".upload-state").textContent = "更新時にアップロード";
  };
  node.querySelector(".remove-image").onclick = () => {
    node.querySelector(".item-file").value = "";
    node.dataset.removeExistingImage = "true";
    updatePreview(node);
    node.querySelector(".upload-state").textContent = "更新時に削除";
  };
  node.querySelector(".delete-item").onclick = () => { if (confirm("この料理を削除しますか？")) { node.dataset.deleted = "true"; node.hidden = true; } };
  return node;
}

function buildSection(section) {
  const node = $("sectionTemplate").content.firstElementChild.cloneNode(true);
  const title = node.querySelector(".section-title");
  const id = node.querySelector(".section-id");
  const items = node.querySelector(".items");
  title.value = section.title;
  id.value = section.id;
  node.querySelector(".section-description").value = section.description;
  section.items.forEach((item) => items.appendChild(buildItem(item)));
  title.onblur = () => { if (!id.value.trim()) id.value = slugify(title.value); };
  node.querySelector(".section-up").onclick = () => moveNode(node, -1);
  node.querySelector(".section-down").onclick = () => moveNode(node, 1);
  node.querySelector(".add-item").onclick = () => items.appendChild(buildItem());
  node.querySelector(".delete-section").onclick = () => { if (confirm("このカテゴリーを削除しますか？")) { node.dataset.deleted = "true"; node.hidden = true; } };
  return node;
}

function render(sections) {
  editor.innerHTML = "";
  normalizeSections(sections).forEach((section) => editor.appendChild(buildSection(section)));
}

function collectRawSections() {
  return [...editor.querySelectorAll(".section-card")].filter((s) => s.dataset.deleted !== "true").map((section, i) => ({
    id: section.querySelector(".section-id").value.trim() || `category-${i + 1}`,
    title: section.querySelector(".section-title").value.trim() || "New Category",
    description: section.querySelector(".section-description").value.trim(),
    itemNodes: [...section.querySelectorAll(".item-editor")].filter((item) => item.dataset.deleted !== "true")
  }));
}

async function uploadImage(node) {
  const file = node.querySelector(".item-file").files?.[0];
  if (!file) return null;
  if (file.size > 8 * 1024 * 1024) throw new Error("写真は8MB以下にしてください。");
  const state = node.querySelector(".upload-state");
  state.textContent = "アップロード中…";
  const path = `menu-images/${sanitizeFilename(file.name)}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const imageUrl = await getDownloadURL(storageRef);
  state.textContent = "アップロード完了";
  return { imageUrl, storagePath: path };
}

async function collectAndUpload() {
  const output = [];
  for (const section of collectRawSections()) {
    const items = [];
    for (const node of section.itemNodes) {
      let imageUrl = node.dataset.imageUrl || "";
      let storagePath = node.dataset.storagePath || "";
      const oldPath = storagePath;
      if (node.dataset.removeExistingImage === "true") {
        imageUrl = ""; storagePath = "";
        if (oldPath) deleteObject(ref(storage, oldPath)).catch(() => {});
      }
      const uploaded = await uploadImage(node);
      if (uploaded) {
        if (oldPath && oldPath !== uploaded.storagePath) deleteObject(ref(storage, oldPath)).catch(() => {});
        imageUrl = uploaded.imageUrl; storagePath = uploaded.storagePath;
      }
      items.push({ id: node.dataset.itemId || uid(), name: node.querySelector(".item-name").value.trim() || "Unnamed Item", meta: node.querySelector(".item-meta").value.trim(), price: Number(node.querySelector(".item-price").value) || 0, imageUrl, storagePath, recommended: node.querySelector(".item-recommended").checked, seasonal: node.querySelector(".item-seasonal").checked, soldOut: node.querySelector(".item-soldout").checked, hidden: node.querySelector(".item-hidden").checked });
    }
    output.push({ id: section.id, title: section.title, description: section.description, items });
  }
  return output;
}

async function loadPublished() {
  setStatus("公開中のメニューを読み込んでいます…");
  try {
    const snap = await getDoc(menuDocument);
    publishedSections = normalizeSections(snap.exists() && Array.isArray(snap.data()?.sections) ? snap.data().sections : fallbackData());
    render(publishedSections);
    setStatus("読み込みました。");
  } catch (error) {
    console.error(error);
    diagnostics({ firestoreReadError: { code: error.code, message: error.message } });
    publishedSections = normalizeSections(fallbackData());
    render(publishedSections);
    setStatus(`Firestoreを読み込めませんでした：${error.code || error.message}`, true);
  }
}

async function login() {
  $("loginButton").disabled = true;
  setStatus("ログイン中…");
  try {
    await authReady;
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    passwordInput.value = "";
    setStatus("ログインしました。");
  } catch (error) {
    console.error("Login failed", error);
    diagnostics({ loginError: { code: error.code, message: error.message } });
    setStatus(readableAuthError(error), true);
  } finally {
    $("loginButton").disabled = false;
  }
}

$("loginButton").onclick = login;
passwordInput.addEventListener("keydown", (event) => event.key === "Enter" && login());
$("resetPasswordButton").onclick = async () => {
  const email = emailInput.value.trim();
  if (!email) return setStatus("メールアドレスを入力してください。", true);
  try {
    await sendPasswordResetEmail(auth, email);
    setStatus("パスワード再設定メールを送りました。受信箱と迷惑メールを確認してください。");
  } catch (error) {
    console.error(error);
    diagnostics({ resetError: { code: error.code, message: error.message } });
    setStatus(readableAuthError(error), true);
  }
};
$("logoutButton").onclick = () => signOut(auth);

$("addSectionButton").onclick = () => editor.appendChild(buildSection({ id: "", title: "", description: "", items: [] }));
$("saveDraftButton").onclick = () => {
  const sections = collectRawSections().map((section) => ({ id: section.id, title: section.title, description: section.description, items: section.itemNodes.map((node) => ({ id: node.dataset.itemId || uid(), name: node.querySelector(".item-name").value.trim(), meta: node.querySelector(".item-meta").value.trim(), price: Number(node.querySelector(".item-price").value) || 0, imageUrl: node.dataset.imageUrl || "", storagePath: node.dataset.storagePath || "", recommended: node.querySelector(".item-recommended").checked, seasonal: node.querySelector(".item-seasonal").checked, soldOut: node.querySelector(".item-soldout").checked, hidden: node.querySelector(".item-hidden").checked })) }));
  localStorage.setItem(DRAFT_KEY, JSON.stringify(sections));
  setStatus("下書きを保存しました。未アップロードの写真ファイルは保存されません。");
};
$("loadDraftButton").onclick = () => {
  try { const draft = localStorage.getItem(DRAFT_KEY); if (!draft) throw new Error("下書きがありません。"); render(JSON.parse(draft)); setStatus("下書きを読み込みました。"); }
  catch (error) { setStatus(error.message, true); }
};
$("resetButton").onclick = () => { if (confirm("編集中の内容を破棄しますか？")) { render(clone(publishedSections)); setStatus("公開中の状態に戻しました。"); } };
$("publishButton").onclick = async () => {
  if (!currentUser) return setStatus("先にログインしてください。", true);
  publishButton.disabled = true; publishButton.textContent = "更新中…";
  try {
    const sections = await collectAndUpload();
    await setDoc(menuDocument, { sections, updatedAt: serverTimestamp(), updatedBy: currentUser.email || "" }, { merge: true });
    publishedSections = normalizeSections(sections);
    render(publishedSections);
    setStatus("更新完了。公開メニューに反映されました。");
  } catch (error) {
    console.error(error);
    diagnostics({ publishError: { code: error.code, message: error.message } });
    setStatus(`更新に失敗しました：${error.code || error.message}`, true);
  } finally {
    publishButton.disabled = !currentUser; publishButton.textContent = "更新する";
  }
};

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  publishButton.disabled = !user;
  $("logoutButton").hidden = !user;
  $("loginButton").hidden = Boolean(user);
  $("resetPasswordButton").hidden = Boolean(user);
  emailInput.disabled = Boolean(user);
  passwordInput.disabled = Boolean(user);
  if (user) { emailInput.value = user.email || ""; setStatus("ログイン済みです。"); }
  else setStatus("更新するにはログインしてください。");
  diagnostics();
});

loadPublished();
