<template>
  <div class="login-page">
    <div class="login-card">
      <h2 class="login-title">自习室座位预约系统</h2>
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input
            v-model="username"
            class="form-input"
            type="text"
            placeholder="请输入用户名"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="password"
            class="form-input"
            type="password"
            placeholder="请输入密码"
            required
          />
        </div>
        <button
          class="btn btn-primary"
          type="submit"
          style="width: 100%; padding: 12px; font-size: 16px;"
          :disabled="loading"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #ebeef5;">
        <p style="font-size: 12px; color: #909399; margin-bottom: 8px;">测试账户：</p>
        <p style="font-size: 12px; color: #606266; line-height: 1.8;">
          管理员：admin / admin123<br />
          普通用户：zhangsan / 123456<br />
          普通用户：lisi / 123456<br />
          普通用户：wangwu / 123456
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi, setToken, setUser } from '../api';

const router = useRouter();
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    const res = await authApi.login(username.value, password.value);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      router.push('/');
    } else {
      error.value = res.message || '登录失败';
    }
  } catch (e) {
    error.value = e.message || '登录失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}
</script>
