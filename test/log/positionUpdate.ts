const positionUpdate = {
  posId: '962261085887029248',
  instId: 'BTCUSDT_UMCBL',
  instName: 'BTCUSDT',
  marginCoin: 'USDT',
  margin: '11.1205',
  marginMode: 'fixed',
  holdSide: 'short',
  holdMode: 'double_hold',
  total: '0.041',
  available: '0.041',
  locked: '0',
  averageOpenPrice: '20342.5',
  leverage: 75,
  achievedProfits: '0',
  upl: '0.018',
  uplRate: '0.0016',
  liqPx: '20519.34',
  keepMarginRate: '0.004',
  fixedMarginRate: '0.012755251796',
  marginRate: '0.344433790582',
  cTime: '1665146841498',
  uTime: '1666963184135',
  markPrice: '20342.06'
}

const positionUpdate_28 = {
  posId: '962261085887029248',
  instId: 'BTCUSDT_UMCBL',
  instName: 'BTCUSDT',
  marginCoin: 'USDT',
  margin: '4.9316',
  marginMode: 'fixed',
  holdSide: 'short',
  holdMode: 'double_hold',
  total: '0.03',
  available: '0.03',
  locked: '0',
  averageOpenPrice: '20548.5',
  leverage: 125,
  achievedProfits: '0',
  upl: '-0.2091',
  uplRate: '-0.0423',
  liqPx: '20618.04',
  keepMarginRate: '0.004',
  fixedMarginRate: '0.007058204848',
  marginRate: '0.600662961034',
  cTime: '1665146841498',
  uTime: '1666964684922',
  markPrice: '20555.47'
}

const positionUpdate_28_close = {
  posId: '962261085887029248',
  instId: 'BTCUSDT_UMCBL',
  instName: 'BTCUSDT',
  marginCoin: 'USDT',
  margin: '4.9316',
  marginMode: 'fixed',
  holdSide: 'short',
  holdMode: 'double_hold',
  total: '0.03',
  available: '0',
  locked: '0.03',
  averageOpenPrice: '20548.5',
  leverage: 125,
  achievedProfits: '0',
  upl: '1.1649',
  uplRate: '0.2362',
  liqPx: '20618.04',
  keepMarginRate: '0.004',
  fixedMarginRate: '0.009308399307',
  marginRate: '0.464252585893',
  cTime: '1665146841498',
  uTime: '1666965096377',
  markPrice: '20509.67'
}

// -----------------------------------------------------------------------------------------
// Exemple Posion leverage 125 Primer intent de liquidació
// -----------------------------------------------------------------------------------------

// // accountUpdate => []
const positionUpdate_29_new_orderUpdate = {
  id: '969887816617713665',
  exchangeId: '969887816592547841',
  side: 'sell',
  type: 'market',
  trade: 'short',
  status: 'new',
  symbol: { baseAsset: 'BTC', quoteAsset: 'USDT' },
  baseQuantity: 0.011,
  quoteQuantity: 225.4285,
  price: 0,
  stopPrice: 0,
  created: '2022-10-28 15:53:15.802',
  posted: '2022-10-28 15:53:15.802',
  executed: '2022-10-28 15:53:15.802',
  profit: 0,
  commission: 0,
  commissionAsset: 0
};

const positionUpdate_29_accountUpdate_balnce = {
  balances: [
    { asset: undefined, available: '0.06131490', locked: '0.00000000' }
  ]
}

const positionUpdate_29_accountUpdate = [
  {
    posId: '962261085887029248',
    instId: 'BTCUSDT_UMCBL',
    instName: 'BTCUSDT',
    marginCoin: 'USDT',
    margin: '1.8034',
    marginMode: 'fixed',
    holdSide: 'short',
    holdMode: 'double_hold',
    total: '0.011',
    available: '0.011',
    locked: '0',
    averageOpenPrice: '20493.5',
    leverage: 125,
    achievedProfits: '0',
    upl: '0.0366',
    uplRate: '0.0203',
    liqPx: '20562.85',
    keepMarginRate: '0.004',
    fixedMarginRate: '0.007563817089',
    marginRate: '0.563461913701',
    cTime: '1665146841498',
    uTime: '1666965195894',
    markPrice: '20490.17'
  }
]

const positionUpdate_29_filled_orderUpdate = {
  id: '969887816617713665',
  exchangeId: '969887816592547841',
  side: 'sell',
  type: 'market',
  trade: 'short',
  status: 'filled',
  symbol: { baseAsset: 'BTC', quoteAsset: 'USDT' },
  baseQuantity: 0.011,
  quoteQuantity: 225.4285,
  price: 20493.5,
  stopPrice: 0,
  created: '2022-10-28 15:53:15.802',
  posted: '2022-10-28 15:53:15.802',
  executed: '2022-10-28 15:53:15.818',
  profit: '0',
  commission: '-0.1352571',
  commissionAsset: 'USDT'
}

// -----------------------------------------------------------------------------------------
// Exemple Posion leverage 125 Segon intent de liquidació
// -----------------------------------------------------------------------------------------

