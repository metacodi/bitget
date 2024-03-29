import { ApiOptions, MarketType, SymbolType, WebsocketOptions } from '@metacodi/abstract-exchange';
import * as fs from 'fs';

import { Resource, Terminal } from '@metacodi/node-utils';

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

    const symbol: SymbolType = { baseAsset: 'BTC', quoteAsset: 'USDT' };

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
    await ws.initialize();

    // ws.addListener('message', msg => console.log('message =>', msg));

    // ---------------------------------------------------------------------------------------------------
    //  PUBLIC
    // ---------------------------------------------------------------------------------------------------

    // const marketSymbol = await ws.api.getMarketSymbol(symbol);
    // console.log(marketSymbol);
    // console.log(JSON.stringify(marketSymbol, null, '  '));


    const ticker = ws.priceTicker({ baseAsset: 'BTC', quoteAsset: 'USDT' }).subscribe(data => console.log('priceTicker =>', data));
    setTimeout(() => { console.log('Test => Unsubscribe ticker'); ticker.unsubscribe(); }, 10000);

    // const klines = ws.klineTicker({ baseAsset: 'BTC', quoteAsset: 'USDT' }, '1m').subscribe(data => console.log('klines =>', data));    
    // setTimeout(() => { console.log('Test => Unsubscribe klines'); klines.unsubscribe(); }, 5000);
    
    // setTimeout(() => { console.log('Reconnecting...'); ws.reconnect(); }, 52000);
    

  } catch (error) {
    Terminal.error(error, false);
    console.log(error);
  }
};

testMarketWs();
