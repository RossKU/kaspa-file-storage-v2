# Network Auto-Recovery Implementation Plan
**Version**: 1.0  
**Date**: 2025-07-19  
**Target**: index.html v5.5.39

## 概要

ネットワーク切断時の自動リカバリー機能を実装するための詳細な導入計画書です。既存のコードを壊さないよう、段階的かつ慎重に実装を進めます。

## 現状分析

### 既存のネットワーク関連コンポーネント

1. **NetworkState構造**
   ```javascript
   NetworkState = {
       kaspa: null,
       rpcClient: null,
       ws: {
           connection: null,
           connected: false,
           reconnectInterval: null,
           monitorActive: false,
           monitoredTransactions: Map
       }
   }
   ```

2. **既存の再接続機能**
   - `reconnectRpc()` - RPC再接続関数（既に存在）
   - `createRpcClient()` - RPC Client作成関数（既に存在）
   - `restartMonitoring()` - WebSocket監視再開関数（既に存在）

3. **エラーハンドリング箇所**
   - 各トランザクション送信時のcatchブロック
   - WebSocket監視のエラーハンドリング
   - ファイルダウンロード時のRPC呼び出し
   - offlineイベントリスナー

## 実装計画

### Phase 1: NetworkState拡張とヘルパー関数追加（リスク: 低）

**目的**: 既存コードに影響を与えずに基盤を構築

1. **NetworkStateにreconnectionオブジェクトを追加**
   ```javascript
   // 場所: NetworkState定義の直後（約5600行目）
   NetworkState.reconnection = {
       isReconnecting: false,
       retryCount: 0,
       maxRetries: 5,
       baseDelay: 2000,
       activeWaiters: new Set()
   }
   ```

2. **ヘルパー関数の追加**
   ```javascript
   // 場所: ユーティリティ関数セクション（sleep関数の近く）
   - waitForReconnection()
   - isNetworkError()
   - getBackoffDelay()
   ```

**テスト方法**:
- コンソールで`NetworkState.reconnection`が存在することを確認
- 他の機能が正常動作することを確認

### Phase 2: 統一エラーハンドラーの実装（リスク: 低）

**目的**: エラー処理ロジックを一元化

1. **handleNetworkError関数の実装**
   - 場所: reconnectRpc関数の近く（約8200行目）
   - 既存の関数を呼び出すだけで、新しい処理は最小限

2. **ログ機能の拡張**
   - reconnection専用のログプレフィックスを追加
   - デバッグモードでの詳細ログ

**テスト方法**:
- 手動でhandleNetworkErrorを呼び出してログ出力を確認
- 既存のエラー処理に影響がないことを確認

### Phase 3: 重要度の低い機能から段階的導入（リスク: 中）

**優先順位（低リスクから高リスクへ）**:

1. **WebSocket監視のエラーハンドリング**（約10500行目）
   - 既にtry-catchがあるので影響最小
   - 失敗してもファイル操作には影響なし

2. **getServerInfo呼び出し**（複数箇所）
   - 情報取得のみで重要な処理ではない

3. **offlineイベントハンドラー**（約10400行目）
   - 既存の処理を拡張するだけ

**各機能の変更パターン**:
```javascript
// Before
} catch (error) {
    log(`エラー: ${error.message}`, 'error');
}

// After
} catch (error) {
    log(`エラー: ${error.message}`, 'error');
    if (isNetworkError(error)) {
        await NetworkState.reconnection.handleNetworkError(error, '機能名');
    }
}
```

### Phase 4: アップロード機能への適用（リスク: 高）

**慎重に実装する箇所**:

1. **waitForConfirmation関数**（約9300行目）
   - 既存のポーリングロジックを維持
   - 再接続待機を追加

2. **sendTransaction関数**（約8000行目）
   - 既存の再送信ロジックと統合

3. **processAndUpload関数**（約7500行目）
   - チャンクアップロードの継続性を保証

