# メルカリ商品詳細MDエクスポート

メルカリの商品詳細ページをMarkdown形式でエクスポートするFirefox拡張機能です。

## 機能

- メルカリ商品詳細ページから以下の情報を抽出してMarkdown形式で出力
  - 商品名
  - 価格・配送情報
  - カテゴリー
  - 商品説明
  - 出品者情報
  - コメント（日時を具体的な日本時間で表示）
- ファイルダウンロード形式でエクスポート

## インストール方法

### 開発版（手動インストール）

1. このリポジトリをクローンまたはダウンロード
```bash
git clone https://github.com/Rioto3/mercari-md-exporter.git
```

2. Firefoxで `about:debugging` を開く

3. 「このFirefox」→「一時的なアドオンを読み込む」をクリック

4. ダウンロードしたフォルダ内の `manifest.json` を選択

## 使用方法

1. メルカリの商品詳細ページ（`https://jp.mercari.com/item/*`）を開く

2. 拡張機能のアイコンをクリック

3. 「MDエクスポート」ボタンをクリック

4. Markdownファイルが自動でダウンロードされます

## 出力例

```markdown
# GBA ファイナルファンタジーⅣ FF4 動作確認済み

## 基本情報

- **価格**: ¥2,400 (税込・送料込み)
- **商品の状態**: 目立った傷や汚れなし
- **配送料の負担**: 送料込み(出品者負担)

## 商品の説明

ゲームボーイアドバンス用のFINAL FANTASY Ⅳ ADVANCEソフト。
...

## コメント

### yoo (2025/06/08 15:30)
コメント失礼します。
ソフトの右端に刻印があるかと思うのですがどう表記してありますか？
```

## 対応ページ

- メルカリ商品詳細ページ（`https://jp.mercari.com/item/*`）

## 技術仕様

- **対象ブラウザ**: Firefox（Manifest V3）
- **権限**: 
  - `activeTab` - アクティブなタブの情報取得
  - `downloads` - ファイルダウンロード
  - `https://jp.mercari.com/*` - メルカリサイトへのアクセス

## ファイル構成

```
mercari-md-exporter/
├── README.md
├── manifest.json      # 拡張機能設定
├── popup.html         # ポップアップUI
├── popup.js           # ポップアップ動作
├── content.js         # ページ情報抽出
└── background.js      # ファイルダウンロード処理
```

## 開発

### 前提条件

- Firefox (最新版推奨)
- Git

### セットアップ

1. リポジトリをクローン
2. Firefoxの開発者モードで拡張機能を読み込み
3. 開発・テストを実行

### 貢献

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/new-feature`)
3. 変更をコミット (`git commit -am 'Add new feature'`)
4. ブランチにプッシュ (`git push origin feature/new-feature`)
5. プルリクエストを作成

## ライセンス

MIT License

## 注意事項

- この拡張機能は個人利用を目的としています
- メルカリの利用規約を遵守してご利用ください
- 商用利用の場合は事前にメルカリの許可を得てください

## 作者

[Rioto3](https://github.com/Rioto3)
