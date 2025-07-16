# 関数移行計画 - Kaspa File Storage v5.4.9

## 📋 概要

このドキュメントは、index.htmlの関数を適切なセクションに再配置するための詳細な計画です。
安全性を最優先に、段階的な移行を行います。

最終更新: 2025-07-16 09:57

## 🎯 目標

1. すべての関数を適切なセクションに配置
2. 依存関係を維持しながら安全に移行
3. コードの可読性と保守性を向上
4. 動作を壊さない

## 📊 現状分析

### セクション構成（13セクション）

```
1. CONFIGURATION .................. 設定定数（完了）
2. ERROR HANDLING SYSTEM .......... エラー処理（完了）
3. PROGRESS UPDATE SYSTEM ......... 進捗管理（完了）
4. GLOBAL STATE & INITIALIZATION .. グローバル変数
5. UTILITY FUNCTIONS .............. 汎用関数
6. STORAGE MANAGEMENT ............. ストレージクラス
7. CRYPTOGRAPHY & COMPRESSION ..... 暗号化・圧縮
8. NETWORK & RPC FUNCTIONS ........ ネットワーク通信
9. FILE OPERATIONS ................ ファイル操作
10. TRANSACTION FUNCTIONS ......... トランザクション処理
11. MONITORING FUNCTIONS .......... 監視機能
12. TEST FUNCTIONS ................ テスト関数
13. UI CONTROL & EVENT HANDLERS ... UI制御
```

### 問題のある関数配置

| 関数名 | 現在のセクション | 正しいセクション | リスク | HTMLから呼び出し |
|--------|------------------|------------------|--------|------------------|
| `window.copyToClipboard` | UTILITY | UI CONTROL | 低 | 間接的 |
| `window.switchTab` | FILE OPS | UI CONTROL | 低 | 直接 |
| `window.testConnection` | NETWORK | UI CONTROL | 低 | 直接 |
| `window.createDirectory` | FILE OPS | UI CONTROL | 中 | 直接 |
| `window.handleFileSelect` | FILE OPS | UI CONTROL | 中 | 直接 |
| `window.setupWorkspace` | FILE OPS | UI CONTROL | 高 | 直接 |

## 🔄 移行戦略

### 基本原則

1. **小さな関数から移動** - 依存関係が少ない関数を優先
2. **1つずつテスト** - 各移動後に動作確認
3. **関数分割を検討** - 大きな関数は分割してから移動
4. **コメントを追加** - 移動時に説明コメントを追加

### 依存関係マップ

```
UI Event → Handler Function → Business Logic → Infrastructure
   ↓           ↓                   ↓              ↓
onclick   handleFileSelect    uploadFile    createTransaction
               ↓                   ↓              ↓
         validateFile          encrypt        sendToBlockchain
```

## 📝 フェーズ別実施計画

### 🟢 Phase 1: 低リスク移動（即座に実施可能）

#### 1.1 `window.copyToClipboard` の移動
- **現在位置**: 2884行目（UTILITY FUNCTIONS）
- **移動先**: UI CONTROL & EVENT HANDLERS セクション
- **依存関係**: `log()` のみ
- **テスト方法**: 履歴からコピーボタンをクリック

#### 1.2 `window.switchTab` の移動
- **現在位置**: 3775行目（FILE OPERATIONS）
- **移動先**: UI CONTROL & EVENT HANDLERS セクション
- **依存関係**: DOM操作のみ
- **テスト方法**: タブ切り替えが正常に動作

#### 1.3 `window.testConnection` の移動
- **現在位置**: 5255行目（NETWORK & RPC）
- **移動先**: UI CONTROL & EVENT HANDLERS セクション
- **依存関係**: `rpcClient`, `fetchWithTimeout`, `log`, `alert`
- **テスト方法**: 接続テストボタンをクリック

### 🟡 Phase 2: 中リスク移動（慎重に実施）

#### 2.1 `window.createDirectory` の移動
- **現在位置**: 3795行目（FILE OPERATIONS）
- **移動先**: UI CONTROL & EVENT HANDLERS セクション
- **依存関係**: `directoryManager`, DOM, `ErrorHandler`
- **事前準備**: エラーハンドリングの確認
- **テスト方法**: ディレクトリ作成機能

