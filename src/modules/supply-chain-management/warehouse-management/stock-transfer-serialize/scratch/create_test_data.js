const DIRECTUS_URL = 'http://goatedcodoer:8056';
const STATIC_TOKEN = 'AAKv73dkIV8DfAIA5vEt3eXVdIebzmBW';

async function createTestData() {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const orderNo = `ST-TEST-${timestamp}`;
  
  const testItems = [
    {
      order_no: orderNo,
      source_branch: 196, // WAREHOUSE - INDUSTRIAL (division_id: 1)
      target_branch: 242,
      product_id: 23088,
      ordered_quantity: 10,
      allocated_quantity: 10,
      received_quantity: 0,
      amount: 500.0,
      date_requested: new Date().toISOString().split('T')[0],
      lead_date: new Date().toISOString().split('T')[0],
      status: 'For Picking',
      date_encoded: new Date().toISOString(),
    },
    {
      order_no: orderNo,
      source_branch: 196,
      target_branch: 242,
      product_id: 23089,
      ordered_quantity: 5,
      allocated_quantity: 5,
      received_quantity: 0,
      amount: 250.0,
      date_requested: new Date().toISOString().split('T')[0],
      lead_date: new Date().toISOString().split('T')[0],
      status: 'For Picking',
      date_encoded: new Date().toISOString(),
    }
  ];

  console.log(`[Script] Creating test order: ${orderNo} ...`);

  try {
    const response = await fetch(`${DIRECTUS_URL}/items/stock_transfer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STATIC_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testItems)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create data: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('[Script] Successfully created test data!');
    console.log('[Script] Response IDs:', result.data.map(i => i.id));
  } catch (error) {
    console.error('[Script] Error creating data:', error.message);
  }
}

createTestData();
