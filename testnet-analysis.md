# Kaspa Testnet Analysis

## Testnet-10 Status (as of 2025-07-14)

### Current Statistics:
- **Total Blocks**: ~1,313,000
- **Chain Age**: ~1.52 days (36.5 hours)
- **Block Rate**: 10 blocks/second
- **Daily Blocks**: 864,000

### Node Analysis:
All 25 tested nodes show identical block counts, indicating:
1. Testnet-10 is too new for archive/pruning distinction
2. All nodes currently have complete chain history
3. Pruning threshold (30 hours) was just recently crossed

### Archive Node Requirements:
- **Minimum blocks for archive detection**: 15,000,000
- **Days required**: ~17.4 days
- **Expected date**: Around July 31, 2025

### Alternative Options:

1. **Previous Testnets**:
   - testnet-9 (if still accessible)
   - testnet-8 (older versions)

2. **Mainnet Archive Nodes**:
   - Much older chain with millions of blocks
   - True archive nodes would be distinguishable

3. **Wait Period**:
   - Wait ~16 more days for testnet-10 to mature
   - Archive nodes will become relevant after pruning begins

### Recommendations:
1. Check if older testnets are still running
2. Consider mainnet for archive node testing
3. Monitor testnet-10 growth over coming weeks