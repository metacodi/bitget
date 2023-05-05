"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMarginMode = exports.parsePositionTradeSide = exports.parsePlanStatus = exports.formatFuturesOrderStatus = exports.parseFuturesOrderStatus = exports.formatOrderStatus = exports.parseOrderStatus = exports.formatStopType = exports.parsePlanType = exports.parseStopType = exports.formatOrderType = exports.parseOrderType = exports.parseFuturesTradeSide = exports.formatFuturesTradeSide = exports.parseFuturesOrderSide = exports.formatOrderSide = exports.parseOrderSide = void 0;
const parseOrderSide = (side) => {
    switch (side) {
        case 'buy': return 'buy';
        case 'sell': return 'sell';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderSide type '${side}'` });
    }
};
exports.parseOrderSide = parseOrderSide;
const formatOrderSide = (side) => {
    switch (side) {
        case 'buy': return 'buy';
        case 'sell': return 'sell';
        default: throw ({ message: `No s'ha implementat el format Bitget pel OrderSide type '${side}'` });
    }
};
exports.formatOrderSide = formatOrderSide;
const parseFuturesOrderSide = (trade) => {
    switch (trade) {
        case 'open_long':
        case 'open_short':
            return 'buy';
        case 'close_long':
        case 'close_short':
            return 'sell';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel parseFuturesOrderSide type '${trade}'` });
    }
};
exports.parseFuturesOrderSide = parseFuturesOrderSide;
const formatFuturesTradeSide = (side, tradeSide) => {
    switch (side) {
        case 'buy': return tradeSide === 'long' ? 'open_long' : 'open_short';
        case 'sell': return tradeSide === 'long' ? 'close_long' : 'close_short';
        default: throw ({ message: `No s'ha implementat el format Bitget pel side type '${side}'` });
    }
};
exports.formatFuturesTradeSide = formatFuturesTradeSide;
const parseFuturesTradeSide = (tradeSide) => {
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
};
exports.parseFuturesTradeSide = parseFuturesTradeSide;
const parseOrderType = (orrderType) => {
    switch (orrderType) {
        case 'market': return 'market';
        case 'limit': return 'limit';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderType type '${orrderType}'` });
    }
};
exports.parseOrderType = parseOrderType;
const formatOrderType = (orrderType) => {
    switch (orrderType) {
        case 'market': return 'market';
        case 'limit': return 'limit';
        default: throw ({ message: `No s'ha implementat el format Bitget pel OrderType type '${orrderType}'` });
    }
};
exports.formatOrderType = formatOrderType;
const parseStopType = (type) => {
    switch (type) {
        case 'normal_plan': return 'normal';
        case 'profit_plan': return 'profit';
        case 'loss_plan': return 'loss';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel StopType type '${type}'` });
    }
};
exports.parseStopType = parseStopType;
const parsePlanType = (type) => {
    switch (type) {
        case 'pl': return 'normal';
        case 'tp': return 'profit';
        case 'sl': return 'loss';
        case 'ptp': return 'profit-position';
        case 'psl': return 'loss-position';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel PlanType type '${type}'` });
    }
};
exports.parsePlanType = parsePlanType;
const formatStopType = (type) => {
    switch (type) {
        case 'normal': return 'normal_plan';
        case 'profit': return 'profit_plan';
        case 'loss': return 'loss_plan';
        default: throw ({ message: `No s'ha implementat el format Bitget pel StopSide type '${type}'` });
    }
};
exports.formatStopType = formatStopType;
const parseOrderStatus = (status) => {
    switch (status) {
        case 'new': return 'new';
        case 'full_fill': return 'filled';
        case 'partial_fill': return 'partial';
        case 'cancelled': return 'canceled';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderStatus type '${status}'` });
    }
};
exports.parseOrderStatus = parseOrderStatus;
const formatOrderStatus = (status) => {
    switch (status) {
        case 'new': return 'new';
        case 'filled': return 'full_fill';
        case 'partial': return 'partial_fill';
        case 'canceled': return 'cancelled';
        default: throw ({ message: `No s'ha implementat el format Bitget pel OrderStatus type '${status}'` });
    }
};
exports.formatOrderStatus = formatOrderStatus;
const parseFuturesOrderStatus = (status) => {
    switch (status) {
        case 'init': return 'new';
        case 'new': return 'new';
        case 'filled': return 'filled';
        case 'partially_filled': return 'partial';
        case 'canceled': return 'canceled';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderStatus type '${status}'` });
    }
};
exports.parseFuturesOrderStatus = parseFuturesOrderStatus;
const formatFuturesOrderStatus = (status) => {
    switch (status) {
        case 'new': return 'new';
        case 'filled': return 'filled';
        case 'partial': return 'partially_filled';
        case 'canceled': return 'canceled';
        default: throw ({ message: `No s'ha implementat el format Bitget pel OrderStatus type '${status}'` });
    }
};
exports.formatFuturesOrderStatus = formatFuturesOrderStatus;
const parsePlanStatus = (status) => {
    switch (status) {
        case 'not_trigger': return 'new';
        case 'executing': return 'partial';
        case 'triggered': return 'filled';
        case 'fail_trigger': return 'rejected';
        case 'cancel': return 'canceled';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel parsePlanStatus type '${status}'` });
    }
};
exports.parsePlanStatus = parsePlanStatus;
const parsePositionTradeSide = (tradeSide) => {
    switch (tradeSide) {
        case 'long': return 'long';
        case 'short': return 'short';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel PositionTradeSide type '${tradeSide}'` });
    }
};
exports.parsePositionTradeSide = parsePositionTradeSide;
const parseMarginMode = (tradeSide) => {
    switch (tradeSide) {
        case 'crossed': return 'cross';
        case 'fixed': return 'isolated';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel MarginMode type '${tradeSide}'` });
    }
};
exports.parseMarginMode = parseMarginMode;
//# sourceMappingURL=bitget-parsers.js.map