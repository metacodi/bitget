import moment, { unitOfTime } from 'moment';

import { timestamp, SymbolType, MarketType, MarketPrice, KlineIntervalType, Order, OrderSide, OrderType, OrderStatus, TradeSide, StopType, PositionSide, MarginMode } from '@metacodi/abstract-exchange';

import { BitgetMarginMode, BitgetOrderSide, BitgetOrderStatus, BitgetFuturesTradeSide, BitgetOrderType, BitgetPlanStatus, BitgetPlanType, BitgetTradeSide, BitgetStopType, BitgetFuturesOrderStatus } from './bitget.types';


export const parseOrderSide = (side: BitgetOrderSide): OrderSide => {
  switch (side) {
    case 'buy': return 'buy';
    case 'sell': return 'sell';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderSide type '${side}'` });
  }
}

export const formatOrderSide = (side: OrderSide): BitgetOrderSide => {
  switch (side) {
    case 'buy': return 'buy';
    case 'sell': return 'sell';
    default: throw ({ message: `No s'ha implementat el format Bitget pel OrderSide type '${side}'` });
  }
}

export const parseFuturesOrderSide = (trade: BitgetFuturesTradeSide): OrderSide => {
  switch (trade) {
    case 'open_long': 
    case 'open_short': 
      return 'buy';
    case 'close_long': 
    case 'close_short': 
      return 'sell';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel parseFuturesOrderSide type '${trade}'` });
  }
}

export const formatFuturesTradeSide = (side: OrderSide, tradeSide: TradeSide): BitgetFuturesTradeSide => {
  switch (side) {
    case 'buy': return tradeSide === 'long' ? 'open_long' : 'open_short';
    case 'sell': return tradeSide === 'long' ? 'close_long' : 'close_short';
    default: throw ({ message: `No s'ha implementat el format Bitget pel side type '${side}'` });
  }
}

export const parseFuturesTradeSide = (tradeSide: BitgetFuturesTradeSide): TradeSide => {
  switch (tradeSide) {
    case 'open_long':
    case 'close_long':
    case 'offset_close_long':
    case 'burst_close_long':
      return 'long';
    case 'open_short':
    case 'close_short':
    case 'offset_close_short':
    case 'burst_close_short':
      return 'short';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel parseFuturesTradeSide type '${tradeSide}'` });
  }
}

export const parseOrderType = (orrderType: BitgetOrderType, ): OrderType => {
  switch (orrderType) {
    case 'market': return 'market';
    case 'limit': return 'limit';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderType type '${orrderType}'` });
  }
}

export const formatOrderType = (orrderType: OrderType): BitgetOrderType => {
  switch (orrderType) {
    case 'market': return 'market';
    case 'limit': return 'limit';
    default: throw ({ message: `No s'ha implementat el format Bitget pel OrderType type '${orrderType}'` });
  }
}

export const parseStopType = (type: BitgetStopType): StopType => {
  switch (type) {
    case 'normal_plan': return 'normal';
    case 'profit_plan': return 'profit';
    case 'loss_plan': return 'loss';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel StopType type '${type}'` });
  }
}

export const parsePlanType = (type: BitgetPlanType): StopType => {
  switch (type) {
    case 'pl': return 'normal';
    case 'tp': return 'profit';
    case 'sl': return 'loss';
    case 'ptp': return 'profit-position';
    case 'psl': return 'loss-position';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel PlanType type '${type}'` });
  }
}

export const formatStopType = (type: StopType): BitgetStopType => {
  switch (type) {
    case 'normal': return 'normal_plan';
    case 'profit': return 'profit_plan';
    case 'loss': return 'loss_plan';
    default: throw ({ message: `No s'ha implementat el format Bitget pel StopSide type '${type}'` });
  }
}

export const parseOrderStatus = (status: BitgetOrderStatus): OrderStatus => {
  switch (status) {
    case 'new': return 'new';
    case 'full_fill': return 'filled';
    case 'partial_fill': return 'partial';
    case 'cancelled': return 'canceled';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderStatus type '${status}'` });
  }
}

export const formatOrderStatus = (status: OrderStatus): BitgetOrderStatus => {
  switch (status) {
    case 'new': return 'new';
    case 'filled': return 'full_fill';
    case 'partial': return 'partial_fill';
    case 'canceled': return 'cancelled';
    default: throw ({ message: `No s'ha implementat el format Bitget pel OrderStatus type '${status}'` });
  }
}

export const parseFuturesOrderStatus = (status: BitgetFuturesOrderStatus): OrderStatus => {
  switch (status) {
    case 'init': return 'new';
    case 'new': return 'new';
    case 'filled': return 'filled';
    case 'partially_filled': return 'partial';
    case 'canceled': return 'canceled';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderStatus type '${status}'` });
  }
}

export const formatFuturesOrderStatus = (status: OrderStatus): BitgetFuturesOrderStatus => {
  switch (status) {
    case 'new': return 'new';
    case 'filled': return 'filled';
    case 'partial': return 'partially_filled';
    case 'canceled': return 'canceled';
    default: throw ({ message: `No s'ha implementat el format Bitget pel OrderStatus type '${status}'` });
  }
}

export const parsePlanStatus = (status: BitgetPlanStatus): OrderStatus => {
  switch (status) {
    case 'not_trigger': return 'new';
    case 'executing': return 'partial'; // Que fem amb aquest estat ????????? 
    case 'triggered': return 'filled';
    case 'fail_trigger': return 'rejected';
    case 'cancel': return 'canceled';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel parsePlanStatus type '${status}'` });
  }
}

// Positions

export const parsePositionTradeSide = (tradeSide: BitgetTradeSide): PositionSide => {
  switch (tradeSide) {
    case 'long': return 'long';
    case 'short': return 'short';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel PositionTradeSide type '${tradeSide}'` });
  }
}

export const parseMarginMode = (tradeSide: BitgetMarginMode): MarginMode => {
  switch (tradeSide) {
    case 'crossed': return 'cross';
    case 'fixed': return 'isolated';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel MarginMode type '${tradeSide}'` });
  }
}

