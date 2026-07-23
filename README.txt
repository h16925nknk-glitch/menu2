BOYOROU メニュー管理 Ver.2

【できること】
・管理者ログイン
・写真を管理画面から直接アップロード
・更新ボタンでFirestoreへ即時反映
・カテゴリーと料理の並び替え
・おすすめ、季節限定、売り切れ、非表示
・公開ページのリアルタイム更新
・スマートフォン対応

【GitHubへアップロードするファイル】
index.html
public.js
style.css
admin.html
admin.js
admin.css
firebase.js
menu-data.js

firestore.rules と storage.rules はGitHub用ではなく、
Firebaseコンソールのルール画面へ貼り付けるためのファイルです。

【最重要：Firebaseのルール設定】

1. Firestore
Firebaseコンソール → Firestore → ルール
firestore.rules の内容をすべて貼り付けて「公開」

2. Storage
Firebaseコンソール → Storage → ルール
storage.rules の内容をすべて貼り付けて「公開」

【使用方法】
1. GitHubへ上記8ファイルをアップロード
2. admin.htmlを開く
3. 作成済みの管理者メール・パスワードでログイン
4. 編集する
5. 写真を選択する
6. 「更新する」を押す
7. index.htmlへ即時反映

【既存メニューについて】
Firestoreの restaurantMenus / bouyourou に sections がまだない場合、
menu-data.jsの内容を予備データとして表示します。

既存のmenu-data.jsを持っている場合、そのファイルを残しても使えます。
ただし最初に管理画面で「更新する」を押した後はFirestoreが正本になります。

【注意】
・写真はJPEG、PNG、WebP、8MB以下
・写真ファイルは更新時にFirebase Storageへアップロード
・Firebase APIキーはWebアプリでは公開前提の識別情報です
・実際の保護はAuthenticationとSecurity Rulesで行います
