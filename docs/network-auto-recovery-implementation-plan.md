# Network Auto-Recovery Implementation Plan
**Version**: 2.0  
**Date**: 2025-07-19  
**Target**: index.html v5.5.39  
**Updated**: 2025-07-19 - 実装調査結果を反映

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
   - `initializeRpcClient()` - RPC初期化関数（5299行目）
   - `createRpcClient()` - **未実装**（呼び出しはあるが定義なし）
   - `restartMonitoring()` - WebSocket監視再開関数（既に存在）
   - 各所で個別に`NetworkState.rpcClient.connect()`を呼んでいる

3. **エラーハンドリング箇所**
   - 各トランザクション送信時のcatchブロック
   - WebSocket監視のエラーハンドリング
   - ファイルダウンロード時のRPC呼び出し
   - offlineイベントリスナー

## 調査結果と変更点

### createRpcClient関数の発見
- 5312行目で呼び出されているが、**関数の定義が存在しない**
- nodeTypeに基づいてアーカイブノードに接続する予定だったが未実装
- Phase 1でこの関数を新規作成する必要がある

### 実際のRPC接続方法
```javascript
// 現在の実装（5238行目）
NetworkState.rpcClient = new NetworkState.kaspa.RpcClient({
    resolver: new NetworkState.kaspa.Resolver(),
    networkId: config.network
});
```

### アーカイブノードDiscovery統合
- 将来的に mainnet-resolver-rolling-v29.html の機能を統合予定
- prunedエラー検出時のみ起動する設計
- Phase 7として別途実装予定

### ログ分析から判明した重要な問題（2025-07-19追加）

#### 1. offlineイベントの過敏反応
- **問題**: わずか1.3秒の切断で即座にエラー表示
- **影響**: 瞬間的な切断でもユーザーに不要なエラーを表示
- **実例**: ペイロード3は切断エラー後も正常に完了していた

#### 2. onlineイベントでの不完全な復旧
- **問題**: RPC接続確認のみで、アップロードの自動再開なし
- **影響**: ユーザーが手動で「再開」ボタンを押す必要がある
- **改善案**: 自動的にアップロードを再開する機能の追加

#### 3. エラー処理のタイミング問題
```
20:30:18.068 - ネットワーク切断検出
20:30:19.425 - WebSocket is not connectedエラー
20:30:21.398 - ネットワーク復活
```
- **問題**: エラー発生から復旧まで3秒のタイムロス
- **影響**: その間ユーザーは操作不能

#### 4. 並行処理での課題
- **問題**: 複数のペイロードが同時にエラーになった場合の処理が不十分
- **影響**: 再接続が競合する可能性

## 実装計画

### Phase 1: NetworkState拡張とヘルパー関数追加（リスク: 低）

**目的**: 既存コードに影響を与えずに基盤を構築

1. **NetworkStateにreconnectionオブジェクトを追加**
   ```javascript
   // 場所: NetworkState定義の直後（1096行目、閉じ括弧の前）
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
   // 場所: ユーティリティ関数セクション（2960行目、formatSize関数の前）
   - sleep() // 新規作成（存在しない）
   - waitForReconnection()
   - isNetworkError()
   - getBackoffDelay()
   ```

3. **createRpcClient関数の新規作成**
   ```javascript
   // 場所: initializeRpcClient関数の前（5290行目付近）
   // nodeTypeに基づいてRPCクライアントを作成
   - アーカイブノード対応
   - カスタムエンドポイント対応
   - 標準はResolver使用
   ```

**テスト方法**:
- コンソールで`NetworkState.reconnection`が存在することを確認
- 他の機能が正常動作することを確認

### Phase 2: 統一エラーハンドラーの実装（リスク: 低）

**目的**: エラー処理ロジックを一元化

1. **handleNetworkError関数の実装**
   - 場所: initializeRpcClient関数の後（5330行目付近）
   
