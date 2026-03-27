const http = require('http');

function testUrl(url, label) {
  http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => { console.log(label, ":", data); });
  }).on("error", (err) => { console.log("Error: " + err.message); });
}

testUrl('http://100.81.225.79:8087/api/view-running-inventory/filter?branchName=WAREHOUSE+-+DRY22&productId=22413&current=0', 'Strictly by productId');
testUrl('http://100.81.225.79:8087/api/view-running-inventory/filter?branchName=WAREHOUSE+-+DRY22&productId=22413&productBrand=CDO&productCategory=CDO+PROMO&supplierShortcut=CDC&current=0', 'With full filters');
