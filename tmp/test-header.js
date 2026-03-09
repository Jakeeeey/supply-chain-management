const DIRECTUS_API = "http://goatedcodoer:8056";
const DIRECTUS_TOKEN = "AAKv73dkIV8DfAIA5vEt3eXVdIebzmBW";

async function testHeader() {
  const docNo = `TEST-CONV-${Date.now()}`;
  const headerPayload = {
    doc_no: docNo,
    type: "CONV",
    branch_id: 190,
    created_by: 24,
    posted_by: 24,
    amount: 100.50,
    remarks: "Test Conversion Header"
  };

  try {
    const res = await fetch(`${DIRECTUS_API}/items/stock_adjustment_header`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DIRECTUS_TOKEN}`
      },
      body: JSON.stringify(headerPayload)
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testHeader();
