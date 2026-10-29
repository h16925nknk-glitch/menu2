# 望洋楼メニュー 修正版の導入

## 重要
GitHub Pages は継続利用します。既存のQRコードやURLは変える必要がありません。既存の `menu-data.js` は初期表示・Firebase接続失敗時のバックアップとして残します。

## Firebaseコンソールで行う設定
1. Firebase プロジェクト `bouyourou-menu` を開く。
2. Authentication → Sign-in method → メール/パスワードを有効化。
3. Authentication → Users から管理者ユーザーを作成。
4. Firestore Database を作成（未作成の場合）。`firestore.rules` の `REPLACE_WITH_ADMIN_EMAIL` を管理者メールアドレスに置き換えて、Firestore → ルールへ貼り付けて公開。
5. Storage を有効化（プランや課金設定が必要になる場合あり）。`storage.rules` も同じメールアドレスに置き換えてStorage → ルールへ貼り付けて公開。
6. Firebase Authentication → Settings → Authorized domains にGitHub Pagesのホスト名（例: username.github.io）を追加。

## GitHubへ反映
修正版フォルダ内のファイルをリポジトリの既存ファイルと置き換え、commitします。`.git` フォルダを上書きする必要はありません。

## 操作
`admin.html` から管理者でログイン。料理・カテゴリーを追加/削除し、写真を選択してアップロード。「変更を更新」でFirestoreへ保存すると、公開 `index.html` は次の読み込み時に変更を表示します。

## 注意
- 写真はJPEG、PNG、WebP、8MB以下。HEICはJPEGへ変換してください。
- 写真のアップロード直後はまだ公開されません。「変更を更新」が必要です。
- 写真を料理から外してもStorage上の元ファイルは自動削除されません（誤削除防止）。不要な画像はFirebaseコンソールから整理してください。
- Firestore/Storageの設定が未完了の場合は画面にエラーを表示します。Firebaseの実環境での動作確認は未実施です。
- 初回公開時は既存 `menu-data.js` が表示され、最初の「変更を更新」でFirestoreにデータが作成されます。
