"""Windows one-command launcher. All downloaded tools/caches stay inside .build/."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tarfile
import time
import urllib.request
import venv
import webbrowser
import zipfile

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / 'fixer'
BUILD = ROOT / '.build'
TOOLS = BUILD / 'tools'
CHILDREN = []
HANDLES = []

def say(text):
    print(text, flush=True)

def download(url, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    say('Downloading ' + url.rsplit('/', 1)[-1])
    with urllib.request.urlopen(url, timeout=60) as response, target.open('wb') as output:
        shutil.copyfileobj(response, output)

def extract_zip(archive, destination):
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as zipped:
        for name in zipped.namelist():
            if not (destination/name).resolve().is_relative_to(destination.resolve()):
                raise RuntimeError('Unsafe archive path')
        zipped.extractall(destination)

def safe_env(env):
    # Build/dependency tools and Java/web do not need the Gemini secret.
    return {k:v for k,v in env.items() if k not in {'GEMINI_API_KEY','GOOGLE_API_KEY','ANTHROPIC_API_KEY','DISPATCH_WEBHOOK_URL'}}

def run(args, cwd=ROOT, env=None):
    subprocess.run([str(x) for x in args], cwd=cwd, env=env, check=True)

def load_env():
    path = APP/'.env'
    if not path.exists():
        shutil.copyfile(APP/'.env.example', path)
    env = os.environ.copy()
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        line=line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        name,value=line.split('=',1)
        name=name.strip();value=value.strip()
        if len(value)>=2 and value[0]==value[-1] and value[0] in ('"',"'"):
            value=value[1:-1]
        if value or name not in env:
            env[name]=value
    return env

def ensure_node():
    installed=shutil.which('node')
    if installed:
        version=subprocess.check_output([installed,'--version'],text=True).strip()
        if int(version.lstrip('v').split('.')[0])>=20:
            return Path(installed)
    if os.name!='nt':
        raise RuntimeError('Install Node.js 20+ and rerun')
    version='22.16.0'
    folder=f'node-v{version}-win-x64'
    binary=TOOLS/folder/'node.exe'
    if not binary.exists():
        url=f'https://nodejs.org/dist/v{version}/'
        archive=TOOLS/(folder+'.zip')
        download(url+folder+'.zip',archive)
        with urllib.request.urlopen(url+'SHASUMS256.txt',timeout=30) as response:
            hashes=response.read().decode()
        expected=next(line.split()[0] for line in hashes.splitlines() if line.endswith(folder+'.zip'))
        if hashlib.sha256(archive.read_bytes()).hexdigest()!=expected:
            raise RuntimeError('Node distribution checksum mismatch')
        extract_zip(archive,TOOLS)
    return binary

def ensure_npm():
    # Use a private npm CLI; no global npm install or PATH changes.
    cli=TOOLS/'npm/package/bin/npm-cli.js'
    if not cli.exists():
        archive=TOOLS/'npm.tgz'
        metadata_url='https://registry.npmjs.org/npm/10.9.2'
        with urllib.request.urlopen(metadata_url,timeout=30) as response:
            metadata=json.load(response)
        download(metadata['dist']['tarball'],archive)
        if hashlib.sha1(archive.read_bytes()).hexdigest()!=metadata['dist']['shasum']:
            raise RuntimeError('npm archive checksum mismatch')
        destination=TOOLS/'npm';destination.mkdir(parents=True,exist_ok=True)
        with tarfile.open(archive) as package:
            for member in package.getmembers():
                if member.issym() or member.islnk() or not (destination/member.name).resolve().is_relative_to(destination.resolve()):
                    raise RuntimeError('Unsafe npm archive path')
            package.extractall(destination,filter='data')
    return cli

def ensure_java(env):
    candidates=[]
    if env.get('JAVA_HOME'):candidates.append(Path(env['JAVA_HOME']))
    if os.name=='nt':
        candidates.extend([Path('C:/Program Files/Java/jdk-17')])
        for parent in [Path('C:/Program Files/Java'),Path('C:/Program Files/Eclipse Adoptium')]:
            if parent.exists():candidates.extend(sorted(parent.glob('*'),reverse=True))
    installed=shutil.which('javac')
    if installed:candidates.append(Path(installed).resolve().parents[1])
    for home in candidates:
        java=home/'bin'/('java.exe' if os.name=='nt' else 'java')
        javac=home/'bin'/('javac.exe' if os.name=='nt' else 'javac')
        if not javac.exists() or not java.exists():continue
        result=subprocess.run([str(javac),'-version'],capture_output=True,text=True)
        text=(result.stdout+result.stderr).strip()
        try:version=int(text.split()[1].split('.')[0])
        except (ValueError,IndexError):continue
        if version>=17:
            env['JAVA_HOME']=str(home)
            return java
    raise RuntimeError('JDK 17+ is required. Set JAVA_HOME to your JDK directory.')

def ensure_maven():
    name='mvn.cmd' if os.name=='nt' else 'mvn'
    for candidate in (BUILD/'maven/wrapper/dists').glob(f'*/**/bin/{name}'):
        return candidate
    installed=shutil.which(name)
    if installed:return Path(installed)
    properties={}
    for line in (ROOT/'.mvn/wrapper/maven-wrapper.properties').read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            key,value=line.split('=',1);properties[key.strip()]=value.strip()
    url=properties['distributionUrl']
    archive=TOOLS/'maven.zip';binary=TOOLS/'apache-maven-3.9.9/bin'/name
    if not binary.exists():
        download(url,archive)
        expected=properties['distributionSha256Sum']
        if hashlib.sha256(archive.read_bytes()).hexdigest()!=expected:
            raise RuntimeError('Maven distribution checksum mismatch')
        extract_zip(archive,TOOLS)
    return binary

def ensure_uv():
    binary=TOOLS/'uv/uv-0.13.6.data/scripts/uv.exe'
    if not binary.exists():
        with urllib.request.urlopen('https://pypi.org/pypi/uv/0.13.6/json',timeout=30) as response:
            metadata=json.load(response)
        entry=next(item for item in metadata['urls'] if item['filename'].endswith('win_amd64.whl'))
        archive=TOOLS/'uv.whl';download(entry['url'],archive)
        if hashlib.sha256(archive.read_bytes()).hexdigest()!=entry['digests']['sha256']:
            raise RuntimeError('uv archive checksum mismatch')
        extract_zip(archive,TOOLS/'uv')
    return binary

def setup(env):
    java=ensure_java(env)
    node=ensure_node();npm=ensure_npm();maven=ensure_maven()
    env['PATH']=str(node.parent)+os.pathsep+str(java.parent)+os.pathsep+env.get('PATH','')
    clean=safe_env(env)
    clean['npm_config_cache']=str(BUILD/'npm-cache')
    clean['npm_config_update_notifier']='false'
    py=APP/'ai/.venv'/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
    if not py.exists():
        say('Creating Python 3.11+ environment...')
        venv.EnvBuilder(with_pip=True).create(APP/'ai/.venv')
    requirements=APP/'ai/requirements.txt'
    digest=hashlib.sha256(requirements.read_bytes()).hexdigest()
    stamp=BUILD/'python-deps.sha256'
    if not stamp.exists() or stamp.read_text()!=digest:
        say('Installing AI dependencies...')
        if os.name=='nt':
            run([ensure_uv(),'pip','install','--python',py,'--cache-dir',BUILD/'uv-cache','-r',requirements],env=clean)
        else:
            run([py,'-m','pip','install','-r',requirements],env=clean)
        stamp.write_text(digest)
    package=APP/'web/package.json';lock=APP/'web/package-lock.json'
    digest=hashlib.sha256(package.read_bytes()+(lock.read_bytes() if lock.exists() else b'')).hexdigest()
    stamp=BUILD/'web-deps.sha256'
    if not stamp.exists() or stamp.read_text()!=digest or not (APP/'web/node_modules/vite/bin/vite.js').exists():
        say('Installing frontend dependencies...')
        run([node,npm,'ci' if lock.exists() else 'install','--ignore-scripts','--no-audit','--no-fund'],cwd=APP/'web',env=clean)
        digest=hashlib.sha256(package.read_bytes()+lock.read_bytes()).hexdigest()
        stamp.write_text(digest)
    return java,node,npm,maven,py

def maven_command(maven,*goals):
    return [maven,'-B','-ntp','-f',APP/'backend/pom.xml',
            '-Dmaven.repo.local='+str(APP/'backend/.build/m2'),*goals]

def port_free(port):
    with socket.socket() as sock:
        try:sock.bind(('127.0.0.1',port))
        except OSError:return False
    return True

def spawn(name,args,cwd,env):
    logs=BUILD/'logs';logs.mkdir(parents=True,exist_ok=True)
    output=(logs/(name+'.log')).open('w',encoding='utf-8')
    flags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name=='nt' else 0
    process=subprocess.Popen([str(a) for a in args],cwd=cwd,env=env,stdout=output,stderr=subprocess.STDOUT,creationflags=flags)
    CHILDREN.append((name,process));HANDLES.append(output)
    return process

def wait_ready(name,url,process):
    deadline=time.monotonic()+90
    while time.monotonic()<deadline:
        if process.poll() is not None:
            raise RuntimeError(f'{name} exited; see .build/logs/{name}.log')
        try:
            with urllib.request.urlopen(url,timeout=2) as response:
                if response.status==200:return
        except (OSError,urllib.error.URLError):pass
        time.sleep(.3)
    raise RuntimeError(f'{name} did not become ready; see .build/logs/{name}.log')

def stop():
    for name,process in reversed(CHILDREN):
        if process.poll() is None:
            if os.name=='nt':
                subprocess.run(['taskkill.exe','/PID',str(process.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            else:process.terminate()
    for _,process in CHILDREN:
        try:process.wait(timeout=10)
        except subprocess.TimeoutExpired:process.kill()
    for handle in HANDLES:handle.close()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--replay',action='store_true')
    parser.add_argument('--test',action='store_true')
    parser.add_argument('--setup-only',action='store_true')
    parser.add_argument('--no-browser',action='store_true')
    parser.add_argument('--api-port',type=int,default=8080)
    parser.add_argument('--ai-port',type=int,default=8000)
    parser.add_argument('--web-port',type=int,default=5173)
    args=parser.parse_args()
    BUILD.mkdir(parents=True,exist_ok=True)
    env=load_env()
    if args.replay or args.test:env['REPLAY']='1'
    if args.test:env['DISPATCH_WEBHOOK_URL']=''
    mode=env.get('REPLAY','auto').lower()
    live=mode=='0' or (mode=='auto' and bool(env.get('GEMINI_API_KEY','').strip()))
    if mode not in ('auto','0','1'):raise RuntimeError('REPLAY must be auto, 0 or 1 in fixer/.env')
    if not live:env['LLM_MODEL']=env.get('REPLAY_MODEL','gemini-3.8-flash')
    if live and not env.get('GEMINI_API_KEY','').strip():raise RuntimeError('Insert GEMINI_API_KEY in fixer/.env or use REPLAY=1')
    if not args.test and not args.setup_only:
        for port in (args.api_port,args.ai_port,args.web_port):
            if not port_free(port):raise RuntimeError(f'Port {port} is busy. Stop the existing service, or choose another port.')
    java,node,npm,maven,py=setup(env)
    if args.setup_only:
        say('Setup complete. Run start.cmd. Key goes in fixer/.env: GEMINI_API_KEY=...')
        return
    clean=safe_env(env)
    if args.test:
        run(maven_command(maven,'test'),env=clean)
        run([py,'-m','pytest','-q'],cwd=APP/'ai',env=clean)
        run([node,npm,'run','build'],cwd=APP/'web',env=clean)
        say('All Java/AI/frontend checks passed.')
        return
    say('Building Java backend...')
    run(maven_command(maven,'-DskipTests','package'),env=clean)
    say('Starting Fixer: '+('LIVE GEMINI' if live else 'OFFLINE REPLAY (no paid calls)'))
    if not live and env.get('LLM_MODEL','gemini-3.8-flash')!='gemini-3.8-flash':
        say('Note: shipped replay fixtures use LLM_MODEL=gemini-3.8-flash.')
    ai=spawn('ai',[py,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',args.ai_port,'--http','h11'],APP/'ai',env)
    wait_ready('ai',f'http://127.0.0.1:{args.ai_port}/health',ai)
    backend_env=clean.copy();backend_env['SERVER_PORT']=str(args.api_port);backend_env['DISPATCH_WEBHOOK_URL']=env.get('DISPATCH_WEBHOOK_URL','');backend_env['AI_BASE_URL']=f'http://127.0.0.1:{args.ai_port}'
    api=spawn('backend',[java,'-jar',APP/'backend/target/backend-0.1.0.jar'],APP/'backend',backend_env)
    wait_ready('backend',f'http://127.0.0.1:{args.api_port}/api/health',api)
    web_env=clean.copy();web_env['VITE_API_URL']=f'http://localhost:{args.api_port}';web_env['VITE_USE_MOCKS']='false'
    web=spawn('web',[node,APP/'web/node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',args.web_port,'--strictPort'],APP/'web',web_env)
    url=f'http://localhost:{args.web_port}/?api=java'
    wait_ready('web',url,web)
    say('READY: '+url)
    say('Key: '+str(APP/'.env')+' (GEMINI_API_KEY). Restart after editing.')
    say('Logs: '+str(BUILD/'logs')+' | Ctrl+C stops all three services.')
    if not args.no_browser:webbrowser.open(url)
    while True:
        for name,process in CHILDREN:
            if process.poll() is not None:raise RuntimeError(f'{name} stopped; see .build/logs/{name}.log')
        time.sleep(.5)

if __name__=='__main__':
    try:main()
    except KeyboardInterrupt:say('Stopping Fixer...')
    except Exception as exc:
        # No raw provider response or environment dump.
        say('ERROR: '+str(exc));sys.exit(1)
    finally:stop()

