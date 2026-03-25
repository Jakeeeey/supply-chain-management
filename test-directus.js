const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k) acc[k.trim()] = v.join('=').trim().replace(/^"|"$/g, '');
  return acc;
}, {});

async function test() {
  const url = env.NEXT_PUBLIC_API_BASE_URL + '/items/unfulfilled_sales_transaction_rfid';
  console.log('Testing payload to', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.DIRECTUS_STATIC_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        unfulfilled_sales_transaction_detail_id: 1, // dummy id
        rfid_tag: 'TEST-TAG-12345'
      })
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.text());
  } catch (err) {
    console.error(err);
  }
}
test();
