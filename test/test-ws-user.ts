import { MarketType, WebsocketOptions } from '@metacodi/abstract-exchange';
import * as fs from 'fs';

import { Resource } from '@metacodi/node-utils';

import { BitgetWebsocket } from '../src/bitget-websocket';

import { getApiKeys } from './api-keys';


/**
 * ```bash
 * npx ts-node test/test-ws-user.ts
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

    const isTest = true;

    const options: WebsocketOptions = {
      streamType: 'user',
      market: market,
      isTest,
      ...getApiKeys({ isTest}), // Activar per privades
    };

    const ws = new BitgetWebsocket(options);

    // ws.addListener('message', msg => console.log('message =>', msg));
    
    const accountUpdate = ws.accountUpdate().subscribe(data => console.log('accountUpdate =>', data));
    // const accountUpdate = ws.accountUpdate('BTC').subscribe(data => console.log('accountUpdate =>', data));
    // const accountETH = ws.accountUpdate({ ccy: 'ETH'}).subscribe(data => console.log('accountUpdate ETH =>', data));
    // const positionsUpdate = ws.positionsUpdate({ instType: 'SWAP'}).subscribe(data => console.log('positionsUpdate =>', data));
    // const balancePositioUpdate = ws.balancePositionUpdate().subscribe(data => console.log('balancePositionUpdate =>', data));

    // const orderUpdate = ws.orderUpdate().subscribe(data => console.log('orderUpdate =>', data));
    // const orderUpdate = ws.orderUpdate('BTC_USDT').subscribe(data => console.log('orderUpdate =>', data));
    // const orderUpdate = ws.orderUpdate({ instType: 'SWAP'}).subscribe(data => console.log('orderUpdate =>', data));
    // const orderUpdateSPOT = ws.orderUpdate({ instType: 'SPOT'}).subscribe(data => console.log('orderUpdate =>', data));

    // setTimeout(() => { console.log('Close...'); ws.close(); }, 120000);
    // setTimeout(() => { console.log('Test => Unsubscribe accountUpdate'); accountUpdate.unsubscribe(); }, 3000);
    // setTimeout(() => { console.log('Test => Unsubscribe orderUpdate'); orderUpdate.unsubscribe(); }, 3000);

  } catch (error) {
    console.error('Websocket ERROR', error);
  }
};

testMarketWs();
