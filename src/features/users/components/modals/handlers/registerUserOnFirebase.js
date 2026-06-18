import { FIREBASE_AUTH_REGISTER_ENDPOINT } from '@/features/users/constants/endpoint';

import fetchWithTimeout from '@/utils/fetchWithTimeout';

async function registerUserOnFirebase(formData) {
  return fetchWithTimeout(FIREBASE_AUTH_REGISTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: formData.email,
      password: formData.password,
      returnSecureToken: true
    })
  }, 10000);
}

export default registerUserOnFirebase;
