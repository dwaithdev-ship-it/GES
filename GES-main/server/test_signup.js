const axios = require('axios');

(async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/signup', {
      email: 'testuser+cli@example.com',
      password: 'Password123!',
      firstName: 'CLI',
      lastName: 'User'
    }, { timeout: 5000 });
    console.log('status', res.status);
    console.log('data', res.data);
  } catch (err) {
    if (err.response) {
      console.error('status', err.response.status, 'data', err.response.data);
    } else {
      console.error('error', err.message);
    }
    process.exit(1);
  }
})();
