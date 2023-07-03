import moment from 'moment';
import { interval } from 'rxjs';
import * as fs from 'fs';

import { Resource, round, Terminal, timestamp } from '@metacodi/node-utils';
import { ApiOptions } from '@metacodi/abstract-exchange';

import { BitgetApi } from '../src/bitget-api';
import { getApiKeys } from './api-keys';
import chalk from 'chalk';

/**
 * ```bash
 * npx ts-node test/do-metabot.ts
 * ```
 */

/** Crea sendos archivos `-raw.ts` con las respuestas originales obtenidas del exchange, sin parsear. */
const raw = true;
/** Ataca a la api de test o a la real. */
const isTest = false;
/** Muestra las cuentas sin movimientos y los listados sin órdenes. */
const verbose = false;

const unixTime = () => timestamp().replace(new RegExp(`[ :.-]`, 'g'), '_');
const ts = unixTime();

/** Archivo donde se escribirá la salida. */
const logFileName = `results/${ts}.ts`;

/** Escribe en el archivo `logFileName`. */
function writeLog(variable: string, data: any, fileName?: string) {
  const url = Resource.normalize(`./test/${fileName || logFileName}`);
  const value = JSON.stringify(data, null, ' ');
  // console.log(value);
  // fs.appendFileSync(url, `const ${variable} = ${value};\n\n`);
  const exists = Resource.exists(url) && Resource.isReadable(url);
  const previous = exists ? Resource.open(url) : '';
  const content = `const ${variable} = ${value};\n\n${previous}`;
  fs.writeFileSync(url, content);
}


