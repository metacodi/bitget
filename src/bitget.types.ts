import moment from 'moment';

import { timestamp } from '@metacodi/node-utils';
import { ApiOptions, MarketType, SymbolType, MarketPrice, WsStreamType, KlineIntervalType, CoinType } from '@metacodi/abstract-exchange';


// ---------------------------------------------------------------------------------------------------
//  shared types
// ---------------------------------------------------------------------------------------------------

export type BitgetInstrumentType = 'sp' | 'mc';

export type BitgetUrlMarketType = 'spot' | 'mix';

export type BitgetOrderForceType = 'normal' | 'post_only' | 'fok' | 'ioc';

export type BitgetOrderStatus = 'new' | 'partial_fill' | 'full_fill' | 'cancelled';

export type BitgetOrderSide = 'buy' | 'sell';

// ---------------------------------------------------------------------------------------------------
//  Websocket
// ---------------------------------------------------------------------------------------------------

export type BitgetWsChannelType = 'ticker' | `candle${KlineIntervalType}` | 'account' | 'positions' | 'balance_and_position' | 'orders' | 'orders-algo' | 'liquidation-warning';

export type BitgetWsEventType = 'pong' | 'login' | 'subscribe' | 'unsubscribe';

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
