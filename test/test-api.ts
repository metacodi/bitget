import moment from 'moment';
import { interval } from 'rxjs';
import * as fs from 'fs';

import { Resource, round, Terminal, timestamp } from '@metacodi/node-utils';
import { ApiOptions } from '@metacodi/abstract-exchange';

import { BitgetApi } from '../src/bitget-api';
import { getApiKeys } from './api-keys';

/**
 * ```bash
 * npx ts-node test/test-api.ts
 * ```
 */

/** Archivo donde se escribirá la salida. */
const logFileName = 'results/cancelAllOrder.ts';

/** Escribe en el archivo `logFileName`. */
function writeLog(variable: string, data: any, fileName?: string) {
  const url = Resource.normalize(`./test/${fileName || logFileName}`);
  const value = JSON.stringify(data, null, ' ');
  console.log(value);
  fs.appendFileSync(url, `const ${variable} = ${value};\n\n`);
}

const unixTime = () => timestamp().replace(new RegExp(`[ :.-]`, 'g'), '_');

const testApi = async () => {
  try {

    console.log('---------------- API TEST ----------------------');

    const isTest = false;

    const options: ApiOptions = {
      ...getApiKeys({ isTest }),
      // market: 'spot',
      market: 'futures',
      isTest,
    } as any;

    const api = new BitgetApi(options);

    const timestamp = unixTime();

    const exchangeInfo = await api.getExchangeInfo();
    console.log('getExchangeInfo() =>', exchangeInfo);

    const accountInfo = await api.getAccountInfo();
    accountInfo.balances = (accountInfo.balances || []).filter(b => !!b.balance);
    accountInfo.positions = (accountInfo.positions || []).map(p => ({ ...p, ...{ symbol: JSON.stringify(p.symbol) } as any })).filter(p => !!p.positionAmount);
    console.log('getAccountInfo() =>', accountInfo);
    // writeLog(`accountInfo_${options.market}_${timestamp}`, accountInfo, 'results/accountInfo.ts');

    // const quoteAsset = 'USD';
    // const baseAsset: any = 'BTC';
    // // const productType = await api.getMarketSymbol({ quoteAsset, baseAsset });
    // const productType = api.exchangeSymbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
    // const startTime = options.market === 'futures' ? { startTime: moment().subtract(1, 'month').unix() * 1000 } : undefined;
    // const endTime = options.market === 'futures' ? { endTime: moment().unix() * 1000 } : undefined;
    // // const endTime = options.market === 'futures' ? { endTime: moment().subtract(1, 'month').add(20, 'days').unix() * 1000 } : undefined;
    // const getHistoryOrders = await api.getHistoryOrders( { symbol: { quoteAsset, baseAsset }, ...startTime, ...endTime });
    // const getHistoryOrders_raw = await api.getHistoryOrders( { symbol: { quoteAsset, baseAsset }, ...startTime, ...endTime }, true);
    // writeLog(`${options.market}_${productType.symbol}_${timestamp}`, getHistoryOrders, `results/getHistoryOrders_${options.market}_${productType.symbol}.ts`);
    // writeLog(`${options.market}_${productType.symbol}_raw_${timestamp}`, getHistoryOrders_raw, `results/getHistoryOrders_${options.market}_${productType.symbol}_raw.ts`);

    // const results: any[] = [];
    // const getHistoryOrders: any[] = [];
    // do {
    //   const startTime = options.market === 'futures' ? { startTime: moment().subtract(1, 'month').unix() * 1000 } : undefined;
    //   const endTime = options.market === 'futures' ? { endTime: moment().subtract(1, 'month').add(10, 'days').unix() * 1000 } : undefined;
    //   const results = await api.getHistoryOrders( { symbol: { quoteAsset: 'USDT', baseAsset: 'BTC'}, ...startTime, ...endTime }, true);
    //   writeLog(`getHistoryOrders_${options.market}_${endTime}`, getHistoryOrders, `results/getHistoryOrders_${options.market}.ts`);
    //   writeLog(`getHistoryOrders_${options.market}_raw`, getHistoryOrders_raw, `results/getHistoryOrders_${options.market}_raw.ts`);

    // } while (results.length > 0);

    // const startTime = options.market === 'futures' ? { startTime: moment().subtract(1, 'month').unix() * 1000 } : undefined;
    // const endTime = options.market === 'futures' ? { endTime: moment().unix() * 1000 } : undefined;
    // const getHistoryOrders = await api.getHistoryOrders( { symbol: { quoteAsset: 'USDT', baseAsset: 'BTC'}, ...startTime, ...endTime });
    // const getHistoryOrders_raw = await api.getHistoryOrders( { symbol: { quoteAsset: 'USDT', baseAsset: 'BTC'}, ...startTime, ...endTime }, true);
    // writeLog(`getHistoryOrders_${options.market}`, getHistoryOrders, `results/getHistoryOrders_${options.market}.ts`);
    // writeLog(`getHistoryOrders_${options.market}_raw`, getHistoryOrders_raw, `results/getHistoryOrders_${options.market}_raw.ts`);

    // const getOpenOrders = await api.getOpenOrders(options.market === 'spot' ? {} : { symbol : { quoteAsset, baseAsset }});
    // const getOpenOrders_raw = await api.getOpenOrders(options.market === 'spot' ? {} : { symbol : { quoteAsset, baseAsset }}, true);
    // writeLog(`getOpenOrders_${options.market}_${timestamp}`, getOpenOrders, 'results/getOpenOrders.ts');
    // writeLog(`getOpenOrders_${options.market}_raw_${timestamp}`, getOpenOrders_raw, 'results/getOpenOrders_raw.ts');

    const getAccountBill = await api.getAccountBill();
    writeLog(`getAccountBill_${options.market}_${timestamp}`, getAccountBill, `results/getAccountBill_${options.market}.ts`);

    // const before = moment().subtract(1, 'month').unix();
    // const after = moment().unix();
    // const getTransferList = await api.getTransferList({ coinId: 1 /* BTC=1 */, fromType: 'exchange', after, before,  });
    // writeLog(`getTransferList_${options.market}_${timestamp}`, getTransferList, 'results/getTransferList.ts');

    // const url = `test/results/getHistoryOrders_futures_raw.ts`;
    // const content: {[key: string]: any}[] = await Resource.open(url, { parseJsonFile: true })
    // console.log(content.length);
    // const headers = content.reduce((all: string[], c) => [...all, ...Object.keys(c).filter(k => !all.includes(k))], []);
    // // const values = content.map(v => ({...v, priceAvg: v.priceAvg || 0, presetStopLossPrice: v.presetStopLossPrice || 0, presetTakeProfitPrice: v.presetTakeProfitPrice || 0 }));
    // const parseValue = (k: string, v: any): any => {
    //   if (typeof v === 'number') {
    //     return `${v}`.replace('.', ',');
    //   } else if (k.includes('Time')) {
    //     return moment(+v).format('YYYY-MM-DD HH:mm:ss');
    //   } else {
    //     return v;
    //   }
    // }
    // const values = content.map(v => {
    //   const o: any = {};
    //   headers.map(k => o[k] = v.hasOwnProperty(k) ? parseValue(k, v[k]) : '');
    //   return o;
    // });
    // const urlCSV = `test/results/getHistoryOrders_futures_raw.csv`;
    // fs.appendFileSync(urlCSV, `${headers.join(';')}\n${values.map(v => Object.values(v).join(';')+'\n')}`);

    // const getOpenOrders = await api.getOpenOrders( { symbol : { quoteAsset: 'USDT', baseAsset: 'BTC'}});
    // const getOpenOrders_raw = await api.getOpenOrders( { symbol : { quoteAsset: 'USDT', baseAsset: 'BTC'}}, true);
    // writeLog(`getOpenOrders_${options.market}_${timestamp}`, getOpenOrders, 'results/getOpenOrders.ts');
    // writeLog(`getOpenOrders_${options.market}_raw_${timestamp}`, getOpenOrders_raw, 'results/getOpenOrders_raw.ts');

    // const getOpenOrders_SOL = await api.getOpenOrders( { symbol : { quoteAsset: 'USDT' as any, baseAsset: 'SOL' as any}});
    // const getOpenOrders_SOL_raw = await api.getOpenOrders( { symbol : { quoteAsset: 'USDT' as any, baseAsset: 'SOL' as any}}, true);
    // writeLog(`getOpenOrders_${options.market}_SOL`, getOpenOrders, 'results/getOpenOrders.ts');
    // writeLog(`getOpenOrders_${options.market}_SOL_raw`, getOpenOrders_raw, 'results/getOpenOrders_raw.ts');

    
    // Entramos a mercado en Long
    // const postOrder_buy = await api.postOrder({
    //   id: `1-1-${moment().format("MMDDHHmmss")}`,
    //   side: 'buy',
    //   type: 'market',
    //   trade: 'long',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   baseQuantity: 0.5
    // });

    // Salimos a mercado en Long
    // const postOrder_sell = await api.postOrder({
    //   id: `1-1-${moment().format("MMDDHHmmss")}`,
    //   side: 'sell',
    //   type: 'market',
    //   trade: 'long',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   baseQuantity: 0.5
    // });

    // const postOrder_buy_limit = await api.postOrder({
    //   id: `1-1-${moment().format("MMDDHHmmss")}`,
    //   side: 'buy',
    //   type: 'limit',
    //   price: 20710.5,
    //   trade: 'long',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   baseQuantity: 0.005
    // });

    // Entramos a mercado en Short
    // const postOrder_buy = await api.postOrder({
    //   id: `1-1-${moment().format("MMDDHHmmss")}`,
    //   side: 'buy',
    //   type: 'market',
    //   trade: 'short',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   baseQuantity: 0.5
    // });

    // Salimos a mercado en Short
    // const postOrder_sell = await api.postOrder({
    //   id: `1-1-${moment().format("MMDDHHmmss")}`,
    //   side: 'sell',
    //   type: 'market',
    //   trade: 'short',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   baseQuantity: 0.05
    // });

    // Post Order (limit) buy
    // const postOrder_limit = await api.postOrder({
    //   id: `1-1-${moment().format("MMDDHHmmss")}`,
    //   side: 'buy',
    //   type: 'limit',
    //   trade: 'long',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   baseQuantity: 0.05,
    //   price: 18950
    // });

    // Post Order (stop_limit) buy
    // const postOrder_stop = await api.postOrder({
    //   id: `1-1-${moment().format("MMDDHHmmss")}`,
    //   side: 'buy',
    //   type: 'limit',
    //   stop: 'normal',
    //   trade: 'long',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   baseQuantity: 0.005,
    //   price: 18700,
    //   stopPrice: 20485.5
    // });

    // Post Order (stop_market) sell
    // const postOrder_stop = await api.postOrder({
    //   id: `1-1-${moment().format("MMDDHHmmss")}`,
    //   side: 'sell',
    //   type: 'market',
    //   stop: 'normal',
    //   trade: 'long',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   baseQuantity: 0.5,
    //   stopPrice: 16625
    // });

    // Post Order (stop_market) profit le precio esta a 16526
    // const postOrder_profit = await api.postOrder({
    //   id: `1-1-${moment().format("MMDDHHmmss")}`,
    //   side: 'sell',
    //   type: 'market',
    //   stop: 'profit',
    //   trade: 'short',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   baseQuantity: 0.05,
    //   stopPrice: 16540
    // });

    // Post Order (stop_market) loss le precio esta a 16526
    //  const postOrder_loss = await api.postOrder({
    //   id: `1-1-${moment().format("MMDDHHmmss")}`,
    //   side: 'sell',
    //   type: 'market',
    //   stop: 'loss',
    //   trade: 'short',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   // baseQuantity: 0.05,
    //   stopPrice: 16580
    // });

    // setTimeout(async () => {
    // try {
    //     const price = await api.getPriceTicker({ quoteAsset: 'USDT', baseAsset: 'BTC'});
    //     // Post Order (stop_market) profit_possition le precio medio a 16568.06
    //     const postOrder_profit_position = await api.postOrder({
    //       id: `1-TP-${moment().format("MMDDHHmmss")}`,
    //       side: 'sell',
    //       type: 'market',
    //       stop: 'profit-position',
    //       trade: 'short',
    //       symbol: {
    //         quoteAsset: 'USDT',
    //         baseAsset: 'BTC'
    //       },
    //       stopPrice: round(price.price - 3, 0)
    //     });
    
    //     // // // Post Order (stop_market) loss_possition le precio medio a 16568.06
    //     const postOrder_loss_possition = await api.postOrder({
    //       id: `1-SL-${moment().format("MMDDHHmmss")}`,
    //       side: 'sell',
    //       type: 'market',
    //       stop: 'loss-position',
    //       trade: 'short',
    //       symbol: {
    //         quoteAsset: 'USDT',
    //         baseAsset: 'BTC'
    //       },
    //       stopPrice: round(price.price + 3, 0)
    //     });
        
    //   } catch (error) {
    //     Terminal.error(error);
    //   }
    // }, 1500);

    // console.log('postOrder() =>', postOrder_stop);
    // writeLog(`postOrder_${options.market}`, postOrder_stop);

    // Cancel Order
    // const cancelOrder = await api.cancelOrder({ symbol: { quoteAsset: 'USDT', baseAsset: 'BTC'}, exchangeId: '966846413174018048', triggered: true});
    // console.log('cancelOrder() =>', cancelOrder);
    // writeLog(`cancelOrder_${options.market}`, cancelOrder);

    // Cancel All Orders
    // const cancelAllOrder = await api.cancelAllSymbolOrders({ quoteAsset: 'USDT', baseAsset: 'BTC'});
    // console.log('cancelAllOrder() =>', cancelAllOrder);
    // writeLog(`cancelAllOrder_${options.market}`, cancelAllOrder);



    // console.log('getLeverage() =>', await api.getLeverage({ quoteAsset: 'USDT', baseAsset: 'BTC'}, 'isolated'));
    // console.log('setLeverage() =>', await api.setLeverage({ symbol: { quoteAsset: 'USDT', baseAsset: 'BTC'}, coin: 'USDT', longLeverage: 75, shortLeverage: 75, mode: 'isolated'} ));
    // api.getExchangeInfo().then(async response => {
    // })

    // // Get Order SPOT
    // console.log('getLeverage() =>', await api.getLeverage({ quoteAsset: 'USDT', baseAsset: 'BTC'}, 'isolated'));

  } catch (error) {
    Terminal.error(error, false);
    console.log(error);
  }
};

testApi();
