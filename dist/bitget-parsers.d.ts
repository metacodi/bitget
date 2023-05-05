import { OrderSide, OrderType, OrderStatus, TradeSide, StopType, PositionSide, MarginMode } from '@metacodi/abstract-exchange';
import { BitgetMarginMode, BitgetOrderSide, BitgetOrderStatus, BitgetFuturesTradeSide, BitgetOrderType, BitgetPlanStatus, BitgetPlanType, BitgetTradeSide, BitgetStopType, BitgetFuturesOrderStatus } from './bitget.types';
export declare const parseOrderSide: (side: BitgetOrderSide) => OrderSide;
export declare const formatOrderSide: (side: OrderSide) => BitgetOrderSide;
export declare const parseFuturesOrderSide: (trade: BitgetFuturesTradeSide) => OrderSide;
export declare const formatFuturesTradeSide: (side: OrderSide, tradeSide: TradeSide) => BitgetFuturesTradeSide;
export declare const parseFuturesTradeSide: (tradeSide: BitgetFuturesTradeSide) => TradeSide;
export declare const parseOrderType: (orrderType: BitgetOrderType) => OrderType;
export declare const formatOrderType: (orrderType: OrderType) => BitgetOrderType;
export declare const parseStopType: (type: BitgetStopType) => StopType;
export declare const parsePlanType: (type: BitgetPlanType) => StopType;
export declare const formatStopType: (type: StopType) => BitgetStopType;
export declare const parseOrderStatus: (status: BitgetOrderStatus) => OrderStatus;
export declare const formatOrderStatus: (status: OrderStatus) => BitgetOrderStatus;
export declare const parseFuturesOrderStatus: (status: BitgetFuturesOrderStatus) => OrderStatus;
export declare const formatFuturesOrderStatus: (status: OrderStatus) => BitgetFuturesOrderStatus;
export declare const parsePlanStatus: (status: BitgetPlanStatus) => OrderStatus;
export declare const parsePositionTradeSide: (tradeSide: BitgetTradeSide) => PositionSide;
export declare const parseMarginMode: (tradeSide: BitgetMarginMode) => MarginMode;
//# sourceMappingURL=bitget-parsers.d.ts.map