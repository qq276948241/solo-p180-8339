<template>
  <div>
    <h1 class="page-title">订单管理</h1>

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
            @change="loadBookings"
          />
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">状态</label>
          <select v-model="filterStatus" class="form-select" style="min-width: 120px;">
            <option value="">全部</option>
            <option value="active">已确认</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <button class="btn btn-secondary" @click="resetFilters" style="margin-top: 24px;">
          重置
        </button>
        <button class="btn btn-primary" @click="loadBookings" style="margin-top: 24px;">
          刷新
        </button>
      </div>

      <div v-if="bookings.length > 0" style="margin-bottom: 16px; padding: 12px; background: #f4f4f5; border-radius: 6px;">
        <span style="font-size: 14px; color: #606266;">
          共 <strong>{{ filteredBookings.length }}</strong> 条订单，
          其中已确认 <strong style="color: #67c23a;">{{ activeCount }}</strong> 条，
          已取消 <strong style="color: #909399;">{{ cancelledCount }}</strong> 条
        </span>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="filteredBookings.length === 0" class="empty-state">
        暂无订单记录
      </div>

      <table v-else class="table">
        <thead>
          <tr>
            <th>日期</th>
            <th>时段</th>
            <th>座位</th>
            <th>区域</th>
            <th>预约人</th>
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
            <td>{{ b.userName }}</td>
            <td :class="b.status === 'active' ? 'status-active' : 'status-cancelled'">
              {{ b.status === 'active' ? '已确认' : '已取消' }}
            </td>
            <td>{{ formatTime(b.createdAt) }}</td>
            <td>
              <button
                v-if="b.status === 'active'"
                class="btn btn-danger btn-sm"
                :disabled="cancellingId === b.id"
                @click="cancelBooking(b)"
              >
                {{ cancellingId === b.id ? '取消中...' : '强制取消' }}
              </button>
              <span v-else-if="b.cancelledAt" style="font-size: 12px; color: #909399;">
                {{ formatTime(b.cancelledAt) }}
              </span>
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

function getToday() {
  return new Date().toISOString().split('T')[0];
}

const loading = ref(true);
const bookings = ref([]);
const filterDate = ref(getToday());
const filterStatus = ref('');
const error = ref('');
const success = ref('');
const cancellingId = ref(null);

const filteredBookings = computed(() => {
  return bookings.value.filter(b => {
    if (filterDate.value && b.date !== filterDate.value) return false;
    if (filterStatus.value && b.status !== filterStatus.value) return false;
    return true;
  });
});

const activeCount = computed(() => filteredBookings.value.filter(b => b.status === 'active').length);
const cancelledCount = computed(() => filteredBookings.value.filter(b => b.status === 'cancelled').length);

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${dateStr} (${weekdays[d.getDay()]})`;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { hour12: false });
}

function resetFilters() {
  filterDate.value = getToday();
  filterStatus.value = '';
  loadBookings();
}

async function loadBookings() {
  loading.value = true;
  error.value = '';
  try {
    const res = await bookingsApi.all(filterDate.value);
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

async function cancelBooking(booking) {
  const msg = `确定要强制取消 ${booking.userName} 的预约吗？\n座位：${booking.seatLabel}，${booking.date} ${booking.timeSlotLabel}`;
  if (!confirm(msg)) return;
  cancellingId.value = booking.id;
  error.value = '';
  success.value = '';
  try {
    const res = await bookingsApi.cancel(booking.id);
    if (res.success) {
      success.value = `已取消 ${booking.userName} 的预约`;
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
