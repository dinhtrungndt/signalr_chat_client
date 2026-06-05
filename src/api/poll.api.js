import axiosClient from './axiosClient';

const pollApi = {
  createPoll: (data) => {
    return axiosClient.post('/polls', data);
  },
  getPolls: (groupId) => {
    return axiosClient.get('/polls', { params: { groupId } });
  },
  votePoll: (id, optionIds) => {
    return axiosClient.post(`/polls/${id}/vote`, { optionIds });
  },
  addOption: (id, content) => {
    return axiosClient.post(`/polls/${id}/options`, { content });
  },
  closePoll: (id) => {
    return axiosClient.put(`/polls/${id}/close`);
  }
};

export default pollApi;
