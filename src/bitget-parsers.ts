import moment, { unitOfTime } from 'moment';

import { timestamp } from '@metacodi/node-utils';
import { SymbolType, WsStreamType, MarketType, MarketPrice, MarketKline, calculateCloseTime, KlineIntervalType, Order, WsAccountUpdate, OrderSide, OrderType } from '@metacodi/abstract-exchange';

import { BitgetWsChannelEvent } from './bitget.types';


// export const parseSymbol = (symbol: string): SymbolType => {
//   // TODO: Resoldre el symbol a partir d'una llista obtinguda de l'exchange.
//   switch (symbol) {
//     case 'BTCUSDT': return { baseAsset: 'BTC', quoteAsset: 'USDT' };
//     case 'ETCUSDT': return { baseAsset: 'ETC', quoteAsset: 'USDT' };
//     case 'BNBUSDT': return { baseAsset: 'BNB', quoteAsset: 'USDT' };
//     default: throw ({ message: `No s'ha implementat el parser Bitget pel symbol '${symbol}'` });
//   }
// }

// export const formatSymbol = (symbol: SymbolType): string => {
//   // TODO: Resoldre el symbol a partir d'una llista obtinguda de l'exchange.
//   const { baseAsset, quoteAsset } = symbol;
//   return `${baseAsset}${quoteAsset}`;
// }


// export const parseMarketType = (market: BitgetInstrumentType): MarketType => {
//   // TODO: Obtenir el producte a partir de la llista de símbols obtinguda de l'exchange.
//   switch (market) {
//     case 'SP': return 'spot';
//     case 'mc': return 'futures';
//     // case 'SWAP': return 'futures';
//     // case 'MARGIN': return 'margin';
//     default: throw ({ message: `No s'ha implementat el parser Bitget pel market type '${market}'` });
//   }
// }

// export const formatMarketType = (market: MarketType): BitgetInstrumentType => {
//   // TODO: Obtenir el producte a partir de la llista de símbols obtinguda de l'exchange.
//   switch (market) {
//     case 'spot': return 'SP';
//     // case 'futures': return 'FUTURES';
//     case 'futures': return 'mc';
//     // case 'margin': return 'MARGIN';
//     default: throw ({ message: `No s'ha implementat el parser Bitget pel market type '${market}'` });
//   }
// }

// export const parseKlineInterval = (interval: string): KlineIntervalType => {
//   const unit = interval.charAt(interval.length - 1);
//   if (['H', 'D', 'W', 'Y'].includes(unit)) { interval = interval.toLocaleLowerCase(); }
//   return interval as KlineIntervalType;
// }

// export const formatKlineInterval = (interval: KlineIntervalType): string => {
//   const unit = interval.charAt(interval.length - 1) as unitOfTime.DurationConstructor;
//   if (['h', 'd', 'w', 'y'].includes(unit)) { interval = interval.toLocaleUpperCase() as any; }
//   return interval;
// }


// ---------------------------------------------------------------------------------------------------
//  Market STREAM
// ---------------------------------------------------------------------------------------------------

// /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#tickers-channel Tickers channel} */
// export const parsePriceTickerEvent = (ev: BitgetWsChannelEvent): MarketPrice => {
//   const instId: string = ev.arg.instId;
//   const symbol = parseSymbol(instId);
//   const data = ev.data[0];
//   const baseVolume = +data.baseVolume;
//   const quoteVolume = +data.quoteVolume;
//   return {
//     symbol,
//     price: +data.last,
//     baseVolume, quoteVolume,
//     timestamp: timestamp(moment(+data.systemTime)),
//   }
// }

// /**
//  * {@link https://bitgetlimited.github.io/apidoc/en/spot/#candlesticks-channel Candlesticks channel}
//  * {@link https://bitgetlimited.github.io/apidoc/en/mix/#candlesticks-channel Candlesticks channel}
//  */
// export const parseKlineTickerEvent = (ev: BitgetWsChannelEvent): MarketKline => {
//   const instId: string = ev.arg.instId;
//   const symbol = parseSymbol(instId);
//   // En la primera connexió ens arriben 500 candles de cop, notifiquem només la darrera que és la més recent.
//   const data = ev.data[ev.data.length - 1];
//   const interval = ev.arg.channel.replace('candle', '') as KlineIntervalType;
//   const openTime = timestamp(moment(+data[0]));
//   const closeTime = calculateCloseTime(openTime, interval);
//   const baseVolume = +data[5];
//   const quoteVolume = +data[5] * +data[4];
//   return {
//     symbol, openTime, closeTime, interval,
//     open: +data[1],
//     high: +data[2],
//     low: +data[3],
//     close: +data[4],
//     baseVolume, quoteVolume,
//   }
// }