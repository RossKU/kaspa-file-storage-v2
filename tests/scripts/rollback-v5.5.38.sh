#!/bin/bash
# Emergency rollback script for v5.5.38

echo "Rolling back to v5.5.37..."
cp index-v5.5.37-safe-backup.html index.html
echo "Rollback complete!"
echo "Run: git add index.html && git commit -m 'emergency: rollback to v5.5.37' && git push"