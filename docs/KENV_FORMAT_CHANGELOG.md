# KENV Format Changelog

## v3.1.3 (2025-01-28)

### 重大な変更
- **専用拠張子の採用**
  - `.kenv-index` → `.kindex`
  - `.kenv-entries.csv` → `.kentry`
  - `.kenv` → `.kenv`（変更なし）

### 新機能
- **.kindex完全再設計**
  - UIカラムベースのインデックス構造
  - ソート、検索、フィルタの高速化
  - 10万エントリーで約3MBに最適化

### 設定追加
- `settings.ui.defaultSort` - デフォルトソート順
- `settings.ui.itemsPerPage` - ページングサイズ
- `settings.storage.indexUpdateInterval` - インデックス更新間隔
- `settings.technical.*` - マジックナンバーの外部化

### .kindex最適化詳細
1. **sortIndexes** - 各カラムのソート済みインデックス
2. **searchIndexes** - プレフィックス検索用（3-8文字）
3. **filterIndexes** - 高速フィルタリング用
4. **stats** - UI表示用統計情報
5. **pageHints** - ページング最適化情報

### 性能改善
- メモリ使用量: 10万件で約3MB（v3.1.2では推定20MB+）
- 検索速度: O(n) → O(log n)
- ソート速度: O(n log n) → O(1)

---

## v3.1.2 (2025-01-28)

### 変更点
- **MetaTxIDオプション化**
  - オンチェーンモード（MetaTxID必須）
  - .kaspaファイルのみモード（MetaTxID不要）
- **不要カラム削除**（49→45カラム）
  - hasPassword（passwordIncludedと重複）
  - downloadable（statusから判断）
  - isTemporary（使用場面なし）
  - addedDate（uploadDateで代用）
- **最小必須項目を5つに削減**
  - id, type, name, source, status

---

## v3.1.1 (2025-01-28)

### 変更点
- **.kaspaフォーマットv3.4.2との完全互換**
- **CSVストリーミング設計**
- **セグメントバウンダリーのインライン格納**
- **大容量ファイル対応**（10,000チャンク超は外部参照）

---

## v3.1.0 (2025-01-28)

### 初版機能
- **CSV形式の採用**
- **インライン格納と外部参照のハイブリッド**
- **高速インデックス（.kenv-index）**
- **暗号化対応**

---

## 今後の予定

### v3.2.0（検討中）
- Bloom Filterによる存在確認高速化
- 圧縮インデックスオプション
- 分散インデックス対応