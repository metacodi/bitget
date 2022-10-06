import moment, { unitOfTime } from 'moment';

import { timestamp } from '@metacodi/node-utils';
import { SymbolType, WsStreamType, MarketType, MarketPrice, MarketKline, calculateCloseTime, KlineIntervalType, Order, WsBalancePositionUpdate, WsAccountUpdate, OrderSide, OrderType } from '@metacodi/abstract-exchange';

import { BitgetMarketType, BitgetWsChannelEvent } from './bitget.types';



export const parseSymbol = (symbol: string): SymbolType => {
  switch (symbol) {
    case 'BTCUSDT': return 'BTC_USDT';
    case 'ETCUSDT': return 'ETC_USDT';
    case 'BNBUSDT': return 'BNB_USDT';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel symbol '${symbol}'` });
  }
}

export const formatSymbol = (symbol: SymbolType): string => {
  return symbol.replace('_', '');
}


export const parseMarketType = (market: BitgetMarketType): MarketType => {
  switch (market) {
    case 'SP': return 'spot';
    case 'mc': return 'futures';
    // case 'SWAP': return 'futures';
    // case 'MARGIN': return 'margin';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel market type '${market}'` });
  }
}

export const formatMarketType = (market: MarketType): BitgetMarketType => {
  switch (market) {
    case 'spot': return 'SP';
    // case 'futures': return 'FUTURES';
    case 'futures': return 'mc';
    // case 'margin': return 'MARGIN';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel market type '${market}'` });
  }
}


// ---------------------------------------------------------------------------------------------------
//  Market STREAM
// ---------------------------------------------------------------------------------------------------

/** {@link https://bitgetlimited.github.io/apidoc/en/spot/#tickers-channel Tickers channel} */
export const parsePriceTickerEvent = (ev: BitgetWsChannelEvent): MarketPrice => {
  const instId: string = ev.arg.instId;
  const symbol = parseSymbol(instId);
  const data = ev.data[0];
  const baseVolume = +data.baseVolume;
  const quoteVolume = +data.quoteVolume;
  return {
    symbol,
    price: +data.last,
    baseVolume, quoteVolume,
    timestamp: timestamp(moment(+data.systemTime)),
  }
}

/** {@link https://bitgetlimited.github.io/apidoc/en/spot/#candlesticks-channel Candlesticks channel} */
export const parseKlineTickerEvent = (ev: BitgetWsChannelEvent): MarketKline => {
  const instId: string = ev.arg.instId;
  const symbol = parseSymbol(instId);
  // En la primera connexió ens arriben 500 candles de cop, notifiquem només la darrera que és la més recent.
  const data = ev.data[ev.data.length - 1];
  const interval = ev.arg.channel.replace('candle', '') as KlineIntervalType;
  const openTime = timestamp(moment(+data[0]));
  const closeTime = calculateCloseTime(openTime, interval);
  const baseVolume = +data[5];
  const quoteVolume = +data[5] * +data[4];
  return {
    symbol, openTime, closeTime, interval,
    open: +data[1],
    high: +data[2],
    low: +data[3],
    close: +data[4],
    baseVolume, quoteVolume,
  }
}