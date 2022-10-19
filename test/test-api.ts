import moment from 'moment';
import { interval } from 'rxjs';
import * as fs from 'fs';

import { Resource, Terminal } from '@metacodi/node-utils';
import { ApiOptions } from '@metacodi/abstract-exchange';

import { BitgetApi } from '../src/bitget-api';
import { getApiKeys } from './api-keys';

/**
 * ```bash
 * npx ts-node test/test-api.ts
 * ```
 */

/** Archivo donde se escribirá la salida. */
const logFileName = 'results/getOpenOrders.ts';

/** Escribe en el archivo `logFileName`. */
function writeLog(variable: string, data: any) {
  const url = Resource.normalize(`./test/${logFileName}`);
  const value = JSON.stringify(data, null, ' ');
  console.log(value);
  fs.appendFileSync(url, `const ${variable} = ${value};\n\n`);
}

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
    
    const getOpenOrders = await api.getOpenOrders({ quoteAsset: 'USDT', baseAsset: 'BTC'});
    console.log('getOpenOrders() =>', getOpenOrders );
    writeLog(`getOpenOrders_${options.market}`, getOpenOrders);

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
