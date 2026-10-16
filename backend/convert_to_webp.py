import os
from PIL import Image
from pathlib import Path

def convert_to_webp(directory):
    for path in Path(directory).rglob('*'):
        if path.is_file() and path.suffix.lower() in ['.png', '.jpg', '.jpeg']:
            webp_path = path.with_suffix('.webp')
            try:
                # 转换为 RGB 模式，因为某些 RGBA 格式转 webp 可能有兼容问题，但 webp 支持 alpha 通道。
                # 所以我们直接保存即可。
                with Image.open(path) as img:
                    img.save(webp_path, 'webp', quality=85)
                print(f"Converted: {path.name} -> {webp_path.name}")
                os.remove(path)
            except Exception as e:
                print(f"Failed to convert {path.name}: {e}")

if __name__ == "__main__":
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    convert_to_webp(data_dir)
