import os
from pathlib import Path

def replace_in_files(directory):
    for path in Path(directory).rglob('*'):
        if path.is_file() and path.suffix in ['.tsx', '.ts', '.css', '.html']:
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content.replace('.png', '.webp').replace('.jpg', '.webp').replace('.jpeg', '.webp')
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated: {path.name}")
            except Exception as e:
                print(f"Error processing {path.name}: {e}")

if __name__ == "__main__":
    src_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "src")
    replace_in_files(src_dir)
