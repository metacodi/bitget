const orderUpdate_limi_buy_spot = {
  instId: 'BTCUSDT_SPBL',
  ordId: '966615397108715520',
  clOrdId: '1681af4b-2f97-44b5-8c28-1abf9eb68270',
  px: '17050.00',
  sz: '0.0006',
  notional: '10.230000',
  ordType: 'limit',
  force: 'normal',
  side: 'buy',
  accFillSz: '0.0000',
  avgPx: '0.00',
  status: 'new',
  cTime: 1666184990193,
  uTime: 1666184990193,
  orderFee: []
};



// /// SPOT BUY

// orderUpdate => {
//   action: 'snapshot',
//   arg: { instType: 'spbl', channel: 'orders', instId: 'default' },
//   data: [
//     {
//       instId: 'BTCUSDT_SPBL',
//       ordId: '969941398064631808',
//       clOrdId: '812ac8e3-f98e-431a-8f2d-b3a249a00927',
//       notional: '5.000000',
//       ordType: 'market',
//       force: 'normal',
//       side: 'buy',
//       fillPx: '20698.96',
//       tradeId: '969941398444494849',
//       fillSz: '0.0002',
//       fillTime: '1666977970705',
//       fillFee: '0',
//       fillFeeCcy: 'BTC',
//       execType: 'T',
//       accFillSz: '0.0002',
//       avgPx: '20698.96',
//       status: 'partial-fill',
//       cTime: 1666977970615,
//       uTime: 1666977970797,
//       orderFee: [Array]
//     }
//   ]
// }
// orderUpdate => {
//   action: 'snapshot',
//   arg: { instType: 'spbl', channel: 'orders', instId: 'default' },
//   data: [
//     {
//       instId: 'BTCUSDT_SPBL',
//       ordId: '969941398064631808',
//       clOrdId: '812ac8e3-f98e-431a-8f2d-b3a249a00927',
//       notional: '5.000000',
//       ordType: 'market',
//       force: 'normal',
//       side: 'buy',
//       accFillSz: '0.0002',
//       avgPx: '20698.96',
//       status: 'full-fill',
//       cTime: 1666977970615,
//       uTime: 1666977970799,
//       orderFee: [Array]
//     }
//   ]
// }
// accountUpdate => {
//   balances: [
//     { asset: 'USDT', available: '76.8391615900000000' },
//     { asset: 'BTC', available: '0.000200000000' }
//   ]
// }

// // SPOT SELL

// orderUpdate => {
//   action: 'snapshot',
//   arg: { instType: 'spbl', channel: 'orders', instId: 'default' },
//   data: [
//     {
//       instId: 'BTCUSDT_SPBL',
//       ordId: '969942095149568000',
//       clOrdId: 'af2db903-d2e4-4429-a334-0e33ed2927e6',
//       sz: '0.0009',
//       ordType: 'market',
//       force: 'normal',
//       side: 'sell',
//       accFillSz: '0.0000',
//       avgPx: '0.00',
//       status: 'new',
//       cTime: 1666978136813,
//       uTime: 1666978136813,
//       orderFee: []
//     }
//   ]
// }
// accountUpdate => { balances: [ { asset: 'BTC', available: '0.0000000000000000' } ] }
// orderUpdate => {
//   action: 'snapshot',
//   arg: { instType: 'spbl', channel: 'orders', instId: 'default' },
//   data: [
//     {
//       instId: 'BTCUSDT_SPBL',
//       ordId: '969942095149568000',
//       clOrdId: 'af2db903-d2e4-4429-a334-0e33ed2927e6',
//       sz: '0.0009',
//       ordType: 'market',
//       force: 'normal',
//       side: 'sell',
//       fillPx: '20693.90',
//       tradeId: '969942095370047489',
//       fillSz: '0.0004',
//       fillTime: '1666978136865',
//       fillFee: '0',
//       fillFeeCcy: 'USDT',
//       execType: 'T',
//       accFillSz: '0.0004',
//       avgPx: '20693.90',
//       status: 'partial-fill',
//       cTime: 1666978136813,
//       uTime: 1666978136927,
//       orderFee: [Array]
//     }
//   ]
// }
// orderUpdate => {
//   action: 'snapshot',
//   arg: { instType: 'spbl', channel: 'orders', instId: 'default' },
//   data: [
//     {
//       instId: 'BTCUSDT_SPBL',
//       ordId: '969942095149568000',
//       clOrdId: 'af2db903-d2e4-4429-a334-0e33ed2927e6',
//       sz: '0.0009',
//       ordType: 'market',
//       force: 'normal',
//       side: 'sell',
//       fillPx: '20691.57',
//       tradeId: '969942095370047491',
//       fillSz: '0.0005',
//       fillTime: '1666978136865',
//       fillFee: '0',
//       fillFeeCcy: 'USDT',
//       execType: 'T',
//       accFillSz: '0.0009',
//       avgPx: '20692.60',
//       status: 'partial-fill',
//       cTime: 1666978136813,
//       uTime: 1666978136928,
//       orderFee: [Array]
//     }
//   ]
// }
// orderUpdate => {
//   action: 'snapshot',
//   arg: { instType: 'spbl', channel: 'orders', instId: 'default' },
//   data: [
//     {
//       instId: 'BTCUSDT_SPBL',
//       ordId: '969942095149568000',
//       clOrdId: 'af2db903-d2e4-4429-a334-0e33ed2927e6',
//       sz: '0.0009',
//       ordType: 'market',
//       force: 'normal',
//       side: 'sell',
//       accFillSz: '0.0009',
//       avgPx: '20692.60',
//       status: 'full-fill',
//       cTime: 1666978136813,
//       uTime: 1666978136929,
//       orderFee: [Array]
//     }
//   ]
// }
// accountUpdate => {
//   balances: [
//     { asset: 'USDT', available: '80.9703015900000000' },
//     { asset: 'BTC', available: '0.0000000000000000' }
//   ]
// }