import { OrderSide, OrderType, OrderStatus, TradeSide, StopType } from '@metacodi/abstract-exchange';
import { BitgetOrderSide, BitgetOrderStatus, BitgetOrderTradeSide, BitgetOrderType, BitgetPlanStatus, BitgetPostOrderSide, BitgetStopType } from './bitget.types';
export declare const parseOrderSide: (side: BitgetOrderSide) => OrderSide;
export declare const formatOrderSide: (side: OrderSide) => BitgetOrderSide;
export declare const parsetOrderSideFutures: (trade: BitgetOrderTradeSide) => OrderSide;
export declare const formatOrderTradeSide: (side: OrderSide, tradeSide: TradeSide) => BitgetOrderTradeSide;
export declare const parsetOrderTradeSide: (tradeSide: BitgetPostOrderSide) => TradeSide;
export declare const parseOrderType: (market: BitgetOrderType) => OrderType;
export declare const formatOrderType: (market: OrderType) => BitgetOrderType;
export declare const parseStopType: (market: BitgetStopType) => StopType;
export declare const formatStopType: (market: StopType) => BitgetStopType;
export declare const parseOrderStatus: (market: BitgetOrderStatus) => OrderStatus;
export declare const formatOrderStatus: (market: OrderStatus) => BitgetOrderStatus;
export declare const parsePlanStatus: (market: BitgetPlanStatus) => OrderStatus;
//# sourceMappingURL=bitget-parsers.d.ts.map