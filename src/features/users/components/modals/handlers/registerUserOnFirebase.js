import { FIREBASE_AUTH_REGISTER_ENDPOINT } from '@/features/users/constants/endpoint';

async function registerUserOnFirebase(formData) {
  return fetch(FIREBASE_AUTH_REGISTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: formData.email,
      password: formData.password,
      returnSecureToken: true
    })
  });
}

export default registerUserOnFirebase;