const orderUpdate_30_new = {
  id: '969893105085603840',
  exchangeId: '969893105073020930',
  side: 'sell',
  type: 'market',
  trade: 'short',
  status: 'new',
  symbol: { baseAsset: 'BTC', quoteAsset: 'USDT' },
  baseQuantity: 0.009,
  quoteQuantity: 183.357,
  price: 0,
  stopPrice: 0,
  created: '2022-10-28 16:14:16.671',
  posted: '2022-10-28 16:14:16.671',
  executed: '2022-10-28 16:14:16.671',
  profit: 0,
  commission: 0,
  commissionAsset: 0
}

const accountUpdate_30_balacce = {
  balances: [
    { asset: undefined, available: '0.12587420', locked: '0.00000000' }
  ]
}

const positionUpdate_30_accountUpdate = {
  posId: '962261085887029248',
  instId: 'BTCUSDT_UMCBL',
  instName: 'BTCUSDT',
  marginCoin: 'USDT',
  margin: '1.4668',
  marginMode: 'fixed',
  holdSide: 'short',
  holdMode: 'double_hold',
  total: '0.009',
  available: '0.009',
  locked: '0',
  averageOpenPrice: '20372.5',
  leverage: 125,
  achievedProfits: '0',
  upl: '0.0091',
  uplRate: '0.0062',
  liqPx: '20441.44',
  keepMarginRate: '0.004',
  fixedMarginRate: '0.007450470560',
  marginRate: '0.571395170732',
  cTime: '1665146841498',
  uTime: '1666966456746',
  markPrice: '20371.48'
}

const position_liquidation_30_accountUpdate_position = [
  {
    posId: '962261085887029248',
    instId: 'BTCUSDT_UMCBL',
    instName: 'BTCUSDT',
    marginCoin: 'USDT',
    margin: '1.4668',
    marginMode: 'fixed',
    holdSide: 'short',
    holdMode: 'double_hold',
    total: '0.009',
    available: '0.009',
    locked: '0',
    averageOpenPrice: '20372.5',
    leverage: 125,
    achievedProfits: '0',
    upl: '-0.6267',
    uplRate: '-0.4272',
    liqPx: '20441.44',
    keepMarginRate: '0.004',
    fixedMarginRate: '0.003966058153',
    marginRate: '1.007433511893',
    cTime: '1665146841498',
    uTime: '1666966659246',
    markPrice: '20442.14'
  }
]

const orderUpdate_30_filled = {
  id: '969893105085603840',
  exchangeId: '969893105073020930',
  side: 'sell',
  type: 'market',
  trade: 'short',
  status: 'filled',
  symbol: { baseAsset: 'BTC', quoteAsset: 'USDT' },
  baseQuantity: 0.009,
  quoteQuantity: 183.3525,
  price: 20372.5,
  stopPrice: 0,
  created: '2022-10-28 16:14:16.671',
  posted: '2022-10-28 16:14:16.671',
  executed: '2022-10-28 16:14:16.684',
  profit: '0',
  commission: '-0.1100115',
  commissionAsset: 'USDT'
}

const position_liquidation_30_accountUpdate_position2 = [
  {
    posId: '962261085887029248',
    instId: 'BTCUSDT_UMCBL',
    instName: 'BTCUSDT',
    marginCoin: 'USDT',
    margin: '1.4668',
    marginMode: 'fixed',
    holdSide: 'short',
    holdMode: 'double_hold',
    total: '0.009',
    available: '0',
    locked: '0.009',
    averageOpenPrice: '20372.5',
    leverage: 125,
    achievedProfits: '0',
    upl: '-0.6247',
    uplRate: '-0.4259',
    liqPx: '20441.44',
    keepMarginRate: '0.004',
    fixedMarginRate: '0.003976869492',
    marginRate: '1.005053783669',
    cTime: '1665146841498',
    uTime: '1666966660719',
    markPrice: '20441.92'
  }
]

const position_liquidation_30_orderUpdate_new = {
  id: '969893960924946433',
  exchangeId: '969893960924946432',
  side: 'buy',
  type: 'market',
  trade: 'short',
  status: 'new',
  symbol: { baseAsset: 'BTC', quoteAsset: 'USDT' },
  baseQuantity: 0.009,
  quoteQuantity: 183.9645,
  price: 0,
  stopPrice: 0,
  created: '2022-10-28 16:17:40.719',
  posted: '2022-10-28 16:17:40.719',
  executed: '2022-10-28 16:17:40.719',
  profit: 0,
  commission: 0,
  commissionAsset: 0
}
const position_liquidation_30_accountUpdate_filled = {
  balances: [
    { asset: undefined, available: '0.12587420', locked: '0.00000000' }
  ]
}
// position_liquidation_30_accountUpdate = []
const position_liquidation_30_orderUpdate = {
  id: '969893960924946433',
  exchangeId: '969893960924946432',
  side: 'buy',
  type: 'market',
  trade: 'short',
  status: 'filled',
  symbol: { baseAsset: 'BTC', quoteAsset: 'USDT' },
  baseQuantity: 0.009,
  quoteQuantity: 183.969,
  price: 20441,
  stopPrice: 0,
  created: '2022-10-28 16:17:40.719',
  posted: '2022-10-28 16:17:40.719',
  executed: '2022-10-28 16:17:40.740',
  profit: '-0.6165',
  commission: '-0.1103814',
  commissionAsset: 'USDT'
}