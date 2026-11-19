"""打包通用技能或包含离线验证的 WorkBuddy 版本。"""
import argparse
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
parser = argparse.ArgumentParser(description=__doc__)
focused = {
    'wechat-data-analyst': ('微信公众号数据分析师', 'WeChat Official Account Analyst',
        '从我的订阅里找三个对标号，再分析有哪些文章的阅读量明显高于同号常态。'),
    'wechat-article-search': ('微信公众号文章搜索', 'WeChat Article Search',
        '查找我的订阅里最近 7 天提到人工智能的公众号文章。'),
    'wechat-daily-brief': ('微信公众号每日简报', 'WeChat Daily Brief',
        '把我订阅的公众号今天的更新整理成一份带原文的简报。'),
    'wechat-competitor-monitor': ('微信公众号竞品监控', 'WeChat Competitor Monitor',
        '比较我订阅的两个品牌公众号上周有哪些新品和调价动态。'),
}
parser.add_argument('--skill', choices=['ai-rss', *focused], default='ai-rss')
parser.add_argument('--output-dir', type=Path, default=root/'dist')
parser.add_argument('--workbuddy', action='store_true')
args = parser.parse_args()
name, workbuddy = args.skill, args.workbuddy
variant = 'workbuddy' if workbuddy else 'skill'
target = args.output_dir / f'{name}-{variant}-{version}.zip'
target.parent.mkdir(parents=True, exist_ok=True)
folder = root/'skills'/name
paths = {'LICENSE': root/'LICENSE', 'assets/icon.png': folder/'assets/icon.png'}
paths.update({p.relative_to(folder).as_posix(): p for p in (folder/'references').glob('*.md')})
skill = (folder/'SKILL.md').read_text(encoding='utf-8')
if workbuddy and name == 'ai-rss':
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
    paths['scripts/verify.mjs'] = root/'test/delete.test.mjs'
elif workbuddy:
    suite = 'analyst' if name == 'wechat-data-analyst' else 'archive-workflows'
    paths['scripts/verify.mjs'] = root/'test'/f'{suite}.test.mjs'
    title, en_title, example = focused[name]
    _, frontmatter, body = skill.split('---', 2)
    description = next(line.removeprefix('description: ') for line in frontmatter.splitlines()
                       if line.startswith('description: '))
    english = {
        'wechat-data-analyst': 'Recommend comparable accounts and identify high-performing articles using archived evidence.',
        'wechat-article-search': 'Search archived articles across your subscribed WeChat accounts and find original links.',
        'wechat-daily-brief': 'Build a daily briefing from your WeChat subscriptions with links to the original articles.',
        'wechat-competitor-monitor': 'Compare updates from competing brands across your subscribed WeChat accounts.',
    }
    prompts_en = {
        'wechat-data-analyst': 'Find three comparable subscriptions and articles that outperformed their account baseline.',
        'wechat-article-search': 'Find articles about artificial intelligence from my subscriptions in the past seven days.',
        'wechat-daily-brief': 'Summarize today’s updates from my subscriptions with links to the original articles.',
        'wechat-competitor-monitor': 'Compare last week’s product launches and price changes from two brands I subscribe to.',
    }
    metadata = dict(examples_en=[prompts_en[name]], description_en=english[name], display_name=title, display_name_en=en_title, description_zh=description,
                    examples_zh=[example], version=version, author='illli-studio')
    fields = '\n'.join(f'{key}: {json.dumps(value, ensure_ascii=False)}' for key, value in metadata.items())
    skill = f'---{frontmatter}{fields}\n---{body}\n## 本地验证\n\n运行 `node --test scripts/verify.mjs` 可用模拟数据验证本技能的工作流，无需登录。\n'
if workbuddy or name in focused:
    paths.update({'package.json': root/'package.json', 'bin/ai-rss.mjs': root/'bin/ai-rss.mjs'})
    paths.update({f'src/{source.name}': source for source in sorted((root/'src').glob('*.mjs'))})
with ZipFile(target, 'w', compression=ZIP_DEFLATED) as archive:
    archive.writestr(f'{name}/SKILL.md', skill)
    for relative, source in paths.items():
        archive.write(source, f'{name}/{relative}')
print(target)
