import { MarketType, WebsocketOptions } from '@metacodi/abstract-exchange';
import * as fs from 'fs';

import { Resource } from '@metacodi/node-utils';

import { BitgetWebsocket } from '../src/bitget-websocket';


/**
 * ```bash
 * npx ts-node test/test-ws-market.ts
 * ```
 */


/** Archivo donde se escribirá la salida. */
const logFileName = 'results/klines-1m.json';

/** Escribe en el archivo `logFileName`. */
function writeLog(variable: string, data: any) {
  const url = Resource.normalize(`./test/${logFileName}`);
  const value = JSON.stringify(data, null, ' ');
  console.log(value);
  fs.appendFileSync(url, `const ${variable} = ${value};\n\n`);
}

const testMarketWs = async () => {
  try {

    console.log('---------------- Market WebSocket TEST ----------------------');

    // const market: MarketType = 'spot';
    const market: MarketType = 'futures';

    const isTest = false;

    const options: WebsocketOptions = {
      streamType: 'market',
      market: market,
      isTest,
    };

    const ws = new BitgetWebsocket(options);
    
    // ws.addListener('message', msg => console.log('message =>', msg));

    // ---------------------------------------------------------------------------------------------------
    //  PUBLIC
    // ---------------------------------------------------------------------------------------------------

    // const ticker = ws.priceTicker('BTC_USDT').subscribe(data => console.log('priceTicker =>', data));
    const klines = ws.klineTicker('BTC_USDT', '1m').subscribe(data => console.log('klines =>', data));
    
    // setTimeout(() => { console.log('Test => Unsubscribe ticker'); ticker.unsubscribe(); }, 2000);
    setTimeout(() => { console.log('Test => Unsubscribe klines'); klines.unsubscribe(); }, 5000);
    
    // setTimeout(() => { console.log('Reconnecting...'); ws.reconnect(); }, 52000);
    

  } catch (error) {
    console.error('Websocket ERROR', error);
  }
};

testMarketWs();