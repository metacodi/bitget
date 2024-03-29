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

const testUserWs = async () => {
  try {

    console.log('---------------- User WebSocket TEST ----------------------');

    // const market: MarketType = 'spot';
    const market: MarketType = 'futures';

    const isTest = true;

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

    // const accountUpdate = ws.accountUpdate().subscribe(data => console.log('accountUpdate =>', data));
    // const accountUpdate = ws.accountUpdate().subscribe((data: any) => writeLog(`a_${unixTime()}`, data, `log/metabot-swing-01-${market}.ts`));
    // const orderUpdate = ws.orderUpdate().subscribe((data: any) => writeLog(`o_${unixTime()}`, data, `log/metabot-swing-01-${market}.ts`));
    // const accountUpdate = ws.accountUpdate(symbol).subscribe(data => console.log('accountUpdate =>', data));

    const orderUpdate = ws.orderUpdate().subscribe(data => console.log('orderUpdate =>', data));
    // const orderUpdate = ws.orderUpdate(symbol).subscribe(data => console.log('orderUpdate =>', data));
    
    // setTimeout(() => { console.log('Close...'); ws.close(); }, 120000);
    // setTimeout(() => { console.log('Test => Unsubscribe accountUpdate'); accountUpdate.unsubscribe(); }, 3000);
    // setTimeout(() => { console.log('Test => Unsubscribe orderUpdate'); orderUpdate.unsubscribe(); }, 3000);
    
    console.log(await ws.api.getExchangeInfo());
    const resolveConstant = (data: any): string => {
      if (typeof data !== 'object' || Object.keys(data).length === 0) { return 'v' }
      const props = Object.keys(data);
      if (props.includes('trade') && props.includes('side') && props.includes('status') && props.includes('type')) {
        return [data.trade, data.side, data.type, data.status].join('_')
      } else {
        return props[0];
      }
    }
    const fileName = `log/test-cancel-TPSL-${market}.ts`;
    ws.accountUpdate().subscribe((data: any) => { writeLog(`${resolveConstant(data)}_${unixTime()}`, data, fileName); });
    ws.orderUpdate().subscribe((data: any) => { writeLog(`${resolveConstant(data)}_${unixTime()}`, data, fileName); });


  } catch (error) {
    Terminal.error(error, false);
    console.log(error);
  }
};

testUserWs();
