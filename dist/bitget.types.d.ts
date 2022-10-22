import { KlineIntervalType } from '@metacodi/abstract-exchange';
export declare type BitgetInstrumentType = 'sp' | 'mc';
export declare type BitgetUrlMarketType = 'spot' | 'mix';
export declare type BitgetOrderForceType = 'normal' | 'post_only' | 'fok' | 'ioc';
export declare type BitgetOrderStatus = 'new' | 'partial_fill' | 'full_fill' | 'cancelled';
export declare type BitgetPlanStatus = 'not_trigger' | 'triggered' | 'fail_trigger' | 'cancel';
export declare type BitgetOrderSide = 'buy' | 'sell';
export declare type BitgetOrderTradeSide = 'open_long' | 'open_short' | 'close_long' | 'close_short' | 'burst_close_long' | 'burst_close_short' | 'offset_close_long' | 'offset_close_short';
export declare type BitgetOrderType = 'market' | 'limit';
export declare type accountType = 'EXCHANGE' | 'OTC_SGD' | 'CONTRACT' | 'USD_MIX' | 'USDT_MIX';
export declare type BitgetStopType = 'normal_plan' | 'profit_plan' | 'loss_plan';
export declare type BitgetWsChannelType = 'ticker' | `candle${KlineIntervalType}` | 'account' | 'positions' | 'balance_and_position' | 'orders' | 'ordersAlgo' | 'liquidation-warning';
export declare type BitgetWsEventType = 'pong' | 'login' | 'subscribe' | 'unsubscribe' | 'error';
export interface BitgetWsLoginRequest {
    op: 'login';
    args: [
        {
            apiKey: string;
            passphrase: string;
            timestamp: number;
            sign: string;
        }
    ];
}
export interface BitgetWsSubscriptionRequest {
    op: 'subscribe' | 'unsubscribe';
    args: [{
        [key: string]: any;
    }];
}
export declare type BitgetWsChannelEvent = {
    arg: BitgetWsSubscriptionArguments;
} & {
    data: any[];
};
export interface BitgetWsSubscriptionArguments {
    channel: BitgetWsChannelType;
    [key: string]: any;
}
//# sourceMappingURL=bitget.types.d.ts.map