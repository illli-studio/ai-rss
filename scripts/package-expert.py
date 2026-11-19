"""Build the WorkBuddy expert archive with the same standalone IRSS skill used by clients."""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--expert', default='wechat-analyst-expert',
                    choices=['wechat-analyst-expert', 'wechat-editorial-planner'])
folder = root / 'experts' / parser.parse_args().expert
manifest = json.loads((folder / '.codebuddy-plugin/plugin.json').read_text(encoding='utf-8'))
name = manifest['name']
output = root / 'downloads' / f"{name}-{manifest['version']}.zip"
output.parent.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory() as temporary:
    skill_path, = manifest['skills']
    subprocess.run([sys.executable, str(root/'scripts/package-skill.py'), '--skill',
                    Path(skill_path).name, '--workbuddy', '--output-dir', temporary], check=True)
    skill_zip, = Path(temporary).glob('*.zip')
    with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive, ZipFile(skill_zip) as skill:
        for relative in ['.codebuddy-plugin/plugin.json', *manifest['agents'], manifest['avatar'], 'README.md']:
            archive.write(folder/relative, f'{name}/{Path(relative).as_posix()}')
        archive.write(root/'LICENSE', f'{name}/LICENSE')
        for file in skill.namelist():
            relative = file.split('/', 1)[1]
            archive.writestr(f'{name}/skills/{Path(skill_path).name}/{relative}', skill.read(file))
print(output)
