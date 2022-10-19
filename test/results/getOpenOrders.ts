// buy, limit
const getOpenOrders_spot = [
 {
  "accountId": "5842873878",
  "symbol": "BTCUSDT_SPBL",
  "orderId": "966527926203224064",
  "clientOrderId": "14ed1116-35e0-4778-83ca-675501d3c7d6",
  "price": "17550.000000000000",
  "quantity": "0.000300000000",
  "orderType": "limit",
  "side": "buy",
  "status": "new",
  "fillPrice": "0.000000000000",
  "fillQuantity": "0.000000000000",
  "fillTotalAmount": "0.000000000000",
  "cTime": "1666164135504"
 }
];

// open_long (buy), limit
const getOpenOrders_futures_open_long = [
 {
  "symbol": "BTCUSDT_UMCBL",
  "size": 0.005,
  "orderId": "966611965411221505",
  "clientOid": "966611965453164544",
  "filledQty": 0,
  "fee": 0,
  "price": 17000,
  "state": "new",
  "side": "open_long",
  "timeInForce": "normal",
  "totalProfits": 0,
  "posSide": "long",
  "marginCoin": "USDT",
  "filledAmount": 0,
  "orderType": "limit",
  "leverage": "75",
  "marginMode": "fixed",
  "cTime": "1666184172022",
  "uTime": "1666184172022"
 }
];


// open_short (sell), limit
const getOpenOrders_futures_open_short = [
 {
  "symbol": "BTCUSDT_UMCBL",
  "size": 0.01,
  "orderId": "966612840942821377",
  "clientOid": "966612840988958720",
  "filledQty": 0,
  "fee": 0,
  "price": 22000,
  "state": "new",
  "side": "open_short",
  "timeInForce": "normal",
  "totalProfits": 0,
  "posSide": "short",
  "marginCoin": "USDT",
  "filledAmount": 0,
  "orderType": "limit",
  "leverage": "75",
  "marginMode": "fixed",
  "cTime": "1666184380766",
  "uTime": "1666184380766"
 }
];

const getOpenOrders_futures = [
 {
  "orderId": "966629175424159745",
  "symbol": "BTCUSDT_UMCBL",
  "marginCoin": "USDT",
  "size": "0.012",
  "executePrice": "17020",
  "triggerPrice": "17050",
  "status": "not_trigger",
  "orderType": "limit",
  "planType": "normal_plan",
  "side": "open_long",
  "triggerType": "fill_price",
  "presetTakeProfitPrice": "17200",
  "presetTakeLossPrice": "17010",
  "cTime": "1666188275199"
 }
];


const getOpenOrders_futures = [
 {
  "exchangeId": "966644582781181953",
  "side": "buy",
  "type": "limit",
  "status": "new",
  "symbol": {
   "baseAsset": "BTC",
   "quoteAsset": "USDT"
  },
  "baseQuantity": 0.012,
  "price": 17250,
  "created": "2022-10-19 17:05:48"
 }
];

