import * as fs from 'fs';

import { Resource, Terminal, timestamp } from '@metacodi/node-utils';
import { MarketType, SymbolType, WebsocketOptions } from '@metacodi/abstract-exchange';

import { BitgetWebsocket } from '../src/bitget-websocket';

import { getApiKeys } from './api-keys';


/**
 * ```bash
 * npx ts-node test/test-ws-user.ts
 * ```
 */


/** Archivo donde se escribirá la salida. */
const logFileName = 'log/accountUpdate.ts';

/** Escribe en el archivo `logFileName`. */
function writeLog(variable: string, data: any, fileName?: string) {
  const url = Resource.normalize(`./test/${fileName || logFileName}`);
  const value = JSON.stringify(data, null, ' ');
  console.log(value);
  fs.appendFileSync(url, `const ${variable} = ${value};\n\n`);
}

const unixTime = () => timestamp().replace(new RegExp(`[ :.-]`, 'g'), '_');

const testMarketWs = async () => {
  try {

    console.log('---------------- Market WebSocket TEST ----------------------');

    // const market: MarketType = 'spot';
    const market: MarketType = 'futures';

    const isTest = false;

    const options: WebsocketOptions = {
      streamType: 'user',
      market: market,
      isTest,
      ...getApiKeys({ isTest}), // Activar per privades
    };

    const ws = new BitgetWebsocket(options);
    await ws.initialize();

    // ws.addListener('message', msg => console.log('message =>', msg));
    
    const symbol: SymbolType = { baseAsset: 'BTC', quoteAsset: 'USDT' };

    const accountUpdate = ws.accountUpdate().subscribe(data => console.log('accountUpdate =>', data));
    // const accountUpdate = ws.accountUpdate().subscribe((data: any) => writeLog(`${data.arg.channel}_${data.arg.instType}_${unixTime()}`, data, `log/raw_accountUpdate-${market}.ts`));
    // const accountUpdate = ws.accountUpdate(symbol).subscribe(data => console.log('accountUpdate =>', data));

    // const orderUpdate = ws.orderUpdate().subscribe(data => console.log('orderUpdate =>', data));
    // const orderUpdate = ws.orderUpdate(symbol).subscribe(data => console.log('orderUpdate =>', data));
    
    // setTimeout(() => { console.log('Close...'); ws.close(); }, 120000);
    // setTimeout(() => { console.log('Test => Unsubscribe accountUpdate'); accountUpdate.unsubscribe(); }, 3000);
    // setTimeout(() => { console.log('Test => Unsubscribe orderUpdate'); orderUpdate.unsubscribe(); }, 3000);
    
    // ws.accountUpdate().subscribe((data: any) => writeLog(`${data.arg.channel}_${data.arg.instType}_${unixTime()}`, data, `log/trade-04-${market}.ts`));
    // ws.orderUpdate().subscribe((data: any) => writeLog(`${data.arg.channel}_${data.arg.instType}_${unixTime()}`, data, `log/trade-04-${market}.ts`));

  } catch (error) {
    Terminal.error(error, false);
    console.log(error);
  }
};

testMarketWs();