**実装パターン**:
```javascript
// ループ内での待機処理
while (条件) {
    // 再接続中なら待機
    if (NetworkState.reconnection.isReconnecting) {
        await NetworkState.reconnection.waitForReconnection();
    }
    // 既存の処理
}
```

### Phase 5: ダウンロード機能への適用（リスク: 高）

**並列ダウンロードの考慮事項**:

1. **DownloadManager.downloadChunk**（約4200行目）
   - 8並列の各ワーカーが独立して待機
   - 失敗したチャンクのリトライ

2. **downloadPayload関数**（約4000行目）
   - メタデータ取得の確実性

### Phase 6: 完全統合とクリーンアップ（リスク: 低）

1. **冗長なエラーハンドリングの削除**
2. **ログメッセージの統一**
3. **パフォーマンス最適化**

## 実装時の注意事項

### コードの安全性確保

1. **必ず各フェーズごとにコミット**
   - 問題が発生した場合のロールバック用
   - `git commit -m "feat: network recovery phase X"`

2. **既存の動作を変更しない**
   - 新しいコードは追加のみ
   - 既存のフローは維持

3. **グローバル変数の扱い**
   - v5.5.39で移行済みのプロキシに注意
   - NetworkState経由でのアクセスを維持

### テスト戦略

#### Phase 1-2 テスト（基本動作確認）
```javascript
// コンソールでの手動テスト
NetworkState.reconnection.isReconnecting = true;
console.log(NetworkState.reconnection);
// 他の機能が正常動作することを確認
```

#### Phase 3 テスト（エラーシミュレーション）
1. 開発者ツールでネットワークをオフラインに
2. WebSocket監視が自動復帰することを確認
3. ログに適切なメッセージが出力されることを確認

#### Phase 4-5 テスト（実際の切断テスト）
1. ファイルアップロード中にWiFiを切断
2. 自動的に再接続され、アップロードが継続することを確認
3. ダウンロードでも同様のテスト

### ロールバック計画

各フェーズで問題が発生した場合：

1. **即座に前のコミットに戻す**
   ```bash
   git reset --hard HEAD~1
   ```

2. **問題の原因を特定**
   - ブラウザコンソールのエラーを確認
   - 追加したコードのみを確認

3. **修正して再実装**
   - より小さな変更単位で再実施

## 実装チェックリスト

### Phase 1
- [ ] NetworkState.reconnectionオブジェクト追加
- [ ] ヘルパー関数実装
- [ ] 基本動作確認
- [ ] コミット

### Phase 2  
- [ ] handleNetworkError実装
- [ ] ログ機能拡張
- [ ] 単体テスト
- [ ] コミット

### Phase 3
- [ ] WebSocket監視対応
- [ ] getServerInfo対応
- [ ] offlineイベント対応
- [ ] 統合テスト
- [ ] コミット

### Phase 4
- [ ] waitForConfirmation対応
- [ ] sendTransaction対応
- [ ] processAndUpload対応
- [ ] アップロードテスト
- [ ] コミット

### Phase 5
- [ ] downloadChunk対応
- [ ] downloadPayload対応
- [ ] ダウンロードテスト
- [ ] コミット

### Phase 6
- [ ] コードクリーンアップ
- [ ] 最終テスト
- [ ] ドキュメント更新
- [ ] 最終コミット

## 成功指標

1. **機能面**
   - ネットワーク切断時に自動再接続される
   - 実行中の処理が中断されない
   - ユーザーに分かりやすいフィードバック

2. **品質面**
   - 既存機能への影響ゼロ
   - エラーログの削減
   - コードの保守性向上

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 既存機能の破壊 | 高 | 段階的実装とテスト |
| 無限ループ | 中 | maxRetriesとタイムアウト |
| メモリリーク | 中 | activeWaitersの管理 |
| 過度な再接続 | 低 | バックオフ戦略 |

## 次のステップ

1. この計画書のレビューと承認
2. Phase 1の実装開始
3. 各フェーズごとの進捗報告

---

**注記**: この実装により、Kaspa File Storage v2は、モバイル環境や不安定なネットワーク環境でも安定して動作するようになります。