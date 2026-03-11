const axios = require('axios');
(async()=>{
  try{
    const res = await axios.post('http://localhost:5000/api/auth/login',{ email:'testuser+cli@example.com', password:'Password123!' }, { timeout: 5000 });
    console.log('login status', res.status);
    console.log('login data', res.data);
  }catch(err){
    if(err.response) console.error('status', err.response.status, err.response.data);
    else console.error('error', err.message);
    process.exit(1);
  }
})();
