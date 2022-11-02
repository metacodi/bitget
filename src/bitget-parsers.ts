import moment, { unitOfTime } from 'moment';

import { timestamp, SymbolType, MarketType, MarketPrice, KlineIntervalType, Order, OrderSide, OrderType, OrderStatus, TradeSide, StopType, PositionSide, MarginMode } from '@metacodi/abstract-exchange';

import { BitgetMarginMode, BitgetOrderSide, BitgetOrderStatus, BitgetOrderTradeSide, BitgetOrderType, BitgetPlanStatus, BitgetPostOrderSide, BitgetStopType } from './bitget.types';


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

export const parsetOrderSideFutures = (trade: BitgetOrderTradeSide): OrderSide => {
  switch (trade) {
    case 'open_long': 
    case 'open_short': 
      return 'buy';
    case 'close_long': 
    case 'close_short': 
      return 'sell';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel parsetOrderSideFutures type '${trade}'` });
  }
}

export const formatOrderTradeSide = (side: OrderSide, tradeSide: TradeSide): BitgetOrderTradeSide => {
  switch (side) {
    case 'buy': return tradeSide === 'long' ? 'open_long' : 'open_short';
    case 'sell': return tradeSide === 'long' ? 'close_long' : 'close_short';
    default: throw ({ message: `No s'ha implementat el format Bitget pel side type '${side}'` });
  }
}

export const parsetOrderTradeSide = (tradeSide: BitgetPostOrderSide): TradeSide => {
  switch (tradeSide) {
    case 'long': return 'long';
    case 'short':  return 'short';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel parsetOrderTradeSide type '${tradeSide}'` });
  }
}

export const parsetOrderAlgoTradeSide = (tradeSide: BitgetOrderTradeSide): TradeSide => {
  switch (tradeSide) {
    case 'open_long': 
    case 'close_long': 
      return 'long';
      case 'open_short': 
      case 'close_short': 
       return 'short';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel parsetOrderAlgoTradeSide type '${tradeSide}'` });
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
    case 'full-fill': return 'filled';
    case 'partial-fill': return 'partial';
    case 'cancelled': return 'canceled';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderStatus type '${status}'` });
  }
}

export const formatOrderStatus = (status: OrderStatus): BitgetOrderStatus => {
  switch (status) {
    case 'new': return 'new';
    case 'filled': return 'full-fill';
    case 'partial': return 'partial-fill';
    case 'canceled': return 'cancelled';
    default: throw ({ message: `No s'ha implementat el format Bitget pel OrderStatus type '${status}'` });
  }
}

export const parsePlanStatus = (status: BitgetPlanStatus): OrderStatus => {
  switch (status) {
    case 'not_trigger': return 'new';
    case 'executing': return 'new'; // Que fem amb aquest estat ????????? 
    case 'triggered': return 'filled';
    case 'fail_trigger': return 'rejected';
    case 'cancel': return 'canceled';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel parsePlanStatus type '${status}'` });
  }
}

// Positions

export const parsetPositionTradeSide = (tradeSide: BitgetPostOrderSide): PositionSide => {
  switch (tradeSide) {
    case 'long': return 'long';
    case 'short': return 'short';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel PositionTradeSide type '${tradeSide}'` });
  }
}

export const parsetMarginMode = (tradeSide: BitgetMarginMode): MarginMode => {
  switch (tradeSide) {
    case 'crossed': return 'cross';
    case 'fixed': return 'isolated';
    default: throw ({ message: `No s'ha implementat el parser Bitget pel MarginMode type '${tradeSide}'` });
  }
}

