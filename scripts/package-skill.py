"""打包 WorkBuddy 等工具可导入的本地技能，包含同版本的 CLI。"""
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
    'bin/ai-rss.mjs': root / 'bin/ai-rss.mjs',
    'src/client.mjs': root / 'src/client.mjs',
    'src/report.mjs': root / 'src/report.mjs',
    'src/login.mjs': root / 'src/login.mjs',
    'references/commands.md': root / 'skills/ai-rss/references/commands.md',
}
with ZipFile(target, 'w', compression=ZIP_DEFLATED) as archive:
    for name, source in paths.items():
        archive.write(source, 'ai-rss/' + name)
print(target)
