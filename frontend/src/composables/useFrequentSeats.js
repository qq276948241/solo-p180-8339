import { ref } from 'vue';
import { bookingsApi, getUser } from '../api';

export function useFrequentSeats() {
  const frequentSeatIds = ref(new Set());
  const loading = ref(false);
  const error = ref(null);
  const isAdmin = ref(false);

  function updateUserState() {
    const user = getUser();
    isAdmin.value = user?.role === 'admin';
    return user;
  }

  async function refresh() {
    const user = updateUserState();

    if (!user) {
      frequentSeatIds.value = new Set();
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const res = await bookingsApi.frequentSeats();
      if (res.success) {
        frequentSeatIds.value = new Set(res.data.map(item => item.seatId));
      }
    } catch (e) {
      error.value = e.message || '加载常坐数据失败';
    } finally {
      loading.value = false;
    }
  }

  function isFrequent(seatId) {
    return frequentSeatIds.value.has(seatId);
  }

  function clear() {
    frequentSeatIds.value = new Set();
    isAdmin.value = false;
    loading.value = false;
    error.value = null;
  }

  return {
    frequentSeatIds,
    loading,
    error,
    isAdmin,
    refresh,
    isFrequent,
    clear
  };
}
