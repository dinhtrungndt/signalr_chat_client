// Token được lưu trong bộ nhớ RAM (memory) - KHÔNG lưu localStorage
// Cách này ngăn chặn tấn công XSS ăn cắp token hoàn toàn
let _accessToken = null;

const tokenStorage = {
  get: () => _accessToken,
  set: (token) => { _accessToken = token; },
  clear: () => { _accessToken = null; },
};

export default tokenStorage;
