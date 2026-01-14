import { auth } from 'auth/firebase';

const getAuthHeader = async () => {
  const token = await auth.currentUser?.getIdToken?.();
  return token ? `Bearer ${token}` : '';
};

const fetchWithAuth = async (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  const authHeader = await getAuthHeader();
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }

  return fetch(input, { ...init, headers });
};

export { fetchWithAuth };
