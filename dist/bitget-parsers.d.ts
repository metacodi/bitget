import { OrderSide, OrderType, OrderStatus, TradeSide, StopType, PositionSide, MarginMode } from '@metacodi/abstract-exchange';
import { BitgetMarginMode, BitgetOrderSide, BitgetOrderStatus, BitgetOrderTradeSide, BitgetOrderType, BitgetPlanStatus, BitgetPlanType, BitgetPostOrderSide, BitgetStopType } from './bitget.types';
export declare const parseOrderSide: (side: BitgetOrderSide) => OrderSide;
export declare const formatOrderSide: (side: OrderSide) => BitgetOrderSide;
export declare const parsetOrderSideFutures: (trade: BitgetOrderTradeSide) => OrderSide;
export declare const formatOrderTradeSide: (side: OrderSide, tradeSide: TradeSide) => BitgetOrderTradeSide;
export declare const parsetOrderTradeSide: (tradeSide: BitgetPostOrderSide) => TradeSide;
export declare const parsetOrderAlgoTradeSide: (tradeSide: BitgetOrderTradeSide) => TradeSide;
export declare const parseOrderType: (orrderType: BitgetOrderType) => OrderType;
export declare const formatOrderType: (orrderType: OrderType) => BitgetOrderType;
export declare const parseStopType: (type: BitgetStopType) => StopType;
export declare const parsePlanType: (type: BitgetPlanType) => StopType;
export declare const formatStopType: (type: StopType) => BitgetStopType;
export declare const parseOrderStatus: (status: BitgetOrderStatus) => OrderStatus;
export declare const formatOrderStatus: (status: OrderStatus) => BitgetOrderStatus;
export declare const parsePlanStatus: (status: BitgetPlanStatus) => OrderStatus;
export declare const parsetPositionTradeSide: (tradeSide: BitgetPostOrderSide) => PositionSide;
export declare const parsetMarginMode: (tradeSide: BitgetMarginMode) => MarginMode;
//# sourceMappingURL=bitget-parsers.d.ts.map