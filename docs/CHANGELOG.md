# Consolidated Changelog
# v6.2.39: チャンクなし.kaspaファイル生成防止

## 実装内容
- チャンクデータがない場合、.kaspaファイル生成ボタンを無効化
- シェアメニュー表示時に動的にボタン状態を制御
- エラーメッセージを追加して理由を明確化

## 変更箇所

### 1. toggleShareMenu関数（lines 18780-18816）
- シェアメニュー表示時にKENVエントリーのチャンクを確認
- チャンクがない場合：.kaspaボタンを無効化（グレーアウト）
- ディレクトリの場合：常に有効（ディレクトリは特殊処理）
- ツールチップで理由を表示

### 2. generateKaspaFile関数（lines 5719-5723）
- チャンクチェックを追加
- チャンクがない場合はエラーメッセージを表示
- "Use TxID sharing instead"を提案

## 技術詳細

```javascript
// チャンク判定ロジック
const hasChunks = kenvEntry._chunks && kenvEntry._chunks.length > 0;

// ボタン制御
btn.disabled = !hasChunks;
btn.style.opacity = hasChunks ? '1' : '0.5';
btn.style.cursor = hasChunks ? 'pointer' : 'not-allowed';
```

## 影響するユースケース

| ケース | 動作 |
|-------|------|
| 自分がアップロード | ✅ .kaspa生成可能（チャンクあり） |
| MetaTxID共有のみ | ❌ .kaspa生成不可（チャンクなし） |
| .kaspaファイル読み込み | ✅ .kaspa生成可能（チャンクあり） |
| ディレクトリ | ✅ 常に生成可能（特殊処理） |

## 解決される問題
- チャンクなし.kaspaファイルでダウンロードエラーが発生する問題
- ユーザーが無効な.kaspaファイルを生成してしまう問題# v6.2.40: KENV Export/Import機能（.kentry生データ形式）

## 実装内容
- LocalStorageのKENVデータを**CSV形式（.kentry）**でエクスポート/インポート
- 作業フォルダの.kentryファイルと**完全互換**
- FileタブにExport/Importボタンを追加（Add Fileボタンの右隣）

## 変更箇所

### 1. UIボタン追加（lines 1837-1843）
- Add Fileボタンの右にExport/Importボタンを配置
- CSVと.kentryファイルを受け付ける

### 2. エクスポート機能（lines 18117-18258）
- LocalStorageのJSONデータを → **CSV形式に変換**
- 47固定カラム + 可変カラム（チャンク、セグメント、ディレクトリ）
- ファイル名：`workspace-kentry-TIMESTAMP.csv`
- 既存の`saveKentryFile()`と同じロジックを使用

### 3. インポート機能（lines 18261-18463）
- CSVファイル（.kentry形式）を読み込み
- 既存の`parseCSVLine()`でパース
- JSONに変換してLocalStorageに保存
- 重複チェック（metaTxId、CID+名前、firstChunkTxId）

## データフロー

```
作業フォルダあり:
  workspace.kentry (CSV) ← File System → workspace.kentry (CSV)

LocalStorageのみ:
  kenv_temp_data (JSON) → Export → workspace.kentry (CSV)
                        ← Import ← workspace.kentry (CSV)
```

## メリット

| 項目 | 説明 |
|------|------|
| **完全互換** | 作業フォルダの.kentryファイルをそのまま使える |
| **透明性** | CSVなのでExcel等で開いて確認可能 |
| **パフォーマンス** | LocalStorage内部はJSON（高速）のまま |
| **再利用** | 既存のCSV処理コードを活用 |

## CSV形式の構造

### 固定カラム（47列）
```
id,type,version,created,network,name,path,metaTxId,metaTxBlockId,
firstChunkTxId,uploadDate,blockTime,uploadedBy,source,status,fileSize,
originalSize,compressedSize,mimeType,sha256,encrypted,compressionAlgorithm,
compressionEnabled,variableChunk,payloadSplit,cid,totalChunks,chunkCount,
chunkSize,segmentCount,totalFiles,fileCount,directoryCount,entryCount,
checksum,uploadCost,uploadDuration,chunkStructureType,chunkLevel,
totalGroups,passwordIncluded,password,externalRef,tags,notes,authWarning,salt
```