const testApi = async () => {
  try {

    // Create output log folder.
    const logFolder = `metabot/snapshot`;  
    Resource.createFolder(`./test/${logFolder}`);

    const options: ApiOptions = { ...getApiKeys({ isTest }), isTest } as any;


    // ---------------------------------------------------------------------------------------------------
    //  SPOT
    // ---------------------------------------------------------------------------------------------------

    Terminal.log(`-- SPOT ------------------------------------`);

    const spot = new BitgetApi({ ...options, market: 'spot', raw });

    // (spot) exchange-info
    // ---------------------------------------------------------------------------------------------------
    Terminal.logInline(`- exchange-info`);
    const exchangeInfoSpot = await spot.getExchangeInfo();
    Terminal.success(`exchange-info`);
    writeLog(`spot_exchange_info_${ts}`, { ...exchangeInfoSpot, symbols: spot.exchangeSymbols }, `${logFolder}/(spot) exchange-info.ts`);

    // (spot) account-info
    // ---------------------------------------------------------------------------------------------------
    Terminal.logInline(`- account-balances`);
    const accountInfoSpot = await spot.getAccountInfo();
    accountInfoSpot.balances = (accountInfoSpot.balances || []).filter(b => !!b.balance);
    accountInfoSpot.positions = (accountInfoSpot.positions || []).filter(p => !!p.positionAmount);
    Terminal.success(`account-balances`);
    writeLog(`spot_account_balances_${ts}`, accountInfoSpot, `${logFolder}/(spot) account-balances-positions.ts`);

    // (spot) account-bill
    // ---------------------------------------------------------------------------------------------------
    Terminal.logInline(`- account-bill`);
    let pagBillSpot = 0;
    let lastBillSpotId: string | undefined = undefined;
    let countBillSpot = 0;
    let accountBillSpot: any = raw ? { parsed: [], raw: [] } : [];
    do {
      const limit = 500;
      const after = lastBillSpotId ? { after: lastBillSpotId } : undefined;
      const request = { ...after, limit };
      const response = await spot.getAccountBill(request);
      const rows = (raw ? response.raw.data : response) || [];
      if (rows.length) {
        pagBillSpot += 1;
        countBillSpot += rows.length;
        const last = rows[rows.length - 1];
        lastBillSpotId = last.billId;
        if (raw) {
          accountBillSpot.parsed.push(...response.parsed);
          accountBillSpot.raw.push(response.raw);
        } else {
          accountBillSpot.push(...response);
        }
      }
      if (rows.length < limit) {
        Terminal.success(`account-bill: ${chalk.yellow(countBillSpot)}${pagBillSpot > 1 ? ` (${pagBillSpot} pages)` : ''}`);
        break;
      } else {
        Terminal.logInline(`- account-bill: ${countBillSpot}${pagBillSpot > 1 ? ` (${pagBillSpot} pages)` : ''}`);
      }
    } while (true)
    if (countBillSpot || verbose) {
      if (raw) {
        writeLog(`spot_account_bill_${ts}`, accountBillSpot.parsed, `${logFolder}/(spot) account-bill.ts`);
        writeLog(`spot_account_bill_${ts}`, accountBillSpot.raw, `${logFolder}/(spot) account-bill-raw.ts`);
      } else {
        writeLog(`spot_account_bill_${ts}`, accountBillSpot, `${logFolder}/(spot) account-bill.ts`);
      }
    }

    // (spot) orders (by symbol)
    // ---------------------------------------------------------------------------------------------------
    // NOTA: Revisem els moviments del compte per extreure'n les monedes utilitzades i recuperar-ne les ordres.
    const coins: string[] = ((raw ? accountBillSpot.parsed : accountBillSpot) as any[] || [])
      .reduce((coins: string, m: any) => [...coins, ...(!coins.includes(m.coinName) ? [m.coinName] : [])], []);
    const symbolsSpot = spot.exchangeSymbols.filter(s => coins.includes(s.baseCoin));
    for (let i = 0; i < symbolsSpot.length; i++) {
      const quoteAsset: any = symbolsSpot[i].quoteCoin;
      const baseAsset: any = symbolsSpot[i].baseCoin;
      const symbol = `${symbolsSpot[i].baseCoin}_${symbolsSpot[i].quoteCoin}`;
      const resolved = spot.resolveSymbol({ quoteAsset, baseAsset }, false /* throwError */);
      if (resolved) {
        
        // (spot) open-orders
        // ---------------------------------------------------------------------------------------------------
        Terminal.logInline(`- orders-${chalk.green(`${symbol}`)}: open`);
        const openOrdersSpot: any = await spot.getOpenOrders({});
        const countOpenSpot = (raw ? openOrdersSpot.parsed.length : openOrdersSpot.length) || 0;
        if (countOpenSpot || verbose) {
          if (raw) {
            writeLog(`spot_open_orders_${symbol}_${ts}`, openOrdersSpot.parsed, `${logFolder}/(spot) open-orders.ts`);
            writeLog(`spot_open_orders_${symbol}_${ts}`, openOrdersSpot.raw, `${logFolder}/(spot) open-orders-raw.ts`);  
          } else {
            writeLog(`spot_open_orders_${symbol}_${ts}`, openOrdersSpot, `${logFolder}/(spot) open-orders.ts`);
          }
        }
        
        // (spot) history-orders
        // ---------------------------------------------------------------------------------------------------
        Terminal.logInline(`- orders-${chalk.green(`${symbol}`)}: history`);
        let pagHistorySpot = 0;
        let lastHistorySpotId: string | undefined = undefined;
        let countHistorySpot = 0;
        let historyOrdersSpot: any = raw ? { parsed: [], raw: [] } : [];
        do {
          const after = lastHistorySpotId ? { after: lastHistorySpotId } : undefined;
          // console.log(`\npag: ${pagHistorySpot}, lastId: ${lastHistorySpotId}`)
          const limit = 500;
          const request = { symbol: { quoteAsset, baseAsset }, ...after, limit };
          const response: any = await spot.getHistoryOrders(request);
          const rows: any[] = (raw ? response.parsed : response) || [];
          const news = rows.filter(r => !((raw ? historyOrdersSpot.parsed : historyOrdersSpot) as any[] || []).find(p => p.exchangeId === r.exchangeId))
          if (news.length) {
            pagHistorySpot += 1;
            countHistorySpot += news.length;
            const last = news[news.length - 1];
            lastHistorySpotId = last.exchangeId;
            if (raw) {
              historyOrdersSpot.parsed.push(...response.parsed);
              historyOrdersSpot.raw.push(response.raw);
            } else {
              historyOrdersSpot.push(...response);
            }
          }
          if (!news.length) {
            break;
          } else {
            Terminal.logInline(`- orders-${chalk.green(`${symbol}`)}: history${pagHistorySpot > 1 ? ` (${pagHistorySpot} pages)` : ''}`);
          }
        } while (true)
        if (countHistorySpot || verbose) {
          if (raw) {
            writeLog(`spot_history_orders_${symbol}_${ts}`, historyOrdersSpot.parsed, `${logFolder}/(spot) history-orders-${symbol}.ts`);
            writeLog(`spot_history_orders_${symbol}_${ts}`, historyOrdersSpot.raw, `${logFolder}/(spot) history-orders-${symbol}-raw.ts`);
          } else {
            writeLog(`spot_history_orders_${symbol}_${ts}`, historyOrdersSpot, `${logFolder}/(spot) history-orders-${symbol}.ts`);
          }
        }
        if (countOpenSpot || countHistorySpot) {
          Terminal.success(`orders-${chalk.green(`${symbol}`)}: ${chalk.yellow(countOpenSpot + countHistorySpot)}`);
        } else if (verbose) {
          Terminal.fail(`orders-${chalk.green(`${symbol}`)}: ${chalk.grey(countOpenSpot + countHistorySpot)}`);
        }

      } else {
        Terminal.error(`No s'ha trobat el símbol ${symbol} a spot.`, /* exit */ false);
      }
    }


    // ---------------------------------------------------------------------------------------------------
    //  FUTURES
    // ---------------------------------------------------------------------------------------------------

    Terminal.log(`-- FUTURES ------------------------------------`);

    const futures = new BitgetApi({ ...options, market: 'futures', raw });

    // (futures) exchange-info
    // ---------------------------------------------------------------------------------------------------
    Terminal.logInline(`exchange-info`);
    const exchangeInfoFutures = await futures.getExchangeInfo();
    writeLog(`futures_exchange_info_${ts}`, { ...exchangeInfoFutures, symbols: futures.exchangeSymbols }, `${logFolder}/(futures) exchange-info.ts`);
    Terminal.success(`exchange-info`);

    // (futures) account-info
    // ---------------------------------------------------------------------------------------------------
    Terminal.logInline(`- account-balances-positions`);
    const accountInfoFutures = await futures.getAccountInfo();
    accountInfoFutures.balances = (accountInfoFutures.balances || []).filter(b => !!b.balance);
    accountInfoFutures.positions = (accountInfoFutures.positions || []).filter(p => !!p.positionAmount);
    Terminal.success(`account-balances-positions`);
    writeLog(`futures_account_balances_positions_${ts}`, accountInfoFutures, `${logFolder}/(futures) account-balances-positions.ts`);

    const endTime = { endTime: moment().unix() * 1000 };
    const startTime = { startTime: moment().subtract(1, 'month').unix() * 1000 };

    // (futures) account-bill
    // ---------------------------------------------------------------------------------------------------
    // NOTA: Quan iterem les monedes suportades, obtindrem els símbols utilitzats examinant-ne els moviments.
    const symbolsFutures: string[] = [];
    // Iterem els tipus de productes derivats disponibles a Bitget.
    for (const productType of [ 'UMCBL', 'DMCBL' ]) {
      // Obtenim totes les monedes suportades pels símbols de l'exchange (supportMarginCoins: CoinType[]).
      const coinsFutures = futures.exchangeSymbols.filter(s => s.productType.toLowerCase() === productType.toLowerCase()).reduce(((distinct: string[], s: { supportMarginCoins: string[] }) => 
        [...distinct, ...s.supportMarginCoins?.filter(c => !distinct.includes(c)) ]
      ), []);
      for (const marginCoin of coinsFutures) {
        // Obtenim els moviments de la moneda.
        Terminal.logInline(`- account-bill-${chalk.green(marginCoin)}`);
        let pagBillFutures = 0;
        let lastBillFuturesTime: moment.Moment | undefined = undefined;
        let lastBillFuturesId: string | undefined = undefined;
        let countBillFutures = 0;
        let accountBillFutures: any = raw ? { parsed: [], raw: [] } : [];
        do {
          const lastEndId = lastBillFuturesId ? { lastEndId: lastBillFuturesId } : undefined;
          const endMoment = moment(lastBillFuturesTime ? lastBillFuturesTime : undefined);
          const endTime = { endTime: endMoment.unix() * 1000 };
          const startMoment = moment(endTime.endTime);
          const startTime = { startTime: startMoment.subtract(1, 'month').unix() * 1000 };
          // console.log(`\npag: ${pagBillFutures}, end: ${endMoment.format('YYYY-MM-DD HH:mm:ss')}, start: ${startMoment.format('YYYY-MM-DD HH:mm:ss')}`)
          const pageSize = 100;
          const request = { productType, marginCoin, ...startTime, ...endTime, ...lastEndId, pageSize }
          const response = await futures.getAccountBill(request);
          const rows = (raw ? response.parsed : response) || [];
          if (rows.length) {
            pagBillFutures += 1;
            countBillFutures += rows.length;
            const last = rows[rows.length - 1];
            lastBillFuturesId = last.id;
            lastBillFuturesTime = moment(+last.cTime);
            if (raw) {
              accountBillFutures.parsed.push(...response.parsed);
              accountBillFutures.raw.push(response.raw);
            } else {
              accountBillFutures.push(...response);
            }
          }
          if (rows.length) {
            // NOTA: Examinem els moviments per obtenir els símbols utilitzats, i més tard en recuperarem les ordres.
            const symbols: string[] = ((raw ? accountBillFutures.parsed : accountBillFutures) as any[] || [])
              .reduce((symbols: string, m: any) => [...symbols, ...(typeof m.symbol == 'string' && !symbols.includes(m.symbol) ? [m.symbol] : [])], [])
            ;
            symbolsFutures.push(...symbols.filter(s => !symbolsFutures.includes(s)));          
          }
          if (!rows.length) {
            if (countBillFutures) {
              Terminal.success(`account-bill-${chalk.green(marginCoin)}: ${chalk.yellow(countBillFutures)}${pagBillFutures > 1 ? ` (${pagBillFutures} pages)` : ''}`);
            } else if (verbose) {
              Terminal.fail(`account-bill-${chalk.green(marginCoin)}: ${chalk.grey(countBillFutures)}`);
            }
            break;
          } else {
            Terminal.logInline(`- account-bill-${chalk.green(marginCoin)}: ${countBillFutures}${pagBillFutures > 1 ? ` (${pagBillFutures} pages)` : ''}`);
          }
        } while (true)
        if (countBillFutures || verbose) {
          if (raw) {
            writeLog(`futures_account_bill_${marginCoin}_${ts}`, accountBillFutures.parsed, `${logFolder}/(futures) account-bill-${productType}.ts`);
            writeLog(`futures_account_bill_${marginCoin}_${ts}`, accountBillFutures.raw, `${logFolder}/(futures) account-bill-${productType}-raw.ts`);
          } else {
            writeLog(`futures_account_bill_${marginCoin}_${ts}`, accountBillFutures, `${logFolder}/(futures) account-bill-${productType}.ts`);
          }
        }
        if (countBillFutures) {
          // NOTA: Examinem els moviments per obtenir els símbols utilitzats, i més tard en recuperarem les ordres.
          const symbols: string[] = ((raw ? accountBillFutures.parsed : accountBillFutures) as any[] || [])
            .reduce((symbols: string, m: any) => [...symbols, ...(typeof m.symbol == 'string' && !symbols.includes(m.symbol) ? [m.symbol] : [])], [])
          ;
          symbolsFutures.push(...symbols.filter(s => !symbolsFutures.includes(s)));          
        }
      }
    }

    // (futures) orders (by symbol)
    // ---------------------------------------------------------------------------------------------------
    for (let i = 0; i < symbolsFutures.length; i++) {
      const product = futures.exchangeSymbols.find(s => s.symbol === symbolsFutures[i]);
      const quoteAsset: any = product.quoteCoin;
      const baseAsset: any = product.baseCoin;
      const symbol = product ? `${product.symbol}` : `${baseAsset}_${quoteAsset}`;
      const productType = product ? { productType: product.productType } : undefined;
      const resolved = futures.resolveSymbol({ quoteAsset, baseAsset, ...productType }, false /* throwError */);
      if (resolved) {
        
        // (futures) open-orders
        // ---------------------------------------------------------------------------------------------------
        Terminal.logInline(`- orders-${chalk.green(`${symbol}`)}: open`);
        const openOrdersFutures: any = await futures.getOpenOrders({ symbol : { quoteAsset, baseAsset }});
        const countOpenFutures = (raw ? openOrdersFutures.parsed.length : openOrdersFutures.length) || 0;
        if (countOpenFutures || verbose) {
          if (raw) {
            writeLog(`futures_open_orders_${symbol}_${ts}`, openOrdersFutures.parsed, `${logFolder}/(futures) open-orders.ts`);
            writeLog(`futures_open_orders_${symbol}_${ts}`, openOrdersFutures.raw, `${logFolder}/(futures) open-orders-raw.ts`);  
          } else {
            writeLog(`futures_open_orders_${symbol}_${ts}`, openOrdersFutures, `${logFolder}/(futures) open-orders.ts`);
          }
        }
  
        // (futures) history-orders
        // ---------------------------------------------------------------------------------------------------
        Terminal.logInline(`- orders-${chalk.green(`${symbol}`)}: history`);
        let pagHistoryFutures = 0;
        let lastHistoryFuturesTime: moment.Moment | undefined = undefined;
        let countHistoryFutures = 0;
        let historyOrdersFutures: any = raw ? { parsed: [], raw: [] } : [];
        do {
          const endMoment = moment(lastHistoryFuturesTime ? lastHistoryFuturesTime : undefined);
          const endTime = { endTime: endMoment.unix() * 1000 };
          const startMoment = moment(endTime.endTime);
          const startTime = { startTime: startMoment.subtract(1, 'month').unix() * 1000 };
          // console.log(`\npag: ${pagHistoryFutures}, end: ${endMoment.format('YYYY-MM-DD HH:mm:ss')}, start: ${startMoment.format('YYYY-MM-DD HH:mm:ss')}`)
          const pageSize = 100;
          const request = { symbol: { quoteAsset, baseAsset }, ...startTime, ...endTime, pageSize };
          const response: any = await futures.getHistoryOrders(request);
          const rows = (raw ? response.parsed : response) || [];
          if (rows.length) {
            pagHistoryFutures += 1;
            countHistoryFutures += rows.length;
            const last = rows[rows.length - 1];
            lastHistoryFuturesTime = moment(last.created);
            if (raw) {
              historyOrdersFutures.parsed.push(...response.parsed);
              historyOrdersFutures.raw.push(response.raw);
            } else {
              historyOrdersFutures.push(...response);
            }
          }
          if (!rows.length) {
            break;
          } else {
            Terminal.logInline(`- orders-${chalk.green(`${symbol}`)}: history${pagHistoryFutures > 1 ? ` (${pagHistoryFutures} pages)` : ''}`);
          }
        } while (true)
        if (countHistoryFutures || verbose) {
          if (raw) {
            writeLog(`futures_history_orders_${symbol}_${ts}`, historyOrdersFutures.parsed, `${logFolder}/(futures) history-orders-${symbol}.ts`);
            writeLog(`futures_history_orders_${symbol}_${ts}`, historyOrdersFutures.raw, `${logFolder}/(futures) history-orders-${symbol}-raw.ts`);
          } else {
            writeLog(`futures_history_orders_${symbol}_${ts}`, historyOrdersFutures, `${logFolder}/(futures) history-orders-${symbol}.ts`);
          }
        }   

        if (countOpenFutures || countHistoryFutures) {
          Terminal.success(`orders-${chalk.green(`${symbol}`)}: ${chalk.yellow(countOpenFutures + countHistoryFutures)}${pagHistoryFutures > 1 ? ` (${pagHistoryFutures} pages)` : ''}`);
        } else if (verbose) {
          Terminal.fail(`orders-${chalk.green(`${symbol}`)}: ${chalk.grey(countOpenFutures + countHistoryFutures)}`);
        }
      } else {
        Terminal.error(`No s'ha trobat el símbol ${symbol} a futures.`, /* exit */ false);
      }
    }

    Terminal.log(`-------------------------------------------------`);

  } catch (error) {
    Terminal.error(error, /* exit */ false);
    console.log(error);
  }
};

testApi();