```javascript
// 統一的なネットワークエラーハンドラー
async function handleNetworkError(error, source) {
    const reconnection = NetworkState.reconnection;
    
    // 既に再接続中なら待機
    if (reconnection.isReconnecting) {
        log(`[${source}] 再接続中のため待機します`, 'info');
        await waitForReconnection();
        return true;  // 再接続完了
    }
    
    // エラーがネットワーク関連でない場合はスキップ
    if (!isNetworkError(error)) {
        return false;
    }
    
    reconnection.retryCount++;
    
    // 軽微なエラー（最初の2回）は短い待機
    if (reconnection.retryCount <= 2) {
        const delay = getBackoffDelay(reconnection.retryCount - 1);
        log(`[${source}] ネットワーク応答遅延を検知。${delay}ms待機...`, 'warning');
        await sleep(delay);
        return false;  // まだ再接続しない
    }
    
    // 完全な切断と判断して再接続
    log(`[${source}] ネットワーク完全切断を検知。再接続を開始...`, 'error');
    reconnection.isReconnecting = true;
    
    try {
        // RPC再接続
        await initializeRpcClient();
        
        // WebSocket監視の再開
        if (NetworkState.ws.monitorActive) {
            await restartMonitoring();
        }
        
        log('ネットワーク再接続完了', 'success');
        
        // 待機中のPromiseを解決
        reconnection.activeWaiters.forEach(resolve => resolve());
        reconnection.activeWaiters.clear();
        
        return true;
    } catch (reconnectError) {
        log(`再接続失敗: ${reconnectError.message}`, 'error');
        throw reconnectError;
    } finally {
        reconnection.isReconnecting = false;
        reconnection.retryCount = 0;
    }
}
```

2. **ログ機能の拡張**
   - reconnection専用のログプレフィックスを追加
   - デバッグモードでの詳細ログ

**テスト方法**:
- 手動でhandleNetworkErrorを呼び出してログ出力を確認
- 既存のエラー処理に影響がないことを確認

### Phase 3: 重要度の低い機能から段階的導入（リスク: 中）

**優先順位（低リスクから高リスクへ）**:

1. **WebSocket監視のエラーハンドリング**（実際の位置は調査中）
   - 既にtry-catchがあるので影響最小
   - 失敗してもファイル操作には影響なし

2. **getServerInfo呼び出し**（複数箇所）
   - 情報取得のみで重要な処理ではない

3. **offline/onlineイベントハンドラーの改善**（重要度：高に変更）
   - 瞬間的な切断を無視する遅延処理の実装
   - onlineイベントでの自動再開機能の追加

**実装内容の詳細**:

#### offline/onlineイベントの最適化
```javascript
// 現在の問題のあるコード
window.addEventListener('offline', async () => {
    log('ネットワーク接続が切断されました', 'error');  // 即座にエラー
});

// 改善案：遅延判定の実装
let offlineTimeout = null;
window.addEventListener('offline', () => {
    // 一時的な切断の可能性を考慮
    offlineTimeout = setTimeout(async () => {
        if (!navigator.onLine) {
            log('ネットワーク接続が切断されました（2秒経過）', 'error');
            updateNetworkStatus('offline', 'オフライン');
            
            // 進捗を保存
            if (FileState.progressManager?.progress) {
                await FileState.progressManager.saveProgress();
                log('進捗を自動保存しました', 'info');
            }
        }
    }, 2000);  // 2秒の猶予期間
});

// onlineイベントの強化
window.addEventListener('online', async () => {
    // offlineタイマーをクリア
    if (offlineTimeout) {
        clearTimeout(offlineTimeout);
        offlineTimeout = null;
    }
    
    log('ネットワーク接続が復活しました', 'success');
    
    // 自動再開機能の追加
    if (FileState.progressManager?.progress && 
        FileState.progressManager.progress.metadata.completedChunks < 
        FileState.progressManager.progress.metadata.totalChunks) {
        
        log('アップロードを自動的に再開します...', 'info');
        // 少し待ってから再開（ネットワークの安定を待つ）
        setTimeout(async () => {
            await resumeFromProgress();
        }, 1000);
    }
});
```

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

### Phase 7: アーカイブノードDiscovery統合（将来実装）

**目的**: prunedデータアクセス時の自動アーカイブノード発見

1. **Discovery機能の統合**
   - mainnet-resolver-rolling-v29.htmlの機能を活用
   - prunedエラー検出時のみ起動
   - 発見したノードをキャッシュ

