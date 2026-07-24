BOYOROU メニュー管理 最終版

【現在のGitHubリポジトリ】
menu2

【公開URL】
https://h16925nknk-glitch.github.io/menu2/

【管理画面】
https://h16925nknk-glitch.github.io/menu2/admin.html

【入れ替え方】
1. ZIPを解凍
2. GitHubのmenu2を開く
3. Add file → Upload files
4. このフォルダ内のファイルを全部アップロード
5. 同名ファイルは上書きされる
6. Commit changes
7. 1～2分待って管理画面を再読み込み（キャッシュ対策：Ctrl+Shift+R / Command+Shift+R）

【ログイン】
メールアドレス：h16925nknk@icloud.com
パスワード：Firebaseでユーザー作成時に設定したもの

パスワードが分からない場合は管理画面の「パスワード再設定」を押してください。
この版はログイン失敗時にFirebaseの正確なエラーコードを画面に表示します。

【Firestoreルール】
Firebase → Firestore Database → ルール
firestore-rules.txtの内容を貼り付けて公開してください。

【Storageルール】
写真アップロードで権限エラーが出た場合のみ、
Firebase → Storage → ルール
storage-rules.txtの内容を貼り付けて公開してください。

【重要】
・GitHubにはZIPそのものではなく、解凍後のファイルをアップロードします。
・最初は写真なしでログインと更新を確認してください。
・ログインできない場合は管理画面の「診断情報」を開き、表示されたエラーコードを確認できます。
