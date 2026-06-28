const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

function setUser(user) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = { success: false, message: '网络错误' };
  }

  if (res.status === 401) {
    setToken(null);
    setUser(null);
    if (window.location.hash !== '#/login') {
      window.location.hash = '#/login';
    }
    throw new Error(data.message || '未登录');
  }

  return data;
}

export const authApi = {
  login(username, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },
  logout() {
    return request('/auth/logout', { method: 'POST' });
  },
  me() {
    return request('/auth/me');
  }
};

export const seatsApi = {
  getConfig() {
    return request('/seats');
  },
  getAvailability(date) {
    return request(`/seats/availability?date=${date}`);
  }
};

export const bookingsApi = {
  create(seatId, date, timeSlotId) {
    return request('/bookings', {
      method: 'POST',
      body: JSON.stringify({ seatId, date, timeSlotId })
    });
  },
  mine(date) {
    const url = date ? `/bookings/mine?date=${date}` : '/bookings/mine';
    return request(url);
  },
  all(date) {
    const url = date ? `/bookings/all?date=${date}` : '/bookings/all';
    return request(url);
  },
  cancel(id) {
    return request(`/bookings/${id}/cancel`, { method: 'POST' });
  },
  frequentSeats() {
    return request('/bookings/frequent-seats');
  }
};

export { getToken, setToken, getUser, setUser };