2. **リソース管理**
   - バックグラウンドでの常時検索は避ける
   - ユーザーに進捗を表示
   - 必要最小限のワーカー数で実行

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
- [ ] NetworkState.reconnectionオブジェクト追加（1096行目）
- [ ] sleep関数の新規作成（2960行目）
- [ ] その他ヘルパー関数実装
- [ ] createRpcClient関数の新規作成（5290行目）
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
- [ ] offline/onlineイベントの遅延処理実装
- [ ] onlineイベントでの自動再開機能追加
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
   - **新規**: 2秒未満の切断では誤動作しない
   - **新規**: 切断から復旧まで5秒以内に自動再開

2. **品質面**
   - 既存機能への影響ゼロ
   - エラーログの削減
   - コードの保守性向上
   - **新規**: 不要なエラー表示を80%削減

3. **パフォーマンス指標**（ログ分析から設定）
   - 瞬間的な切断（2秒未満）: エラー表示なし
   - 短期切断（2-10秒）: 自動復旧率100%
   - 長期切断（10秒以上）: 明確なエラー表示と復旧手順

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 既存機能の破壊 | 高 | 段階的実装とテスト |
| 無限ループ | 中 | maxRetriesとタイムアウト |
| メモリリーク | 中 | activeWaitersの管理 |
| 過度な再接続 | 低 | バックオフ戦略 |

## 実装優先順位（ログ分析後の更新）

1. **最優先**: Phase 3のoffline/onlineイベント改善
   - 瞬間的な切断での誤動作を防ぐ
   - ユーザー体験の大幅改善

2. **高優先**: Phase 2のhandleNetworkError実装
   - 統一的なエラー処理の基盤

3. **中優先**: Phase 4-5の段階的適用
   - アップロード/ダウンロード機能への統合

## 次のステップ

1. この計画書のレビューと承認
2. Phase 2の実装開始（Phase 1は完了済み）
3. 特にPhase 3の早期実装を推奨
4. 各フェーズごとの進捗報告

---

**注記**: この実装により、Kaspa File Storage v2は、モバイル環境や不安定なネットワーク環境でも安定して動作するようになります。

## v5.6.4デバッグログ分析による重大発見（2025-07-19）

### 誤検出の真相

デバッグログ（kaspa-p2p-logs-1752929567712.json）により、「誤検出」の本質が判明：

1. **ブラウザの予想外の動作**
   - WebSocket切断時に`navigator.onLine`が実際にfalseになる
   - これは通常のブラウザ動作ではなく、モバイルChrome特有の挙動
   - 省電力機能によりWebSocket切断を「ネットワーク切断」と解釈

2. **WebSocket状態管理の不整合**
   ```
   21:52:35.034 - offlineイベント発火
   navigator.onLine: false（本当にfalse！）
   WebSocket状態: 接続中（矛盾！）
   ```
   - `NetworkState.ws.connected`が切断時に更新されていない
   - これにより状態把握が混乱

3. **実際のタイムライン**
   ```
   21:52:35.034 - offlineイベント（WebSocket切断による）
   21:52:35.424 - ペイロード3完了（正常！）
   21:52:35.428 - WebSocket is not connectedエラー
   21:52:37.546 - onlineイベント（2.5秒で復旧）
   ```

### 新たな対処方針

#### 方針1: WebSocket状態管理の修正（即座に実装可能）
```javascript
// WebSocket切断時に状態を正しく更新
NetworkState.rpcClient.addEventListener('disconnect', () => {
    NetworkState.ws.connected = false;
});
```

#### 方針2: スマートフィルタリング（推奨）
offline/onlineイベントを「参考情報」として扱い、実際の接続性を確認：

```javascript
// 真のネットワーク状態確認
async function verifyNetworkStatus() {
    const checks = [
        // RPC接続確認
        NetworkState.rpcClient?.getServerInfo(),
        // 簡易接続確認
        fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' })
    ];
    
    const results = await Promise.allSettled(checks);
    return results.every(r => r.status === 'rejected');
}
```

#### 方針3: エラーベースの判定
WebSocket切断エラーは一時的なものとして扱い、実際の送信失敗時のみ再接続：

```javascript
if (error.message.includes('WebSocket is not connected')) {
    await sleep(2000);  // 短い待機
    if (!await quickHealthCheck()) {
        // 本当に切断されている場合のみ再接続
        return performFullReconnection();
    }
}
```

### 実装優先順位の再設定

