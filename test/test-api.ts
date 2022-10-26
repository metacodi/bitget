import moment from 'moment';
import { interval } from 'rxjs';
import * as fs from 'fs';

import { Resource, Terminal, timestamp } from '@metacodi/node-utils';
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

    console.log('getExchangeInfo() =>', await api.getExchangeInfo());

    // const getOpenOrders = await api.getOpenOrders({ quoteAsset: 'USDT', baseAsset: 'BTC'});
    // console.log('getOpenOrders() =>', getOpenOrders );
    // writeLog(`getOpenOrders_${options.market}`, getOpenOrders, 'results/getOpenOrders.ts');

    let id = 20;
    // // Post Order (market) buy
    // const postOrder_buy = await api.postOrder({
    //   id: `1-1-${id}`,
    //   side: 'buy',
    //   type: 'market',
    //   trade: 'short',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   quantity: 0.05
    // });

    // id++;
    // // Post Order (market) sell
    // const postOrder_sell = await api.postOrder({
    //   id: `1-1-${id}`,
    //   side: 'sell',
    //   type: 'market',
    //   trade: 'short',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   quantity: 0.05
    // });

    // id++;
    // // Post Order (limit) buy
    // const postOrder_limit = await api.postOrder({
    //   id: `1-1-${id}`,
    //   side: 'buy',
    //   type: 'limit',
    //   trade: 'long',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   quantity: 0.05,
    //   price: 18950
    // });

    // id++;
    // // Post Order (stop_market) buy
    // const postOrder_stop = await api.postOrder({
    //   id: `1-1-${id}`,
    //   side: 'buy',
    //   type: 'market',
    //   stop: 'normal',
    //   trade: 'long',
    //   symbol: {
    //     quoteAsset: 'USDT',
    //     baseAsset: 'BTC'
    //   },
    //   quantity: 0.05,
    //   stopPrice: 18820
    // });

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
    // console.log('setLeverage() =>', await api.setLeverage({ symbol: { quoteAsset: 'USDT', baseAsset: 'BTC'}, coin: 'USDT', longLeverage: 75, shortLeverage: 75, mode: 'cross'} ));
    // api.getExchangeInfo().then(async response => {
    // })

  } catch (error) {
    Terminal.error(error, false);
    console.log(error);
  }
};

testApi();
