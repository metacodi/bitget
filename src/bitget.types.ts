import moment from 'moment';

import { timestamp } from '@metacodi/node-utils';
import { ApiOptions, MarketType, SymbolType, MarketPrice, WsStreamType, KlineIntervalType, CoinType } from '@metacodi/abstract-exchange';


// ---------------------------------------------------------------------------------------------------
//  shared types
// ---------------------------------------------------------------------------------------------------

export type BitgetInstrumentType = 'sp' | 'mc';

export type BitgetUrlMarketType = 'spot' | 'mix';

/** {@link https://bitgetlimited.github.io/apidoc/en/spot/#ordertypeforce } */
export type BitgetOrderForceType =
  'normal' | //	Good till cancel
  'post_only' | //	Maker Only
  'fok' | //	Fill Or Kill（FOK）
  'ioc'  //	Immediate-Or-Cancel（IOC）
  ;

/** {@link https://bitgetlimited.github.io/apidoc/en/spot/#status } */
export type BitgetOrderStatus =
  'new' | //	Unfilled
  'partial_fill' | //	Partially filled
  'full_fill' | //	Fully filled
  'cancelled' //	Cancelled
  ;

/** {@link https://bitgetlimited.github.io/apidoc/en/spot/#side } */
export type BitgetOrderSide = 'buy' | 'sell';

/** {@link https://bitgetlimited.github.io/apidoc/en/spot/#ordertype } */
export type BitgetOrderType =
'market' | // market order
'limit' // limit order
;

/** {@link https://bitgetlimited.github.io/apidoc/en/spot/#accounttype } */
export type accountType =
  'EXCHANGE' | //	spot account
  'OTC_SGD' | //	Otc account
  'CONTRACT' | //	contract account
  'USD_MIX' | //	Mix account
  'USDT_MIX' //	USDT Future Account
  ;

// ---------------------------------------------------------------------------------------------------
//  Websocket
// ---------------------------------------------------------------------------------------------------

export type BitgetWsChannelType = 'ticker' | `candle${KlineIntervalType}` | 'account' | 'positions' | 'balance_and_position' | 'orders' | 'ordersAlgo' | 'liquidation-warning';

export type BitgetWsEventType = 'pong' | 'login' | 'subscribe' | 'unsubscribe' | 'error';

export interface BitgetWsLoginRequest {
  op: 'login',
  args: [
    {
      apiKey: string;
      passphrase: string;
      timestamp: number,
      sign: string;
    }
  ]
}

export interface BitgetWsSubscriptionRequest {
  op: 'subscribe' | 'unsubscribe';
  args: [{ [key: string]: any }];
}

export type BitgetWsChannelEvent = { arg: BitgetWsSubscriptionArguments } & { data: any[] };

export interface BitgetWsSubscriptionArguments {
  channel: BitgetWsChannelType;
  [key: string]: any;
}