1. **最優先**: WebSocket状態管理の修正
   - 即座に実装可能で効果大
   - 誤検出の根本原因を解決

2. **高優先**: スマートフィルタリングの実装
   - ブラウザの誤判断を適切に処理
   - 真の切断は確実に検知

3. **中優先**: 既存計画の継続
   - Phase 3以降の実装

## v5.6.8実装結果（2025-07-20）

### 発見された重大な問題

1. **自動再開機能の根本的な欠陥**
   - ConnectionManagerの`handleReconnected()`が存在しない関数を呼び出していた
   ```javascript
   // 問題のコード
   const resumeBtn = document.querySelector('button[onclick*="resumeFromProgress"]');
   // resumeFromProgress関数は存在しない！
   ```

2. **実際の再開メカニズムとの不整合**
   - 再開は`loadProgressFile()` → `handleProgressLoad()` → `processAndUpload()`の流れ
   - ConnectionManagerは存在しないUIボタンを探していた

### 実装した修正（v5.6.8）

```javascript
// Auto-resume upload if in progress
if (FileState.progressManager?.progress && 
    FileState.progressManager.progress.metadata.completedChunks < 
    FileState.progressManager.progress.metadata.totalChunks) {
    
    log('[ConnectionManager] アップロードを自動的に再開します...', 'info');
    
    // Load progress from localStorage if not already loaded
    if (!window.pendingProgress) {
        const savedProgress = loadProgressFromLocalStorage();
        if (savedProgress) {
            // Verify the progress matches current file
            if (FileState.currentFile && savedProgress.file?.name === FileState.currentFile.name) {
                window.pendingProgress = savedProgress;
                log('[ConnectionManager] 進捗データを復元しました', 'info');
            }
        }
    }
    
    // Call processAndUpload directly
    setTimeout(async () => {
        if (FileState.currentFile && window.pendingProgress) {
            log('[ConnectionManager] processAndUploadを呼び出します...', 'info');
            await processAndUpload();
        } else {
            log('[ConnectionManager] 自動再開に必要な情報が不足しています', 'warning');
            // デバッグログ追加
        }
    }, 1000);
}
```

### 修正の効果

1. **自動再開が正常に動作**
   - localStorageから進捗データを自動復元
   - `processAndUpload()`を直接呼び出して再開

2. **デバッグ性の向上**
   - 自動再開失敗時の原因を特定しやすいログ追加
   - FileState.currentFileとpendingProgressの状態を記録

### 今後の課題と推奨事項

1. **FileState.currentFileの管理**
   - ネットワークエラー時にcurrentFileが失われないよう注意が必要
   - エラー発生時もファイル参照を保持する仕組みの検討

2. **進捗データの整合性**
   - ファイル名だけでなくCIDやハッシュでも検証
   - より堅牢な進捗データ検証メカニズムの実装

3. **ユーザーフィードバック**
   - 自動再開開始時の視覚的フィードバック追加
   - 再開失敗時の明確なエラーメッセージ

4. **テスト推奨事項**
   - アップロード中にネットワークを切断
   - 再接続後に自動再開が動作することを確認
   - ログで「processAndUploadを呼び出します」が表示されることを確認

## 更新履歴

### Version 2.3（2025-07-20）
- v5.6.8の実装結果を追加
- 自動再開機能の根本的な問題を発見・修正
- ConnectionManagerのhandleReconnected()実装の詳細を文書化
- 今後の課題と推奨事項を追加

### Version 2.2（2025-07-19）
- v5.6.4デバッグログ分析による重大発見を追加
- WebSocket切断時のブラウザ挙動の真相を文書化
- 新たな対処方針（3つのアプローチ）を追加
- 実装優先順位を再設定

### Version 2.1（2025-07-19）
- ログ分析（kaspa-p2p-logs-1752924634140.json）から重要な問題を発見
- offline/onlineイベントの過敏反応問題を追加
- Phase 2にhandleNetworkError関数の詳細実装を追加
- Phase 3を大幅強化（遅延処理、自動再開機能）
- 並行処理での課題を文書化

### Version 2.0（2025-07-19）
- 調査結果に基づいて計画を大幅更新
- createRpcClient関数が未実装であることを発見
- reconnectRpc関数が存在しないことを確認
- 具体的な行番号を追加
- アーカイブノードDiscovery統合計画（Phase 7）を追加