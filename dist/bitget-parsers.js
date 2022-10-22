"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePlanStatus = exports.formatOrderStatus = exports.parseOrderStatus = exports.formatStopType = exports.parseStopType = exports.formatOrderType = exports.parseOrderType = exports.parsetOrderTradeSide = exports.formatOrderTradeSide = exports.parsetOrderSideFutures = exports.formatOrderSide = exports.parseOrderSide = void 0;
const parseOrderSide = (market) => {
    switch (market) {
        case 'buy': return 'buy';
        case 'sell': return 'sell';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderSide type '${market}'` });
    }
};
exports.parseOrderSide = parseOrderSide;
const formatOrderSide = (market) => {
    switch (market) {
        case 'buy': return 'buy';
        case 'sell': return 'sell';
        default: throw ({ message: `No s'ha implementat el format Bitget pel OrderSide type '${market}'` });
    }
};
exports.formatOrderSide = formatOrderSide;
const parsetOrderSideFutures = (market) => {
    switch (market) {
        case 'open_long':
        case 'open_short':
            return 'buy';
        case 'close_long':
        case 'close_short':
            return 'sell';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderSideFutures type '${market}'` });
    }
};
exports.parsetOrderSideFutures = parsetOrderSideFutures;
const formatOrderTradeSide = (side, tradeSide) => {
    switch (side) {
        case 'buy': return tradeSide === 'long' ? 'open_long' : 'open_short';
        case 'sell': return tradeSide === 'long' ? 'close_long' : 'close_short';
        default: throw ({ message: `No s'ha implementat el format Bitget pel side type '${side}'` });
    }
};
exports.formatOrderTradeSide = formatOrderTradeSide;
const parsetOrderTradeSide = (market) => {
    switch (market) {
        case 'open_long':
        case 'close_long':
            return 'long';
        case 'open_short':
        case 'close_short':
            return 'short';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel TradeSide type '${market}'` });
    }
};
exports.parsetOrderTradeSide = parsetOrderTradeSide;
const parseOrderType = (market) => {
    switch (market) {
        case 'market': return 'market';
        case 'limit': return 'limit';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderType type '${market}'` });
    }
};
exports.parseOrderType = parseOrderType;
const formatOrderType = (market) => {
    switch (market) {
        case 'market': return 'market';
        case 'limit': return 'limit';
        default: throw ({ message: `No s'ha implementat el format Bitget pel OrderSide type '${market}'` });
    }
};
exports.formatOrderType = formatOrderType;
const parseStopType = (market) => {
    switch (market) {
        case 'normal_plan': return 'normal';
        case 'profit_plan': return 'profit';
        case 'loss_plan': return 'loss';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel StopType type '${market}'` });
    }
};
exports.parseStopType = parseStopType;
const formatStopType = (market) => {
    switch (market) {
        case 'normal': return 'normal_plan';
        case 'profit': return 'profit_plan';
        case 'loss': return 'loss_plan';
        default: throw ({ message: `No s'ha implementat el format Bitget pel StopSide type '${market}'` });
    }
};
exports.formatStopType = formatStopType;
const parseOrderStatus = (market) => {
    switch (market) {
        case 'new': return 'new';
        case 'full_fill': return 'filled';
        case 'partial_fill': return 'partial';
        case 'cancelled': return 'canceled';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderStatus type '${market}'` });
    }
};
exports.parseOrderStatus = parseOrderStatus;
const formatOrderStatus = (market) => {
    switch (market) {
        case 'new': return 'new';
        case 'filled': return 'full_fill';
        case 'partial': return 'partial_fill';
        case 'canceled': return 'cancelled';
        default: throw ({ message: `No s'ha implementat el format Bitget pel OrderStatus type '${market}'` });
    }
};
exports.formatOrderStatus = formatOrderStatus;
const parsePlanStatus = (market) => {
    switch (market) {
        case 'not_trigger': return 'new';
        case 'triggered': return 'filled';
        case 'fail_trigger': return 'rejected';
        case 'cancel': return 'canceled';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel parsePlanStatus type '${market}'` });
    }
};
exports.parsePlanStatus = parsePlanStatus;
//# sourceMappingURL=bitget-parsers.js.map