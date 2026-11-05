import { execFileSync, spawn } from 'node:child_process';
import { lstat, mkdir, open, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { createClient, createDeviceClient, controlPath, validateOrigin } from './client.mjs';

const windows = process.platform==='win32';
const root = process.env.AI_RSS_CONFIG_DIR || (windows
  ? join(process.env.LOCALAPPDATA || join(homedir(),'AppData','Local'),'ai-rss')
  : join(process.env.XDG_CONFIG_HOME || join(homedir(),'.config'),'ai-rss'));
const credential = join(root,'session');
const defaultServer = 'https://rss.illli.cc';

function dpapi(value, encrypt) {
  const method=encrypt?'Protect':'Unprotect';
  const script=`$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $result=[System.Security.Cryptography.ProtectedData]::${method}($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Write([Convert]::ToBase64String($result))`;
  const input=encrypt?Buffer.from(value,'utf8').toString('base64'):value;
  try {
    const result=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],
      {input,encoding:'utf8',windowsHide:true,timeout:10_000,stdio:['pipe','pipe','pipe']}).trim();
    return encrypt?result:Buffer.from(result,'base64').toString('utf8');
  } catch {
    throw new Error('无法访问 Windows 本机登录凭据，请检查当前用户环境。');
  }
}

async function exists() {
  try { return await lstat(credential); }
  catch (error) { if (error.code==='ENOENT') return null; throw error; }
}

async function loadSession() {
  const info=await exists();
  if (!info) return null;
  if (!info.isFile() || info.size>16_384 ||
      (!windows && ((info.mode&0o077) || info.uid!==process.getuid()))) {
    throw new Error('本地登录文件的权限或类型不安全，请重新登录。');
  }
  const handle=await open(credential,'r');
  try {
    const data=await handle.readFile('utf8');
    const session=JSON.parse(windows?dpapi(data,false):data);
    createClient(session);
    return session;
  } finally { await handle.close(); }
}

async function saveSession(session) {
  const data=JSON.stringify(session);
  const stored=windows?dpapi(data,true):data;
  await mkdir(root,{recursive:true,mode:0o700});
  const directory=await lstat(root);
  if (!directory.isDirectory() || (!windows && ((directory.mode&0o077) || directory.uid!==process.getuid()))) {
    throw new Error('CLI 登录目录的权限或类型不安全。');
  }
  const handle=await open(credential,'wx',0o600);
  try {
    await handle.writeFile(stored,'utf8');
  } catch (error) {
    await handle.close();
    await unlink(credential).catch(()=>{});
    throw error;
  }
  await handle.close();
}

export async function activeClient() {
  const baseUrl=process.env.AI_RSS_URL, key=process.env.AI_RSS_KEY;
  if (key) {
    if (!baseUrl) throw new Error('通过环境变量接入时，请同时设置 AI_RSS_URL 和 AI_RSS_KEY。');
    return createClient({baseUrl,key});
  }
  const session=await loadSession();
  if (!session) throw new Error('请先运行 ai-rss login，或同时配置 AI_RSS_URL 和 AI_RSS_KEY。');
  if (baseUrl && validateOrigin(baseUrl)!==session.baseUrl) {
    throw new Error('AI_RSS_URL 与当前登录实例不同，请先退出再登录。');
  }
  return createClient(session);
}

function openBrowser(url) {
  const [command,...args]=windows?['rundll32.exe','url.dll,FileProtocolHandler',url]
    : process.platform==='darwin'?['open',url]:['xdg-open',url];
  const child=spawn(command,args,{stdio:'ignore',detached:true,windowsHide:true});
  child.once('error',()=>process.stderr.write('无法自动打开浏览器，请手动打开上面的地址。\n'));
  child.unref();
}

export async function login({url, noBrowser=false}) {
  if (await exists()) throw new Error('本机已有登录，请先运行 ai-rss logout 再切换账号或实例。');
  if (process.env.AI_RSS_KEY) throw new Error('当前已配置 AI_RSS_KEY。使用浏览器登录前请从运行环境移除它。');
  const baseUrl=validateOrigin(url || process.env.AI_RSS_URL || defaultServer);
  const api=createDeviceClient(baseUrl);
  const request=await api.start().catch((error)=>{
    if (error.status===404) throw new Error('该实例还没有 CLI 快速登录接口，请更新ai-rss 或使用手动密钥接入。');
    throw error;
  });
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(request.userCode) ||
      !/^[A-Za-z0-9_-]{43}$/.test(request.deviceCode) ||
      !Number.isInteger(request.expiresIn) || request.expiresIn<1 || request.expiresIn>600 ||
      !Number.isInteger(request.interval) || request.interval<1 || request.interval>30) {
    throw new Error('服务返回了无效的 CLI 授权请求。');
  }
  const browserUrl=baseUrl+'/dashboard#ai-login';
  process.stderr.write('浏览器授权地址：'+browserUrl+'\n终端授权码：'+request.userCode+'\n只在你刚打开的 ai-rss 页面输入该码。等待授权…\n');
  if (!noBrowser) openBrowser(browserUrl);
  const deadline=Date.now()+request.expiresIn*1000;
  let interval=request.interval;
  while (Date.now()+interval*1000<deadline) {
    await wait(interval*1000);
    const result=await api.poll(request.deviceCode).catch((error)=>{
      if (error.status===429) {
        interval=Math.min(30,Math.max(interval+1,error.interval??0));
        return {status:'pending'};
      }
      throw error;
    });
    if (result.status==='pending') continue;
    if (result.status!=='authorized') throw new Error('服务器未完成本次登录。');
    const session={baseUrl,key:result.key};
    const authorized=createClient(session);
    try { await saveSession(session); }
    catch {
      await authorized.request(controlPath+'/device/logout',{method:'POST'}).catch(()=>{});
      throw new Error('无法保存本机登录状态，请检查目录权限或改用环境变量接入。');
    }
    return {ok:true, workspace:result.workspace, baseUrl};
  }
  throw new Error('本次授权已超时，请重新运行 ai-rss login。');
}

export async function logout({localOnly=false}={}) {
  if (!await exists()) return {ok:true, signedIn:false};
  let revoked=false;
  if (!localOnly) {
    const session=await loadSession();
    if (!session) return {ok:true,signedIn:false};
    try { await createClient(session).request(controlPath+'/device/logout',{method:'POST'}); }
    catch (error) { if (error.status!==401) throw error; }
    revoked=true;
  }
  await unlink(credential);
  return {ok:true, signedIn:false, revoked};
}
