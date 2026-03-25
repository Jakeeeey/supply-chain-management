const fs = require('fs');

async function testDirectus() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://goatedcodoer:8056';
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN || 'AAKv73dkIV8DfAIA5vEt3eXVdIebzmBW';

  console.log('Fetching item 18252...');
  try {
    const res = await fetch(`${baseUrl}/items/stock_transfer/18252`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${staticToken}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Trying manual PATCH to set status = "invalid_xyz"...');
    const patchRes = await fetch(`${baseUrl}/items/stock_transfer/18252`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${staticToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: "invalid_xyz" })
    });
    
    const patchData = await patchRes.json();
    console.log('PATCH response (invalid):', JSON.stringify(patchData, null, 2));

    console.log('Trying manual PATCH with status = "requested"...');
    const patchRes2 = await fetch(`${baseUrl}/items/stock_transfer/18252`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${staticToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: "requested" })
      });
      const patchData2 = await patchRes2.json();
      console.log('PATCH requested response:', JSON.stringify(patchData2, null, 2));

      console.log('Trying manual PATCH with status = "Dispatched"...');
      const patchRes4 = await fetch(`${baseUrl}/items/stock_transfer/18252`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${staticToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: "Dispatched" })
        });
        const patchData4 = await patchRes4.json();
        console.log('PATCH Dispatched response:', JSON.stringify(patchData4, null, 2));

  } catch (err) {
    console.error('Error:', err);
  }
}

testDirectus();
