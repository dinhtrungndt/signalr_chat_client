import axiosClient from './axiosClient';

const reminderApi = {
  createReminder: (data) => {
    return axiosClient.post('/reminders', data);
  },
  getReminders: (params) => {
    return axiosClient.get('/reminders', { params });
  },
  updateStatus: (id, isDone) => {
    return axiosClient.put(`/reminders/${id}/status`, { isDone });
  },
  deleteReminder: (id) => {
    return axiosClient.delete(`/reminders/${id}`);
  }
};

export default reminderApi;
