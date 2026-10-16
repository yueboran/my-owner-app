import socket
import os
import sys
import subprocess

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def find_free_port(start_port: int, end_port: int) -> int:
    for port in range(start_port, end_port + 1):
        if not is_port_in_use(port):
            return port
    return -1

def main():
    print("正在扫描可用端口...")
    port = find_free_port(8000, 8999)
    if port == -1:
        print("未找到可用端口(8000-8999被占满)")
        sys.exit(1)
        
    os.environ["PORT"] = str(port)
    print(f"Python 后端实际使用端口: {port}")
    
    # 启动 uvicorn
    try:
        # 使用 sys.executable 确保使用当前的 python 环境（即使是通过 uv run 调用的）
        subprocess.run([sys.executable, "-m", "uvicorn", "main:app", "--port", str(port), "--host", "0.0.0.0"], check=True)
    except KeyboardInterrupt:
        print("\n服务器已停止。")
    except subprocess.CalledProcessError as e:
        print(f"启动服务器失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # 为了能让 backend.main 被正确导入，我们需要将当前目录的上级目录加入 sys.path
    # 这样以 module 形式启动就不会有导入错误
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    main()
