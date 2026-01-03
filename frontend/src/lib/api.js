import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${API_URL}/api`;

class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const response = await axios.post(`${API}/auth/refresh`, {
                refresh_token: refreshToken,
              });
              const { access_token, refresh_token } = response.data;
              localStorage.setItem('access_token', access_token);
              localStorage.setItem('refresh_token', refresh_token);
              error.config.headers.Authorization = `Bearer ${access_token}`;
              return this.client.request(error.config);
            } catch (refreshError) {
              localStorage.clear();
              window.location.href = '/login';
            }
          } else {
            localStorage.clear();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email, password) {
    const response = await this.client.post('/auth/login', { email, password });
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    return response.data;
  }

  async register(userData) {
    return this.client.post('/auth/register', userData);
  }

  async logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      await this.client.post('/auth/logout', { refresh_token: refreshToken });
    }
    localStorage.clear();
  }

  // User
  async getCurrentUser() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async updateUser(data) {
    const response = await this.client.put('/users/me', data);
    return response.data;
  }

  // Courses
  async getCourses() {
    const response = await this.client.get('/courses');
    return response.data;
  }

  async createCourse(data) {
    const response = await this.client.post('/courses', data);
    return response.data;
  }

  async updateCourse(id, data) {
    const response = await this.client.put(`/courses/${id}`, data);
    return response.data;
  }

  async deleteCourse(id) {
    await this.client.delete(`/courses/${id}`);
  }

  // Tasks
  async getTasks(params) {
    const response = await this.client.get('/tasks', { params });
    return response.data;
  }

  async createTask(data) {
    const response = await this.client.post('/tasks', data);
    return response.data;
  }

  async updateTask(id, data) {
    const response = await this.client.put(`/tasks/${id}`, data);
    return response.data;
  }

  async deleteTask(id) {
    await this.client.delete(`/tasks/${id}`);
  }

  async completeTask(id, actualMinutes) {
    const response = await this.client.post(`/tasks/${id}/complete`, {
      actual_minutes: actualMinutes,
    });
    return response.data;
  }

  async predictTaskETA(id) {
    const response = await this.client.post(`/tasks/${id}/eta/predict`);
    return response.data;
  }

  // Availability
  async getAvailabilityRules() {
    const response = await this.client.get('/availability/rules');
    return response.data;
  }

  async createAvailabilityRule(data) {
    const response = await this.client.post('/availability/rules', data);
    return response.data;
  }

  // Schedule
  async generateSchedule(data) {
    const response = await this.client.post('/schedule/generate', data);
    return response.data;
  }

  async replanSchedule(data) {
    const response = await this.client.post('/schedule/replan', data);
    return response.data;
  }

  async getWeeklySchedule(date) {
    const response = await this.client.get('/schedule/week', {
      params: { date },
    });
    return response.data;
  }

  async getDailySchedule(date) {
    const response = await this.client.get('/schedule/day', {
      params: { date },
    });
    return response.data;
  }

  // Analytics
  async getAnalyticsSummary(from, to) {
    const response = await this.client.get('/analytics/summary', {
      params: { from_date: from, to_date: to },
    });
    return response.data;
  }

  async getBurndownChart(courseId) {
    const response = await this.client.get('/analytics/burndown', {
      params: { course_id: courseId },
    });
    return response.data;
  }

  // AI Coach
  async getConversations() {
    const response = await this.client.get('/coach/conversations');
    return response.data;
  }

  async getCoachRateLimit() {
    const response = await this.client.get('/coach/rate-limit');
    return response.data;
  }

  async createConversation(data) {
    const response = await this.client.post('/coach/conversations', data);
    return response.data;
  }

  async updateConversation(conversationId, data) {
    const response = await this.client.put(`/coach/conversations/${conversationId}`, data);
    return response.data;
  }

  async deleteConversation(conversationId) {
    const response = await this.client.delete(`/coach/conversations/${conversationId}`);
    return response.data;
  }

  async getMessages(conversationId) {
    const response = await this.client.get(
      `/coach/conversations/${conversationId}/messages`
    );
    return response.data;
  }

  async sendMessage(conversationId, content) {
    const response = await this.client.post(
      `/coach/conversations/${conversationId}/messages`,
      { content }
    );
    return response.data;
  }

  // Flashcards
  async generateFlashcards(text) {
    const response = await this.client.post('/flashcards/generate', { text });
    return response.data;
  }

  // Pomodoro
  async createPomodoroSession(data) {
    const response = await this.client.post('/pomodoro/sessions', data);
    return response.data;
  }

  async getTodayPomodoroCount() {
    const response = await this.client.get('/pomodoro/sessions/today');
    return response.data;
  }
}

export const api = new ApiClient();
