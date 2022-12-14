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

    const isTest = true;

    const options: ApiOptions = {
      ...getApiKeys({ isTest }),
      // market: 'spot',
      market: 'futures',
      isTest,
    } as any;

    const api = new BitgetApi(options);

    console.log('getExchangeInfo() =>', await api.getExchangeInfo());
    console.log('getAccountInfo() =>', await api.getAccountInfo());

    // const getOpenOrders = await api.getOpenOrders( { symbol : { quoteAsset: 'USDT', baseAsset: 'BTC'}});
    // console.log('getOpenOrders() =>', getOpenOrders );
    // writeLog(`getOpenOrders_${options.market}`, getOpenOrders, 'results/getOpenOrders.ts');

    
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
