async function debugData() {
  const baseUrl = "http://goatedcodoer:8056";
  const token = "AAKv73dkIV8DfAIA5vEt3eXVdIebzmBW";

  try {
    const response = await fetch(
      `${baseUrl}/items/dispatch_plan?fields=status,dispatch_no,total_amount,cluster_id&limit=100`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const result = await response.json();
    const data = result.data || [];
    console.log("Total records fetched:", data.length);

    const agregates = data.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      acc[d.status + "_sum"] =
        (acc[d.status + "_sum"] || 0) + Number(d.total_amount || 0);
      return acc;
    }, {});
    console.log("Aggregates (limit 100):", JSON.stringify(agregates, null, 2));

    const clusters = [...new Set(data.map((d) => d.cluster_id))];
    console.log("Unique Cluster IDs:", clusters);
  } catch (e) {
    console.error("Fetch Error:", e.message);
  }
}
debugData();
