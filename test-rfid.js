async function explore() {
  const headers = { 'Authorization': `Bearer AAKv73dkIV8DfAIA5vEt3eXVdIebzmBW` };
  try {
    const url = 'http://goatedcodoer:8056/items/consolidator_rfid_mappings?fields=id,rfid_tag_epc,detail_id.product_id&limit=-1';
    console.time('fetch');
    const rfidRes = await fetch(url, { headers }).then(r => r.json());
    console.timeEnd('fetch');
    console.log('Got records:', rfidRes.data.length);
  } catch(e) { console.error(e); }
}
explore();