#### 2.2 `window.handleFileSelect` の簡素化と移動
- **現在位置**: 5282-5395行目（FILE OPERATIONS）
- **分割案**:
  ```javascript
  // UI CONTROL に残す部分
  window.handleFileSelect = async function(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      const validationResult = await validateFileSelection(file);
      if (!validationResult.valid) {
          alert(validationResult.message);
          return;
      }
      
      await updateFileSelectionUI(file);
  }
  
  // FILE OPERATIONS に移動する部分
  async function validateFileSelection(file) {
      // バリデーションロジック
  }
  
  async function updateFileSelectionUI(file) {
      // UI更新ロジック
  }
  ```

### 🔴 Phase 3: 高リスク・大規模リファクタリング

#### 3.1 `setupWorkspace` の分割と再配置
- **現在の問題**: 100行以上の巨大関数
- **分割計画**:
  1. `scanWorkspaceFiles()` - ファイルスキャン機能
  2. `loadProgressFiles()` - 進捗ファイル読み込み
  3. `initializeWorkspaceUI()` - UI初期化
  4. `setupWorkspace()` - オーケストレーター（UI CONTROLに）

#### 3.2 グローバル変数の整理
- **現在**: 30個以上のグローバル変数が散在
- **目標**: 関連する変数をオブジェクトにグループ化
  ```javascript
  const AppState = {
      file: {
          current: null,
          password: null,
          chunks: []
      },
      network: {
          kaspa: null,
          rpcClient: null,
          connected: false
      },
      ui: {
          uploadProgress: 0,
          downloadProgress: 0
      }
  };
  ```

## ✅ チェックリスト

### 各関数移動時の確認事項

- [ ] 関数の依存関係を確認
- [ ] 移動先のセクションを確認
- [ ] 関数定義をカット＆ペースト
- [ ] インデントを調整
- [ ] 動作テストを実施
- [ ] Gitにコミット
- [ ] 本番環境で確認

### テスト項目

1. **基本機能テスト**
   - [ ] ファイル選択
   - [ ] アップロード開始
   - [ ] ダウンロード機能
   - [ ] タブ切り替え
   - [ ] 履歴表示

2. **エラーケーステスト**
   - [ ] 無効なファイル選択
   - [ ] ネットワークエラー
   - [ ] 大きなファイルの処理

## 🚨 リスクと対策

### リスク1: 関数が見つからなくなる
**対策**: 移動時に元の場所にコメントを残す
```javascript
// Moved to UI CONTROL & EVENT HANDLERS section
// window.switchTab = function(tabName) { ... }
```

### リスク2: 依存関係の破壊
**対策**: 依存関係を事前に図式化し、順序を守って移動

### リスク3: HTMLからの呼び出しエラー
**対策**: `window.`プレフィックスを維持、グローバルスコープを確保

## 📈 進捗追跡

| Phase | 関数名 | 状態 | 完了日 | 備考 |
|-------|--------|------|--------|------|
| 1.1 | copyToClipboard | ✅ 完了 | 2025-07-16 09:37 | log未定義エラー修正済み |
| 1.2 | switchTab | ✅ 完了 | 2025-07-16 09:55 | 正常動作確認済み |
| 1.3 | testConnection | ✅ 完了 | 2025-07-16 09:55 | 正常動作確認済み |
| 2.1 | createDirectory | 未着手 | - | |
| 2.2 | handleFileSelect | 未着手 | - | |
| 3.1 | setupWorkspace | 未着手 | - | |

## 🔍 次のステップ

### ✅ Phase 1 完了（2025-07-16）
- copyToClipboard: UTILITY → UI CONTROL（log未定義エラー修正含む）
- switchTab: FILE OPS → UI CONTROL  
- testConnection: NETWORK → UI CONTROL

### 📋 Phase 2 準備中
1. createDirectory の移動準備
2. handleFileSelect の分割設計
3. エラーハンドリングの確認

## 📊 成果

### v5.4.9での改善
- 3つの関数を適切なセクションに移動
- log未定義エラーの修正
- コード構造の改善

---

**注意**: このドキュメントは生きたドキュメントです。実施中に発見した問題や変更は随時更新してください。