import axiosClient from './axiosClient';

const noteApi = {
  createNote: (data) => {
    return axiosClient.post('/notes', data);
  },
  getNotes: (params) => {
    return axiosClient.get('/notes', { params });
  },
  deleteNote: (id) => {
    return axiosClient.delete(`/notes/${id}`);
  }
};

export default noteApi;
