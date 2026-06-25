"""速率限制器（独立模块，避免循环导入）"""

# 修复 Windows 上 starlette Config 用 GBK 读取 .env 导致 UnicodeDecodeError
import starlette.config

_original_read_file = starlette.config.Config._read_file


def _read_file_utf8(self, file_name):
    import os
    file_values = {}
    if not os.path.isabs(file_name):
        file_name = os.path.join(os.getcwd(), file_name)
    try:
        with open(file_name, encoding='utf-8') as input_file:
            for line in input_file.readlines():
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                file_values[key.strip()] = value.strip().strip('"\'')
    except OSError:
        pass
    return file_values


starlette.config.Config._read_file = _read_file_utf8

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
