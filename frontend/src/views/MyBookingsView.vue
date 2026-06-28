<template>
  <div>
    <h1 class="page-title">我的预约</h1>

    <div v-if="error" class="alert alert-error" @click="error = ''">{{ error }}</div>
    <div v-if="success" class="alert alert-success" @click="success = ''">{{ success }}</div>

    <div class="card">
      <div class="filter-bar">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">筛选日期</label>
          <input
            v-model="filterDate"
            type="date"
            class="form-input"
            style="min-width: 180px;"
          />
        </div>
        <button class="btn btn-secondary" @click="filterDate = ''" style="margin-top: 24px;">
          清除筛选
        </button>
        <button class="btn btn-primary" @click="loadBookings" style="margin-top: 24px;">
          刷新
        </button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="bookings.length === 0" class="empty-state">
        暂无预约记录
      </div>

      <table v-else class="table">
        <thead>
          <tr>
            <th>日期</th>
            <th>时段</th>
            <th>座位</th>
            <th>区域</th>
            <th>状态</th>
            <th>预约时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in filteredBookings" :key="b.id">
            <td>{{ formatDate(b.date) }}</td>
            <td>{{ b.timeSlotLabel }} ({{ b.timeSlotStart }} - {{ b.timeSlotEnd }})</td>
            <td><strong>{{ b.seatLabel }}</strong></td>
            <td>{{ b.zoneName }}</td>
            <td :class="b.status === 'active' ? 'status-active' : 'status-cancelled'">
              {{ b.status === 'active' ? '已确认' : '已取消' }}
            </td>
            <td>{{ formatTime(b.createdAt) }}</td>
            <td>
              <button
                v-if="b.status === 'active'"
                class="btn btn-danger btn-sm"
                :disabled="cancellingId === b.id"
                @click="cancelBooking(b.id)"
              >
                {{ cancellingId === b.id ? '取消中...' : '取消预约' }}
              </button>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { bookingsApi } from '../api';

const loading = ref(true);
const bookings = ref([]);
const filterDate = ref('');
const error = ref('');
const success = ref('');
const cancellingId = ref(null);

const filteredBookings = computed(() => {
  if (!filterDate.value) return bookings.value;
  return bookings.value.filter(b => b.date === filterDate.value);
});

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${dateStr} (${weekdays[d.getDay()]})`;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { hour12: false });
}

async function loadBookings() {
  loading.value = true;
  error.value = '';
  try {
    const res = await bookingsApi.mine();
    if (res.success) {
      bookings.value = res.data;
    } else {
      error.value = res.message || '加载失败';
    }
  } catch (e) {
    error.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

async function cancelBooking(id) {
  if (!confirm('确定要取消该预约吗？')) return;
  cancellingId.value = id;
  error.value = '';
  success.value = '';
  try {
    const res = await bookingsApi.cancel(id);
    if (res.success) {
      success.value = '预约已取消';
      await loadBookings();
    } else {
      error.value = res.message || '取消失败';
    }
  } catch (e) {
    error.value = e.message || '取消失败';
  } finally {
    cancellingId.value = null;
  }
}

onMounted(loadBookings);
</script>
