import moment from 'moment';
import { interval } from 'rxjs';
import * as fs from 'fs';

import { Resource } from '@metacodi/node-utils';
import { ApiOptions } from '@metacodi/abstract-exchange';

import { BitgetApi } from '../src/bitget-api';
import { getApiKeys } from './api-keys';

/**
 * ```bash
 * npx ts-node test/test-api.ts
 * ```
 */

/** Archivo donde se escribirá la salida. */
const logFileName = 'results/getAssetBalance.ts';

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
      market: 'futures',
      isTest,
    } as any;

    const api = new BitgetApi(options);

    
     console.log('getAccountInfo() =>', await api.getAccountInfo({ productType: 'umcbl'}));

  } catch (error) {
    console.error('API ERROR', error);
  }
};

testApi();
