import { describe, it, expect } from 'vitest';
import { isLocalDeployment, isLLMAvailable } from './llmService';
import type { LLMConfig } from '@/types';

const BASE_CONFIG: LLMConfig = {
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'sk-test',
  model: 'gpt-4o-mini',
  usePlatformLLM: false,
};

describe('isLocalDeployment', () => {
  it('识别 localhost 为本地部署', () => {
    expect(isLocalDeployment({ ...BASE_CONFIG, baseURL: 'http://localhost:8000/v1' })).toBe(true);
    expect(isLocalDeployment({ ...BASE_CONFIG, baseURL: 'http://127.0.0.1:8000/v1' })).toBe(true);
  });

  it('识别 192.168.x.x 为本地部署', () => {
    expect(isLocalDeployment({ ...BASE_CONFIG, baseURL: 'http://192.168.1.100:8012/v1' })).toBe(true);
  });

  it('识别 10.x.x.x 为本地部署', () => {
    expect(isLocalDeployment({ ...BASE_CONFIG, baseURL: 'http://10.0.0.5:8012/v1' })).toBe(true);
  });

  it('识别 172.16-31.x.x 为本地部署', () => {
    expect(isLocalDeployment({ ...BASE_CONFIG, baseURL: 'http://172.16.0.1:8012/v1' })).toBe(true);
    expect(isLocalDeployment({ ...BASE_CONFIG, baseURL: 'http://172.31.255.1:8012/v1' })).toBe(true);
  });

  it('识别公网地址不是本地部署', () => {
    expect(isLocalDeployment({ ...BASE_CONFIG, baseURL: 'https://api.openai.com/v1' })).toBe(false);
    expect(isLocalDeployment({ ...BASE_CONFIG, baseURL: 'https://api.deepseek.com/v1' })).toBe(false);
  });

  it('非法 URL 返回 false', () => {
    expect(isLocalDeployment({ ...BASE_CONFIG, baseURL: 'not-a-url' })).toBe(false);
  });
});

describe('isLLMAvailable', () => {
  it('平台 LLM 始终可用', () => {
    expect(isLLMAvailable({ ...BASE_CONFIG, usePlatformLLM: true, apiKey: '' })).toBe(true);
  });

  it('BYOK 缺少 baseURL 不可用', () => {
    expect(isLLMAvailable({ ...BASE_CONFIG, usePlatformLLM: false, baseURL: '' })).toBe(false);
  });

  it('BYOK 缺少 model 不可用', () => {
    expect(isLLMAvailable({ ...BASE_CONFIG, usePlatformLLM: false, model: '' })).toBe(false);
  });

  it('BYOK 公网地址缺少 apiKey 不可用', () => {
    expect(isLLMAvailable({ ...BASE_CONFIG, usePlatformLLM: false, apiKey: '' })).toBe(false);
  });

  it('BYOK 本地部署可免 apiKey', () => {
    expect(
      isLLMAvailable({
        ...BASE_CONFIG,
        usePlatformLLM: false,
        baseURL: 'http://localhost:8012/v1',
        apiKey: '',
      })
    ).toBe(true);
  });

  it('BYOK 公网地址配置完整可用', () => {
    expect(isLLMAvailable(BASE_CONFIG)).toBe(true);
  });
});
