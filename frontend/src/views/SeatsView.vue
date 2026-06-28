<template>
  <div>
    <h1 class="page-title">座位预约</h1>

    <div v-if="error" class="alert alert-error" @click="error = ''">{{ error }}</div>
    <div v-if="success" class="alert alert-success" @click="success = ''">{{ success }}</div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="card">
      <div class="date-picker-row">
        <div class="form-group" style="margin-bottom: 0; min-width: 200px;">
          <label class="form-label">预约日期</label>
          <input
            v-model="selectedDate"
            type="date"
            class="form-input"
            @change="loadAvailability"
          />
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <label class="form-label">选择时段</label>
        <div class="slot-tabs">
          <button
            v-for="slot in seatConfig.timeSlots"
            :key="slot.id"
            :class="['slot-tab', selectedSlot === slot.id ? 'slot-tab-active' : '']"
            @click="selectSlot(slot.id)"
          >
            {{ slot.label }} ({{ slot.start }} - {{ slot.end }})
          </button>
        </div>
      </div>

      <div class="seat-layout">
        <div v-for="zone in seatConfig.zones" :key="zone.id">
          <div
            class="zone-label"
            :style="{ background: zone.color, color: zone.textColor }"
          >
            {{ zone.name }}
          </div>
          <div
            class="seats-grid"
            :style="{ gridTemplateColumns: `repeat(${getZoneColCount(zone.id)}, 80px)` }"
          >
            <div
              v-for="seat in getSeatsByZone(zone.id)"
              :key="seat.id"
              :class="[
                'seat',
                getSeatStatusClass(seat.id)
              ]"
              :title="getSeatTooltip(seat.id)"
              @click="toggleSeat(seat.id)"
            >
              <span style="font-size: 16px;">{{ seat.label }}</span>
              <span style="font-size: 11px; margin-top: 2px;">
                {{ getSeatStatusText(seat.id) }}
              </span>
            </div>
          </div>
        </div>

        <div class="seat-legend">
          <div class="legend-item">
            <span class="legend-color" style="background: #ecf5ff; border-color: #d9ecff;"></span>
            <span>可预约</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #67c23a; border-color: #85ce61;"></span>
            <span>已选中</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #e1f3d8; border-color: #c2e7b0;"></span>
            <span>我已预约</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #fff7e6; border-color: #ffd591;"></span>
            <span>我的常坐位</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #f4f4f5; border-color: #e9e9eb;"></span>
            <span>已被占用</span>
          </div>
        </div>
      </div>

      <div v-if="selectedSeat" class="booking-summary">
        <h3>预约信息确认</h3>
        <div class="summary-row">
          <span class="summary-label">日期</span>
          <span class="summary-value">{{ formatDate(selectedDate) }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">时段</span>
          <span class="summary-value">{{ getSelectedSlotLabel() }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">座位</span>
          <span class="summary-value">
            {{ getSelectedSeatLabel() }} ({{ getSelectedSeatZone() }})
          </span>
        </div>
        <button
          class="btn btn-primary"
          style="width: 100%; margin-top: 16px; padding: 12px;"
          :disabled="submitting"
          @click="submitBooking"
        >
          {{ submitting ? '提交中...' : '确认预约' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { seatsApi, bookingsApi, getUser } from '../api';

const loading = ref(true);
const submitting = ref(false);
const error = ref('');
const success = ref('');
const seatConfig = ref({ zones: [], seats: [], timeSlots: [] });
const availability = ref({});
const selectedDate = ref(getToday());
const selectedSlot = ref('');
const selectedSeat = ref(null);
const frequentSeatIds = ref(new Set());

function getToday() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${dateStr} (${weekdays[d.getDay()]})`;
}

function getSeatsByZone(zoneId) {
  return seatConfig.value.seats.filter(s => s.zone === zoneId);
}

function getZoneColCount(zoneId) {
  const seats = getSeatsByZone(zoneId);
  const maxX = Math.max(...seats.map(s => s.x), 1);
  return maxX;
}

function getSeatAvailability(seatId) {
  if (!availability.value[seatId]) return { available: true };
  return availability.value[seatId][selectedSlot.value] || { available: true };
}

function isMyBooking(seatId) {
  const avail = getSeatAvailability(seatId);
  return !avail.available && avail.bookedBy === getUser()?.id;
}

function isFrequentSeat(seatId) {
  return frequentSeatIds.value.has(seatId);
}

function getSeatStatusClass(seatId) {
  if (selectedSeat.value === seatId) return 'seat-selected';
  if (isMyBooking(seatId)) return 'seat-mine';
  if (!getSeatAvailability(seatId).available) return 'seat-booked';
  if (isFrequentSeat(seatId)) return 'seat-frequent';
  return 'seat-available';
}

function getSeatStatusText(seatId) {
  if (isMyBooking(seatId)) return '我的预约';
  if (!getSeatAvailability(seatId).available) return '已占';
  if (selectedSeat.value === seatId) return '已选中';
  if (isFrequentSeat(seatId)) return '常坐';
  return '空闲';
}

function getSeatTooltip(seatId) {
  if (isMyBooking(seatId)) return '该座位您已预约';
  if (!getSeatAvailability(seatId).available) return '该座位已被他人预约';
  if (selectedSeat.value === seatId) return '点击取消选择';
  if (isFrequentSeat(seatId)) return '您的常坐座位，点击选择';
  return '点击选择该座位';
}

function selectSlot(slotId) {
  selectedSlot.value = slotId;
  selectedSeat.value = null;
}

function toggleSeat(seatId) {
  if (!selectedSlot.value) {
    error.value = '请先选择时段';
    return;
  }
  const avail = getSeatAvailability(seatId);
  if (!avail.available) {
    if (avail.bookedBy === getUser()?.id) {
      error.value = '该座位您已预约，可在"我的预约"中管理';
    } else {
      error.value = '该座位已被占用';
    }
    return;
  }
  selectedSeat.value = selectedSeat.value === seatId ? null : seatId;
}

function getSelectedSlotLabel() {
  const slot = seatConfig.value.timeSlots.find(t => t.id === selectedSlot.value);
  return slot ? `${slot.label} (${slot.start} - ${slot.end})` : '';
}

function getSelectedSeatLabel() {
  const seat = seatConfig.value.seats.find(s => s.id === selectedSeat.value);
  return seat ? seat.label : '';
}

function getSelectedSeatZone() {
  const seat = seatConfig.value.seats.find(s => s.id === selectedSeat.value);
  if (!seat) return '';
  const zone = seatConfig.value.zones.find(z => z.id === seat.zone);
  return zone ? zone.name : '';
}

async function loadFrequentSeats() {
  try {
    const res = await bookingsApi.frequentSeats();
    if (res.success) {
      frequentSeatIds.value = new Set(res.data.map(item => item.seatId));
    }
  } catch (e) {
  }
}

async function loadAvailability() {
  if (!selectedDate.value) return;
  try {
    loading.value = true;
    const res = await seatsApi.getAvailability(selectedDate.value);
    if (res.success) {
      seatConfig.value = res.data.seatConfig;
      availability.value = res.data.availability;
      if (!selectedSlot.value && seatConfig.value.timeSlots.length > 0) {
        selectedSlot.value = seatConfig.value.timeSlots[0].id;
      }
      selectedSeat.value = null;
    }
  } catch (e) {
    error.value = e.message || '加载座位状态失败';
  } finally {
    loading.value = false;
  }
}

async function submitBooking() {
  if (!selectedSeat.value || !selectedSlot.value || !selectedDate.value) return;
  error.value = '';
  success.value = '';
  submitting.value = true;
  try {
    const res = await bookingsApi.create(selectedSeat.value, selectedDate.value, selectedSlot.value);
    if (res.success) {
      success.value = '预约成功！';
      selectedSeat.value = null;
      await loadAvailability();
      await loadFrequentSeats();
    } else {
      error.value = res.message || '预约失败';
    }
  } catch (e) {
    error.value = e.message || '预约失败，请稍后重试';
    await loadAvailability();
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadAvailability(), loadFrequentSeats()]);
});
</script>
