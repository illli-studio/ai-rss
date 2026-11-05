"""打包可导入 WorkBuddy 的技能说明；执行时调用 npm 正式版。"""
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
target = root / 'dist' / f'ai-rss-skill-{version}.zip'
target.parent.mkdir(exist_ok=True)
paths = {
    'SKILL.md': root / 'skills/ai-rss/SKILL.md',
    'LICENSE': root / 'LICENSE',
    'references/commands.md': root / 'skills/ai-rss/references/commands.md',
    'references/intelligence.md': root / 'skills/ai-rss/references/intelligence.md',
}
with ZipFile(target, 'w', compression=ZIP_DEFLATED) as archive:
    for name, source in paths.items():
        archive.write(source, 'ai-rss/' + name)
print(target)
