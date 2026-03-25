const DIRECTUS_BASE = "http://goatedcodoer:8056".replace(/\/+$/, "");
const DIRECTUS_TOKEN = "AAKv73dkIV8DfAIA5vEt3eXVdIebzmBW";

async function test() {
    const headers = { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DIRECTUS_TOKEN}`
    };

    try {
        console.log("Listing ALL fields for sales_order...");
        const res = await fetch(`${DIRECTUS_BASE}/fields/sales_order`, { headers });
        const data = await res.json();
        const customerFields = data.data.filter(f => f.field.toLowerCase().includes("customer"));
        console.log("Customer related fields in sales_order:", JSON.stringify(customerFields, null, 2));

    } catch (err) {
        console.error("Test failed:", err);
    }
}

test();
