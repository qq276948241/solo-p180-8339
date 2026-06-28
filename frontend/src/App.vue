<template>
  <div>
    <div v-if="isLoggedIn">
      <nav class="navbar">
        <div class="navbar-brand">自习室座位预约</div>
        <div class="navbar-links">
          <router-link to="/">座位预约</router-link>
          <router-link to="/my-bookings">我的预约</router-link>
          <router-link v-if="isAdmin" to="/admin">订单管理</router-link>
          <div class="user-info">
            <span class="user-name">{{ currentUser?.name }}</span>
            <span :class="['badge', isAdmin ? 'badge-admin' : 'badge-user']">
              {{ isAdmin ? '管理员' : '普通用户' }}
            </span>
            <button class="btn btn-secondary btn-sm" @click="handleLogout">退出</button>
          </div>
        </div>
      </nav>
      <div class="container">
        <router-view />
      </div>
    </div>
    <router-view v-else />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authApi, getToken, setToken, setUser, getUser } from './api';

const router = useRouter();
const currentUser = ref(null);
const isLoggedIn = computed(() => !!currentUser.value);
const isAdmin = computed(() => currentUser.value?.role === 'admin');

async function loadUser() {
  if (!getToken()) {
    currentUser.value = null;
    return;
  }
  const cached = getUser();
  if (cached) {
    currentUser.value = cached;
  }
  try {
    const res = await authApi.me();
    if (res.success) {
      currentUser.value = res.user;
      setUser(res.user);
    }
  } catch (e) {
    currentUser.value = null;
  }
}

async function handleLogout() {
  try {
    await authApi.logout();
  } catch (e) {}
  setToken(null);
  setUser(null);
  currentUser.value = null;
  router.push('/login');
}

onMounted(loadUser);
</script>
