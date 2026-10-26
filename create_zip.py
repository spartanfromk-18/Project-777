import os
import shutil
import zipfile

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
STAGE_PARENT = '/tmp/staging'
STAGE_DIR = os.path.join(STAGE_PARENT, 'ScamShield-Frontend')
ZIP_PUBLIC = os.path.join(BASE_DIR, 'public', 'ScamShield-Frontend.zip')
ZIP_ROOT = os.path.join(BASE_DIR, 'ScamShield-Frontend.zip')

# Clean previous staging
if os.path.exists(STAGE_PARENT):
    shutil.rmtree(STAGE_PARENT)
os.makedirs(STAGE_DIR, exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'public'), exist_ok=True)

# Explicit allowed files ONLY
files_to_copy = [
    'README.md',
    'index.html',
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'server.ts',
    '.env.example',
    '.gitignore',
]

for f in files_to_copy:
    src = os.path.join(BASE_DIR, f)
    dst = os.path.join(STAGE_DIR, f)
    shutil.copy2(src, dst)

dirs_to_copy = ['src', 'dist']
for d in dirs_to_copy:
    src = os.path.join(BASE_DIR, d)
    dst = os.path.join(STAGE_DIR, d)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns('*.zip', '*.log', '*.webm', '*.mp4', '.DS_Store', 'node_modules'))

# Create clean ZIP files (public and root)
for zip_target in [ZIP_PUBLIC, ZIP_ROOT]:
    with zipfile.ZipFile(zip_target, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(STAGE_DIR):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, STAGE_PARENT)
                zipf.write(full_path, rel_path)

# Cleanup staging
shutil.rmtree(STAGE_PARENT, ignore_errors=True)

print(f"Clean ZIP successfully created at {ZIP_PUBLIC} ({os.path.getsize(ZIP_PUBLIC)} bytes)")
