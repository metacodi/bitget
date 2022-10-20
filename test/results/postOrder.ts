// market buy
const postOrder_futures = {
 "status": "new",
 "id": "1-1-2",
 "side": "buy",
 "type": "market",
 "trade": "long",
 "symbol": {
  "quoteAsset": "USDT",
  "baseAsset": "BTC"
 },
 "quantity": 0.05
};

//market sell
const postOrder_futures = {
 "status": "new",
 "id": "1-1-3",
 "side": "sell",
 "type": "market",
 "trade": "long",
 "symbol": {
  "quoteAsset": "USDT",
  "baseAsset": "BTC"
 },
 "quantity": 0.05
};

// limit buy
const postOrder_futures_limit = {
 "status": "new",
 "id": "1-1-4",
 "side": "buy",
 "type": "limit",
 "trade": "long",
 "symbol": {
  "quoteAsset": "USDT",
  "baseAsset": "BTC"
 },
 "quantity": 0.05,
 "price": 18950
};

// (stop_market) buy
const postOrder_futures_stop_market = {
 "status": "new",
 "exchangeId": "966843142287986688",
 "id": "1-1-13",
 "side": "buy",
 "type": "stop_market",
 "trade": "long",
 "symbol": {
  "quoteAsset": "USDT",
  "baseAsset": "BTC"
 },
 "quantity": 0.05,
 "price": 18950,
 "stopPrice": 18960
};

const postOrder_futures = {
 "status": "new",
 "exchangeId": "966846413174018048",
 "id": "1-1-13",
 "side": "buy",
 "type": "stop_market",
 "trade": "long",
 "symbol": {
  "quoteAsset": "USDT",
  "baseAsset": "BTC"
 },
 "quantity": 0.05,
 "price": 18950,
 "stopPrice": 18960
};

