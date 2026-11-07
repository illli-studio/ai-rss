"""打包通用技能或包含离线验证的 WorkBuddy 版本。"""
import argparse
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workbuddy', action='store_true')
workbuddy = parser.parse_args().workbuddy
variant = 'workbuddy' if workbuddy else 'skill'
target = root / 'dist' / f'ai-rss-{variant}-{version}.zip'
target.parent.mkdir(exist_ok=True)
paths = {
    'LICENSE': root / 'LICENSE',
    'references/commands.md': root / 'skills/ai-rss/references/commands.md',
    'references/intelligence.md': root / 'skills/ai-rss/references/intelligence.md',
}
skill = (root / 'skills/ai-rss/SKILL.md').read_text(encoding='utf-8')
if workbuddy:
    _, frontmatter, body = skill.split('---', 2)
    metadata = {
        'display_name': 'ai-rss · 微信公众号订阅与监控',
        'display_name_en': 'ai-rss · WeChat Article Monitor',
        'description_zh': '订阅和检索微信公众号文章，跟踪关键词与采集状态，按需生成 RSS 日报。',
        'description_en': 'Subscribe to and search WeChat Official Account articles, track keywords and collection status, and generate RSS digests.',
        'version': version,
        'author': 'illli-studio',
        'examples_zh': ['找最近 7 天提到人工智能的归档文章，列出标题和原文链接。', '检查订阅的公众号最近一次采集有没有失败。'],
        'examples_en': ['Find archived articles mentioning AI in the last seven days and list the original links.', 'Check which subscribed accounts failed their last collection.'],
    }
    fields = '\n'.join(f'{key}: {json.dumps(value, ensure_ascii=False)}' for key, value in metadata.items())
    heading, _, instructions = body.lstrip('\n').split('\n\n', 2)
    intro = (
        '技能包内置 CLI。以下命令从本技能目录运行，需 Node.js 22 或更新版本。'
        '将手册里的 `ai-rss` 替换为 `node bin/ai-rss.mjs`。跨页全选需要支持对应接口的 irss 实例。\n\n'
        '## 无账号体验\n\n'
        '当用户要求了解能力、试运行或验证技能时，先运行 `node bin/ai-rss.mjs --help`。'
        '如可使用本机回环连接，再运行 `node --test scripts/verify.mjs`，'
        '验证在内存中模拟的文章筛选、跨页选择和删除确认。'
        '演示无需外网、微信账号或密钥，只操作测试数据。'
        '如果沙箱限制本机回环连接，可阅读[命令手册](references/commands.md)查看示例。'
        '用户要操作自己的工作空间时，再进入下方登录流程。'
    )
    skill = f'---{frontmatter}{fields}\n---\n\n{heading}\n\n{intro}\n\n{instructions}'
    paths.update({'package.json': root/'package.json', 'bin/ai-rss.mjs': root/'bin/ai-rss.mjs',
                  'scripts/verify.mjs': root/'test/delete.test.mjs'})
    paths.update({f'src/{source.name}': source for source in sorted((root/'src').glob('*.mjs'))})
with ZipFile(target, 'w', compression=ZIP_DEFLATED) as archive:
    archive.writestr('ai-rss/SKILL.md',skill)
    for name, source in paths.items():
        archive.write(source, 'ai-rss/' + name)
print(target)
