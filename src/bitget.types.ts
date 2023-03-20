import moment from 'moment';

import { ApiOptions, MarketType, SymbolType, MarketPrice, WsStreamType, KlineIntervalType, CoinType } from '@metacodi/abstract-exchange';


// ---------------------------------------------------------------------------------------------------
//  shared types
// ---------------------------------------------------------------------------------------------------

export type BitgetInstrumentType = 'sp' | 'mc';

export type BitgetUrlMarketType = 'spot' | 'mix';

export type BitgetMarginMode = 'fixed' | 'crossed';


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
  'partial-fill' | //	Partially filled
  'full-fill' | //	Fully filled
  'cancelled' //	Cancelled
  ;

/** {@link https://bitgetlimited.github.io/apidoc/en/mix/#planstatus } */
export type BitgetPlanStatus =
  'not_trigger' |
  'executing' |
  'triggered' |
  'fail_trigger' |
  'cancel'
  ;

/** {@link https://bitgetlimited.github.io/apidoc/en/spot/#side } */
export type BitgetOrderSide = 'buy' | 'sell';

/** {@link https://bitgetlimited.github.io/apidoc/en/mix/#tradeside } */
export type BitgetOrderTradeSide = 
'open_long' |
'open_short' |
'close_long' |
'close_short' |
'burst_close_long' |
'burst_close_short' |
'offset_close_long' |
'offset_close_short' 
;
export type BitgetPostOrderSide = 'long' | 'short';
export type BitgetPostPosiSide = 'long' | 'short';

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

/** {@link https://bitgetlimited.github.io/apidoc/en/mix/#plantype API planType} */
export type BitgetStopType = 
'normal_plan' | 'profit_plan' | 'loss_plan'

/** {@link https://bitgetlimited.github.io/apidoc/en/mix/#websocket-plantype Websocket planType} */
export type BitgetPlanType = 
  'pl' | // default, push data whenever a plan order is created/cancelled/modified/triggered
  'tp' | // take profit event, push data when a take profit order(partial position) is created/cancelled/modified/triggered
  'sl' | // stop loss event, push data when a stop loss order(partial position) is created/cancelled/modified/triggered
  'ptp' | // position take profit event, push data when a position take profit order(whole position) is created/cancelled/modified/triggered
  'psl' // position stop loss event, push data when a position stop loss order(whole position) is created/cancelled/modified/triggered
;







export const v: BitgetPlanType = 'pl';

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
