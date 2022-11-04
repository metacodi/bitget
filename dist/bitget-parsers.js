"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsetMarginMode = exports.parsetPositionTradeSide = exports.parsePlanStatus = exports.formatOrderStatus = exports.parseOrderStatus = exports.formatStopType = exports.parseStopType = exports.formatOrderType = exports.parseOrderType = exports.parsetOrderAlgoTradeSide = exports.parsetOrderTradeSide = exports.formatOrderTradeSide = exports.parsetOrderSideFutures = exports.formatOrderSide = exports.parseOrderSide = void 0;
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
const parsetOrderSideFutures = (trade) => {
    switch (trade) {
        case 'open_long':
        case 'open_short':
            return 'buy';
        case 'close_long':
        case 'close_short':
            return 'sell';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel parsetOrderSideFutures type '${trade}'` });
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
const parsetOrderTradeSide = (tradeSide) => {
    switch (tradeSide) {
        case 'long': return 'long';
        case 'short': return 'short';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel parsetOrderTradeSide type '${tradeSide}'` });
    }
};
exports.parsetOrderTradeSide = parsetOrderTradeSide;
const parsetOrderAlgoTradeSide = (tradeSide) => {
    switch (tradeSide) {
        case 'open_long':
        case 'close_long':
            return 'long';
        case 'open_short':
        case 'close_short':
            return 'short';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel parsetOrderAlgoTradeSide type '${tradeSide}'` });
    }
};
exports.parsetOrderAlgoTradeSide = parsetOrderAlgoTradeSide;
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
        case 'full-fill': return 'filled';
        case 'partial-fill': return 'partial';
        case 'cancelled': return 'canceled';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel OrderStatus type '${status}'` });
    }
};
exports.parseOrderStatus = parseOrderStatus;
const formatOrderStatus = (status) => {
    switch (status) {
        case 'new': return 'new';
        case 'filled': return 'full-fill';
        case 'partial': return 'partial-fill';
        case 'canceled': return 'cancelled';
        default: throw ({ message: `No s'ha implementat el format Bitget pel OrderStatus type '${status}'` });
    }
};
exports.formatOrderStatus = formatOrderStatus;
const parsePlanStatus = (status) => {
    switch (status) {
        case 'not_trigger': return 'new';
        case 'executing': return 'new';
        case 'triggered': return 'filled';
        case 'fail_trigger': return 'rejected';
        case 'cancel': return 'canceled';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel parsePlanStatus type '${status}'` });
    }
};
exports.parsePlanStatus = parsePlanStatus;
const parsetPositionTradeSide = (tradeSide) => {
    switch (tradeSide) {
        case 'long': return 'long';
        case 'short': return 'short';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel PositionTradeSide type '${tradeSide}'` });
    }
};
exports.parsetPositionTradeSide = parsetPositionTradeSide;
const parsetMarginMode = (tradeSide) => {
    switch (tradeSide) {
        case 'crossed': return 'cross';
        case 'fixed': return 'isolated';
        default: throw ({ message: `No s'ha implementat el parser Bitget pel MarginMode type '${tradeSide}'` });
    }
};
exports.parsetMarginMode = parsetMarginMode;
//# sourceMappingURL=bitget-parsers.js.map