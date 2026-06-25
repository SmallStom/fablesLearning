"""LLM 调用代理：用 httpx 异步调用 OpenAI 兼容 API"""

import httpx
import json
import re
import sys
from typing import AsyncGenerator
from dataclasses import dataclass


@dataclass
class LLMConfig:
    """LLM 配置"""
    base_url: str
    api_key: str
    model: str


def clean_think_tags(text: str) -> str:
    """清理 Qwen3 的 think 标签"""
    # 匹配 think 标签及其内容（闭合和未闭合）
    pattern1 = re.compile(r'<' + r'think>[\s\S]*?</' + r'think>', re.IGNORECASE)
    pattern2 = re.compile(r'<' + r'think>[\s\S]*$', re.IGNORECASE)
    text = pattern1.sub('', text)
    text = pattern2.sub('', text)
    return text.strip()


async def stream_chat_completion(
    config: LLMConfig,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 4096,
    temperature: float = 0.8,
) -> AsyncGenerator[str, None]:
    """流式调用 OpenAI 兼容接口，逐个 yield delta content。"""
    url = f"{config.base_url.rstrip('/')}/chat/completions"
    headers = {
        "Content-Type": "application/json",
    }
    if config.api_key:
        headers["Authorization"] = f"Bearer {config.api_key}"

    body = {
        "model": config.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": True,
        # 关闭 Qwen3 思考模式（vLLM 用 chat_template_kwargs）
        "chat_template_kwargs": {
            "enable_thinking": False,
        },
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
        async with client.stream("POST", url, json=body, headers=headers) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                raise RuntimeError(f"LLM 请求失败 ({response.status_code}): {error_text.decode()[:500]}")

            buffer = ""
            async for chunk in response.aiter_text():
                buffer += chunk
                lines = buffer.split("\n")
                buffer = lines.pop()

                for line in lines:
                    line = line.strip()
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        return
                    try:
                        parsed = json.loads(data)
                        delta = parsed.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        if delta:
                            yield delta
                    except json.JSONDecodeError:
                        continue


async def chat_completion(
    config: LLMConfig,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 1500,
    temperature: float = 0.5,
) -> str:
    """非流式调用 OpenAI 兼容接口"""
    url = f"{config.base_url.rstrip('/')}/chat/completions"
    headers = {
        "Content-Type": "application/json",
    }
    if config.api_key:
        headers["Authorization"] = f"Bearer {config.api_key}"

    body = {
        "model": config.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
        # 关闭 Qwen3 思考模式（vLLM 用 chat_template_kwargs）
        "chat_template_kwargs": {
            "enable_thinking": False,
        },
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
        response = await client.post(url, json=body, headers=headers)
        if response.status_code != 200:
            raise RuntimeError(f"LLM 请求失败 ({response.status_code}): {response.text[:500]}")
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return clean_think_tags(content)