### 可変カラム
- チャンクペア：`tx1,blk1,tx2,blk2,...`
- セグメント：`seg,index,offset,size,originalSize,compressedSize,payloadIndex`
- ディレクトリ：`entries,fileCount,dirCount,type,name,path,size,metaTxId,blockId,password`# v6.2.41: Exportファイル名形式の変更

## 変更内容
- Exportで出力されるファイル名を変更
- 拡張子を`.csv`から`.kentry`に変更（作業フォルダと同じ）

## ファイル名形式

### 変更前：
```
workspace-kentry-2025-08-21T12-34-56.csv
```

### 変更後：
```
20250821123456-workspace.kentry
```

## 形式の詳細

| 要素 | 説明 | 例 |
|------|------|-----|
| YYYY | 年（4桁） | 2025 |
| MM | 月（2桁） | 08 |
| DD | 日（2桁） | 21 |
| HH | 時（2桁） | 12 |
| mm | 分（2桁） | 34 |
| SS | 秒（2桁） | 56 |
| 拡張子 | .kentry | 作業フォルダと統一 |

## メリット

1. **ファイル名がコンパクト**
   - ハイフンやコロンなし
   - ソート時に日付順になる

2. **作業フォルダとの一貫性**
   - 拡張子が`.kentry`で統一
   - そのまま作業フォルダにコピー可能

3. **ファイル管理が簡単**
   - YYYYMMDDHHmmSS形式で一目で時刻が分かる
   - workspace.kentryにリネームするだけで使用可能

## 実装箇所
- lines 18238-18247: タイムスタンプ生成とファイル名作成# v6.2.42: .kentry拡張子を強制（.csv自動追加を防止）

## 問題
- ブラウザが`type: 'text/csv'`を検出して自動で`.csv`を追加
- 結果：`20250821123456-workspace.kentry.csv`になってしまう

## 解決策
- Blobのtypeを`application/octet-stream`に変更
- ブラウザが拡張子を自動判定しなくなる

## 変更箇所

### 変更前（line 18250）：
```javascript
const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
```

### 変更後：
```javascript
const blob = new Blob([csvContent], { type: 'application/octet-stream' });
```

## 技術的説明

| MIMEタイプ | 動作 | 結果 |
|-----------|------|------|
| text/csv | ブラウザが.csvを自動追加 | ❌ file.kentry.csv |
| application/octet-stream | バイナリファイルとして扱う | ✅ file.kentry |

## メリット
- .kentry拡張子が確実に適用される
- 作業フォルダとの一貫性が保たれる
- ファイル名のリネーム不要# v6.2.43: コンテンツ幅制限を削除（フル幅対応）

## 問題
- ズームアウト時にコンテンツが左に寄ってしまう
- 最大幅1200pxに制限されていた

## 解決策
- `.main-content`クラスの`max-width: 1200px`を削除
- 画面サイズに合わせて無制限に広がるように

## 変更箇所

### 変更前（line 377）：
```css
.main-content {
    flex: 1;
    margin-left: 240px;
    padding: 24px;
    max-width: 1200px;  /* これが原因 */
    width: 100%;
    ...
}
```

### 変更後：
```css
.main-content {
    flex: 1;
    margin-left: 240px;
    padding: 24px;
    /* max-width: 1200px; removed to allow full width on zoom out */
    width: 100%;
    ...
}
```

## 効果

| ズームレベル | 変更前 | 変更後 |
|------------|--------|--------|
| 100% | 最大1200px | 画面幅いっぱい |
| 75% | 最大1200px（左寄り） | 画面幅いっぱい |
| 50% | 最大1200px（左寄り） | 画面幅いっぱい |

## メリット
- ズームアウト時にコンテンツが中央に維持される
- 大画面モニターでも全幅を活用できる
- より多くの情報を一度に表示可能