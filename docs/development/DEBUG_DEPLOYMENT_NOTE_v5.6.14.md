# v5.6.14-debug Deployment Note

**Deployed**: 2025-07-20
**Commit**: 3beee24
**Purpose**: Diagnose auto-resume failure

## What's Different from v5.6.14

This is a **debug-only** version with minimal logging additions:

1. **ConnectionManager.handleReconnected**:
   - Logs FileState.currentFile status
   - Logs savedProgress content
   - Attempts to restore FileState.currentFile if null

2. **processAndUpload finally block**:
   - Logs FileState.currentFile preservation
   - Logs networkErrorOccurred flag status

## Testing Instructions

1. Access: https://rossku.github.io/kaspa-file-storage-v2/
2. Open browser console (F12)
3. Start file upload (use 22KB+ chunk size)
4. Disconnect network during upload
5. Reconnect network
6. Watch for debug logs:
   - `[DEBUG] FileState.currentFile: ...`
   - `[DEBUG] savedProgress: ...`
   - `[ConnectionManager] ファイル情報を進捗データから復元しました`

## Expected Outcomes

The debug logs should reveal:
- When FileState.currentFile becomes null
- Whether savedProgress contains file data
- If restoration logic executes
- Why auto-resume fails to trigger

## Important Notes

- This is NOT a release version
- Only for debugging purposes
- Will be replaced once issue is diagnosed
- No functional changes, only logging