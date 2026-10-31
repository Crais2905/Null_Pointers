from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
for p in (root/'backend/src/main/resources/seed/logs').glob('*.log'):
    shutil.copyfile(p,root/'ai/fixtures'/p.name)
print('AI log fixtures synced')
