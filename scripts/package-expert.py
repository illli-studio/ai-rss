"""Build the WorkBuddy expert archive with the same standalone IRSS skill used by clients."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
folder = root / 'experts' / 'wechat-analyst-expert'
manifest = json.loads((folder / '.codebuddy-plugin/plugin.json').read_text(encoding='utf-8'))
name = manifest['name']
output = root / 'downloads' / f"{name}-{manifest['version']}.zip"
output.parent.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory() as temporary:
    subprocess.run([sys.executable, str(root/'scripts/package-skill.py'), '--skill',
                    'wechat-data-analyst', '--workbuddy', '--output-dir', temporary], check=True)
    skill_zip, = Path(temporary).glob('*.zip')
    with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive, ZipFile(skill_zip) as skill:
        for relative in ['.codebuddy-plugin/plugin.json', *manifest['agents'], manifest['avatar'], 'README.md']:
            archive.write(folder/relative, f'{name}/{Path(relative).as_posix()}')
        archive.write(root/'LICENSE', f'{name}/LICENSE')
        for file in skill.namelist():
            archive.writestr(f'{name}/skills/{file}', skill.read(file))
print(output)
