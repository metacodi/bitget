"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitgetApi = void 0;
const moment_1 = __importDefault(require("moment"));
const abstract_exchange_1 = require("@metacodi/abstract-exchange");
const abstract_exchange_2 = require("@metacodi/abstract-exchange");
const node_api_client_1 = require("@metacodi/node-api-client");
const bitget_parsers_1 = require("./bitget-parsers");
const bitget_parsers_2 = require("./bitget-parsers");
class BitgetApi extends node_api_client_1.ApiClient {
    constructor(options) {
        super(options);
        this.limits = [];
        this.currencies = [];
        this.symbols = [];
    }
    baseUrl() { return `api.bitget.com`; }
    ;
    request(method, endpoint, options) {
        const _super = Object.create(null, {
            request: { get: () => super.request }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!options) {
                options = {};
            }
            options.headers = options.headers || {};
            options.headers['Content-Type'] = 'application/json';
            options.headers['Locale'] = 'en-US';
            return _super.request.call(this, method, endpoint, options);
        });
    }
    getAuthHeaders(method, endpoint, params) {
        const _super = Object.create(null, {
            getAuthHeaders: { get: () => super.getAuthHeaders }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const locale = 'en-US';
            const headers = yield _super.getAuthHeaders.call(this, method, endpoint, params);
            headers.Cookie = `locale=${locale}`;
            headers[locale];
            return headers;
        });
    }
    get market() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.market; }
    getExchangeInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            this.limits = [];
            if (this.market === 'spot') {
                this.limits.push({ type: 'request', maxQuantity: 20, period: 1, unitOfTime: 'second' });
                this.limits.push({ type: 'trade', maxQuantity: 10, period: 1, unitOfTime: 'second' });
            }
            else if (this.market === 'futures') {
                this.limits.push({ type: 'request', maxQuantity: 20, period: 1, unitOfTime: 'second' });
                this.limits.push({ type: 'trade', maxQuantity: 10, period: 1, unitOfTime: 'second' });
            }
            this.currencies = [];
            const errorMessage = { code: 500, message: `No s'ha pogut obtenir el llistat de monedes disponibles a Bitget.` };
            const currenciesList = yield this.get(`api/spot/v1/public/currencies`, { isPublic: true, errorMessage });
            this.currencies.push(...currenciesList.data);
            this.symbols = [];
            const url = this.market === 'spot' ? `api/spot/v1/public/products` : `api/mix/v1/market/contracts`;
            if (this.market === 'spot') {
                const errorMessage = { code: 500, message: `No s'ha pogut obtenir el llistat de símbols per spot a Bitget.` };
                const symbolsList = yield this.get(url, { isPublic: true, errorMessage });
                this.symbols.push(...symbolsList.data.map(symbol => (Object.assign(Object.assign({}, symbol), { productType: 'spbl' }))));
                return Promise.resolve({ limits: this.limits });
            }
            else {
                yield Promise.all(['umcbl', 'dmcbl', 'cmcbl'].map((productType) => __awaiter(this, void 0, void 0, function* () {
                    if (this.isTest) {
                        productType = `s${productType}`;
                    }
                    const errorMessage = { code: 500, message: `No s'ha pogut obtenir el llistat dels símbols disponibles pel producte '${productType}' de futurs a Bitget.` };
                    const symbolsList = yield this.get(url, { params: { productType }, isPublic: true, errorMessage });
                    this.symbols.push(...symbolsList.data.map(symbol => (Object.assign(Object.assign({}, symbol), { productType, symbolName: `${symbol.baseCoin}${symbol.quoteCoin}` }))));
                })));
                return Promise.resolve({ limits: this.limits });
            }
        });
    }
    getMarketSymbol(symbol) {
        return __awaiter(this, void 0, void 0, function* () {
            const { baseAsset, quoteAsset } = symbol;
            const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
            if (!found) {
                throw { code: 500, message: `getMarketSymbol: No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` };
            }
            if (this.market === 'spot') {
                return Promise.resolve({
                    symbol,
                    ready: found.status === 'online',
                    quotePrecision: +found.priceScale,
                    basePrecision: +found.priceScale,
                    quantityPrecision: +found.quantityScale,
                    pricePrecision: +found.priceScale,
                    tradeAmountAsset: 'base',
                    minTradeAmount: +found.minTradeAmount,
                    maxTradeAmount: +found.maxTradeAmount,
                    commissionAsset: 'quote',
                    makerCommission: +found.makerFeeRate,
                    takerCommission: +found.takerFeeRate,
                });
            }
            else {
                if (found.minLeverage === undefined) {
                    const errorMessage = { code: 500, message: `No s'ha pogut obtenir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
                    const params = { symbol: found.symbol };
                    const response = yield this.get(`api/mix/v1/market/symbol-leverage`, { params, isPublic: true, errorMessage });
                    found.minLeverage = +response.data.minLeverage;
                    found.maxLeverage = +response.data.maxLeverage;
                }
                return Promise.resolve({
                    symbol,
                    ready: true,
                    quotePrecision: +found.pricePlace,
                    basePrecision: +found.pricePlace,
                    quantityPrecision: +found.volumePlace,
                    pricePrecision: +found.pricePlace,
                    tradeAmountAsset: 'base',
                    minTradeAmount: +found.minTradeNum,
                    maxTradeAmount: +found.maxTradeAmount,
                    commissionAsset: 'quote',
                    makerCommission: +found.makerFeeRate,
                    takerCommission: +found.takerFeeRate,
                    minLeverage: +found.minLeverage,
                    maxLeverage: +found.maxLeverage,
                });
            }
        });
    }
    resolveAssets(symbol) {
        return {
            baseAsset: (this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset),
            quoteAsset: (this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset)
        };
    }
    getSymbolProduct(symbol) {
        const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
        const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
        const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
        if (found) {
            return found.symbol;
        }
        else {
            throw { code: 500, message: `getSymbolProduct: No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` };
        }
    }
    getProductType(symbol) {
        const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
        const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
        const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
        if (found) {
            return found.productType;
        }
        else {
            throw { code: 500, message: `getProductType: No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` };
        }
    }
    getInstrumentId(symbol) {
        const { baseAsset, quoteAsset } = symbol;
        const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
        if (found) {
            return found.symbolName;
        }
        else {
            throw { code: 500, message: `getInstrumentId: No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` };
        }
    }
    parseInstrumentId(instId) {
        const found = this.symbols.find(s => s.symbolName === instId);
        if (found) {
            const baseAsset = this.isTest ? String(found.baseCoin).slice(1) : found.baseCoin;
            const quoteAsset = this.isTest ? String(found.quoteCoin).slice(1) : found.quoteCoin;
            return { baseAsset, quoteAsset };
        }
        else {
            throw { code: 500, message: `parseInstrumentId: No s'ha trobat el símbol ${instId} a Bitget.` };
        }
    }
    parseSymbolProduct(symbol) {
        const found = this.symbols.find(s => s.symbol === symbol);
        if (found) {
            const baseAsset = this.isTest ? String(found.baseCoin).slice(1) : found.baseCoin;
            const quoteAsset = this.isTest ? String(found.quoteCoin).slice(1) : found.quoteCoin;
            return { baseAsset, quoteAsset };
        }
        else {
            throw { code: 500, message: `parseSymbolProduct: No s'ha trobat el símbol ${symbol} a Bitget.` };
        }
    }
    getPriceTicker(symbol) {
        return __awaiter(this, void 0, void 0, function* () {
            const { baseAsset, quoteAsset } = this.resolveAssets(symbol);
            const url = this.market === 'spot' ? `api/spot/v1/market/ticker` : `api/mix/v1/market/mark-price`;
            const bitgetSymbol = this.getSymbolProduct(symbol);
            const errorMessage = { code: 500, message: `No s'ha pogut obtenir el preu del símbol ${baseAsset}_${quoteAsset} per ${this.market} a Bitget.` };
            const params = { symbol: bitgetSymbol };
            return this.get(url, { params, isPublic: true, errorMessage }).then(response => {
                const data = response.data[0];
                if (this.market === 'spot') {
                    return {
                        symbol,
                        price: +data.close,
                        timestamp: (0, abstract_exchange_1.timestamp)(data.ts),
                        baseVolume: +data.baseVol,
                        quoteVolume: +data.quoteVol,
                    };
                }
                else {
                    return {
                        symbol,
                        price: +data.markPrice,
                        timestamp: (0, abstract_exchange_1.timestamp)(+data.timestamp),
                        baseVolume: undefined,
                        quoteVolume: undefined,
                    };
                }
            });
        });
    }
    getKlines(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { limit } = request;
            const { baseAsset, quoteAsset } = request.symbol;
            const url = this.market === 'spot' ? `api/spot/v1/market/candles` : `api/mix/v1/market/candles`;
            const symbol = this.getSymbolProduct(request.symbol);
            const unit = request.interval.charAt(request.interval.length - 1);
            const interval = ['h', 'd', 'w', 'y'].includes(unit) ? request.interval.toLocaleUpperCase() : request.interval;
            const intervalField = this.market === 'spot' ? 'period' : 'granularity';
            const start = request.start ? (0, moment_1.default)(request.start) : (0, moment_1.default)();
            const endTime = request.end ? (0, moment_1.default)(request.end) : '';
            const startField = this.market === 'spot' ? 'after' : 'startTime';
            const endField = this.market === 'spot' ? 'before' : 'endTime';
            const toUnix = (time) => { return (0, moment_1.default)(time).unix().toString() + '000'; };
            const errorMessage = { code: 500, message: `No s'ha pogut obtenir el preu del símbol ${baseAsset}_${quoteAsset} per ${this.market} a Bitget.` };
            const requestKlines = (query) => this.get(`${url}${query}`, { isPublic: true, errorMessage }).then(response => {
                return response.data.map(data => {
                    if (this.market === 'spot') {
                        return {
                            symbol: request.symbol,
                            interval: request.interval,
                            openTime: (0, abstract_exchange_1.timestamp)(+data.ts),
                            closeTime: (0, abstract_exchange_2.calculateCloseTime)((0, abstract_exchange_1.timestamp)(+data.ts), request.interval),
                            open: +data.open,
                            high: +data.high,
                            low: +data.low,
                            close: +data.close,
                            baseVolume: +data.baseVol,
                            quoteVolume: +data.quoteVol,
                        };
                    }
                    else {
                        return {
                            symbol: request.symbol,
                            interval: request.interval,
                            openTime: (0, abstract_exchange_1.timestamp)(+data[0]),
                            closeTime: (0, abstract_exchange_2.calculateCloseTime)((0, abstract_exchange_1.timestamp)(+data[0]), request.interval),
                            open: +data[1],
                            high: +data[2],
                            low: +data[3],
                            close: +data[4],
                            baseVolume: +data[5],
                            quoteVolume: +data[6],
                        };
                    }
                });
            });
            try {
                const results = [];
                let startTime = start;
                if (!endTime && !limit) {
                    const query = this.formatQuery({ symbol, [intervalField]: interval });
                    results.push(...yield requestKlines(query));
                }
                else if (!endTime && !!limit) {
                    do {
                        const query = this.formatQuery({ symbol, [intervalField]: interval, [startField]: toUnix(startTime) });
                        const response = yield requestKlines(query);
                        if (!response.length) {
                            break;
                        }
                        results.push(...response);
                        startTime = results[results.length - 1].openTime;
                    } while (results.length < limit);
                    if (results.length > limit) {
                        results.splice(limit);
                    }
                }
                else {
                    do {
                        const query = this.formatQuery({ symbol, [intervalField]: interval, [startField]: toUnix(startTime), [endField]: toUnix(endTime) });
                        const response = yield requestKlines(query);
                        if (!response.length) {
                            break;
                        }
                        results.push(...response);
                        startTime = results[results.length - 1].openTime;
                    } while ((0, moment_1.default)(startTime).isAfter((0, moment_1.default)(endTime)));
                }
                return Promise.resolve(results);
            }
            catch (error) {
                throw error;
            }
        });
    }
    getApiKeyInfo() {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function* () {
            const errorMessage = { code: 500, message: `No s'ha pogut obtenir la informació del compte a Bitget.` };
            const infoApiKey = yield this.get(`api/spot/v1/account/getInfo`, { errorMessage });
            this.user_id = (_a = infoApiKey === null || infoApiKey === void 0 ? void 0 : infoApiKey.data) === null || _a === void 0 ? void 0 : _a.user_id;
            const canWithdraw = (_c = (_b = infoApiKey === null || infoApiKey === void 0 ? void 0 : infoApiKey.data) === null || _b === void 0 ? void 0 : _b.authorities) === null || _c === void 0 ? void 0 : _c.some((a) => a === 'withdraw');
            const canTrade = (_e = (_d = infoApiKey === null || infoApiKey === void 0 ? void 0 : infoApiKey.data) === null || _d === void 0 ? void 0 : _d.authorities) === null || _e === void 0 ? void 0 : _e.some((a) => a === 'trade');
            const canDeposit = (_g = (_f = infoApiKey === null || infoApiKey === void 0 ? void 0 : infoApiKey.data) === null || _f === void 0 ? void 0 : _f.authorities) === null || _g === void 0 ? void 0 : _g.some((a) => a === 'deposit');
            const accountInfo = { canTrade, canWithdraw, canDeposit, balances: [], positions: [] };
            return Promise.resolve(accountInfo);
        });
    }
    getAccountInfo() {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function* () {
            const errorMessage = { code: 500, message: `No s'ha pogut obtenir la informació del compte a Bitget.` };
            const InfoApiKey = yield this.get(`api/spot/v1/account/getInfo`, { errorMessage });
            this.user_id = (_a = InfoApiKey === null || InfoApiKey === void 0 ? void 0 : InfoApiKey.data) === null || _a === void 0 ? void 0 : _a.user_id;
            const canWithdraw = (_c = (_b = InfoApiKey === null || InfoApiKey === void 0 ? void 0 : InfoApiKey.data) === null || _b === void 0 ? void 0 : _b.authorities) === null || _c === void 0 ? void 0 : _c.some((a) => a === 'withdraw');
            const canTrade = (_e = (_d = InfoApiKey === null || InfoApiKey === void 0 ? void 0 : InfoApiKey.data) === null || _d === void 0 ? void 0 : _d.authorities) === null || _e === void 0 ? void 0 : _e.some((a) => a === 'trade');
            const canDeposit = (_g = (_f = InfoApiKey === null || InfoApiKey === void 0 ? void 0 : InfoApiKey.data) === null || _f === void 0 ? void 0 : _f.authorities) === null || _g === void 0 ? void 0 : _g.some((a) => a === 'deposit');
            const accountInfo = { canTrade, canWithdraw, canDeposit, balances: [], positions: [] };
            if (this.market === 'spot') {
                const errorMessage = { code: 500, message: `No s'han pogut obtenir els balanços per ${this.market} a Bitget.` };
                const assetsList = yield this.get(`api/spot/v1/account/assets`, { errorMessage });
                accountInfo.balances.push(...assetsList.data.map(b => {
                    const balance = {
                        asset: b.coinName,
                        balance: +b.available + +b.frozen,
                        available: +b.available,
                        locked: +b.frozen,
                        remainder: 0.0,
                        fee: 0.0,
                    };
                    return balance;
                }));
                return Promise.resolve(accountInfo);
            }
            else {
                yield Promise.all(['umcbl', 'dmcbl', 'cmcbl'].map((productType) => __awaiter(this, void 0, void 0, function* () {
                    if (this.isTest) {
                        productType = `s${productType}`;
                    }
                    const errorMessage = { code: 500, message: `No s'han pogut obtenir els balanços per ${this.market} a Bitget.` };
                    const params = { productType };
                    const accountsList = yield this.get(`api/mix/v1/account/accounts`, { params, errorMessage });
                    accountInfo.balances.push(...accountsList.data.map(b => {
                        const balance = {
                            asset: b.marginCoin,
                            balance: +b.available + +b.locked,
                            available: +b.available,
                            locked: +b.locked,
                            remainder: 0.0,
                            fee: 0.0,
                        };
                        return balance;
                    }));
                })));
                yield Promise.all(['umcbl', 'dmcbl', 'cmcbl'].map((productType) => __awaiter(this, void 0, void 0, function* () {
                    if (this.isTest) {
                        productType = `s${productType}`;
                    }
                    const errorMessage = { code: 500, message: `No s'han pogut obtenir les posicions per ${this.market} a Bitget.` };
                    const params = { productType };
                    const positionsList = yield this.get(`api/mix/v1/position/allPosition`, { params, errorMessage });
                    accountInfo.positions.push(...positionsList.data.map(p => {
                        const symbol = this.parseSymbolProduct(p.symbol);
                        const position = {
                            symbol,
                            marginAsset: p.marginCoin,
                            positionAmount: +p.available,
                            price: +p.averageOpenPrice,
                            leverage: +p.leverage,
                            unrealisedPnl: +p.unrealizedPL,
                            marginType: p.marginMode === 'crossed' ? 'cross' : 'isolated',
                            positionSide: (0, bitget_parsers_1.parsetPositionTradeSide)(p.holdSide),
                        };
                        return position;
                    }));
                })));
                return Promise.resolve(accountInfo);
            }
        });
    }
    getLeverage(symbol, mode) {
        return __awaiter(this, void 0, void 0, function* () {
            const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
            const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
            const bitgetSymbol = this.getSymbolProduct(symbol);
            const errorMessage = { code: 500, message: `No s'ha pogut obtenir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
            const params = { symbol: bitgetSymbol, marginCoin: quoteAsset };
            const account = yield this.get(`api/mix/v1/account/account`, { params, errorMessage });
            return Promise.resolve({
                symbol,
                longLeverage: +account.data.fixedLongLeverage,
                shortLeverage: +account.data.fixedShortLeverage,
                leverage: +account.data.crossMarginLeverage,
            });
        });
    }
    setLeverage(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const baseAsset = this.isTest ? `S${request.symbol.baseAsset}` : request.symbol.baseAsset;
            const quoteAsset = this.isTest ? `S${request.symbol.quoteAsset}` : request.symbol.quoteAsset;
            const symbol = this.getSymbolProduct(request.symbol);
            const errorMarginMode = { code: 500, message: `No s'ha pogut establir el mode a ${request.mode} pel símbol ${baseAsset}_${quoteAsset} a Bitget.` };
            const paramsMarginMode = { symbol, marginCoin: quoteAsset, marginMode: request.mode === 'cross' ? 'crossed' : 'fixed' };
            yield this.post(`api/mix/v1/account/setMarginMode`, { params: paramsMarginMode, errorMessage: errorMarginMode });
            const errorLeverage = { code: 500, message: `No s'ha pogut establir el leverage pel símbol ${baseAsset}_${quoteAsset} a Bitget.` };
            if (request.mode === 'cross') {
                const paramsCross = { symbol, marginCoin: quoteAsset, leverage: request.longLeverage };
                yield this.post(`api/mix/v1/account/setLeverage`, { params: paramsCross, errorMessage: errorLeverage });
            }
            else {
                const paramsLong = { symbol, marginCoin: quoteAsset, leverage: request.longLeverage, holdSide: 'long' };
                yield this.post(`api/mix/v1/account/setLeverage`, { params: paramsLong, errorMessage: errorLeverage });
                const paramsShort = { symbol, marginCoin: quoteAsset, leverage: request.shortLeverage, holdSide: 'short' };
                yield this.post(`api/mix/v1/account/setLeverage`, { params: paramsShort, errorMessage: errorLeverage });
            }
            return Promise.resolve();
        });
    }
    getHistoryOrders(request) { return {}; }
    getOpenOrders(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { symbol } = request;
            const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
            const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
            const errorMessage = { code: 500, message: `No s'han pogut obtenir les orders del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
            const results = [];
            if (this.market === 'spot') {
                const params = { symbol: this.getSymbolProduct(symbol) };
                const ordersList = yield this.post(`api/spot/v1/trade/open-orders`, { params, errorMessage });
                results.push(...ordersList.data.map(o => {
                    return {
                        id: o.clientOrderId,
                        exchangeId: o.orderId,
                        side: (0, bitget_parsers_1.parseOrderSide)(o.side),
                        type: (0, bitget_parsers_1.parseOrderType)(o.orderType),
                        status: (0, bitget_parsers_1.parseOrderStatus)(o.status),
                        symbol: this.parseSymbolProduct(o.symbol),
                        baseQuantity: +o.quantity,
                        price: +o.price,
                        created: (0, moment_1.default)(+o.cTime).format('YYYY-MM-DD HH:mm:ss').toString(),
                    };
                }));
            }
            else {
                const params = { productType: this.getProductType(symbol), marginCoin: quoteAsset };
                const ordersList = yield this.get(`api/mix/v1/order/marginCoinCurrent`, { params, errorMessage });
                results.push(...ordersList.data.map(o => {
                    return {
                        id: o.clientOid,
                        exchangeId: o.orderId,
                        side: (0, bitget_parsers_1.parsetOrderSideFutures)(o.side),
                        trade: (0, bitget_parsers_1.parsetOrderTradeSide)(o.side),
                        type: (0, bitget_parsers_1.parseOrderType)(o.orderType),
                        status: (0, bitget_parsers_1.parseOrderStatus)(o.state),
                        symbol: this.parseSymbolProduct(o.symbol),
                        baseQuantity: +o.size,
                        price: +o.price,
                        created: (0, moment_1.default)(+o.cTime).format('YYYY-MM-DD HH:mm:ss').toString(),
                    };
                }));
                const paramsPlan = { symbol: this.getSymbolProduct(symbol), productType: this.getProductType(symbol), marginCoin: quoteAsset };
                const currentPlan = yield this.get(`api/mix/v1/plan/currentPlan`, { params: paramsPlan, errorMessage });
                results.push(...currentPlan.data.map(o => {
                    return {
                        exchangeId: o.orderId,
                        side: (0, bitget_parsers_1.parsetOrderSideFutures)(o.side),
                        trade: (0, bitget_parsers_1.parsetOrderTradeSide)(o.side),
                        type: (0, bitget_parsers_1.parseOrderType)(o.orderType),
                        stop: (0, bitget_parsers_1.parseStopType)(o.planType),
                        status: (0, bitget_parsers_1.parsePlanStatus)(o.status),
                        symbol: this.parseSymbolProduct(o.symbol),
                        baseQuantity: +o.size,
                        price: +o.executePrice,
                        stopPrice: +o.triggerPrice,
                        created: (0, moment_1.default)(+o.cTime).format('YYYY-MM-DD HH:mm:ss'),
                    };
                }));
            }
            return Promise.resolve(results);
        });
    }
    getOrder(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { baseAsset, quoteAsset } = request.symbol;
            const symbol = this.getSymbolProduct(request.symbol);
            let params = { symbol, marginCoin: quoteAsset };
            if (request.exchangeId) {
                params = Object.assign(Object.assign({}, params), { orderId: request.exchangeId });
            }
            if (request.id) {
                params = Object.assign(Object.assign({}, params), { clientOid: request.id });
            }
            const errorMessage = { code: 500, message: `No s'ha pogut obtenir l'ordre ${request.id} en ${this.market} a Bitget.` };
            if (this.market === 'spot') {
                if (!params.orderId) {
                    return Promise.reject(`No s'ha pogut obtenir l'ordre ${request.id} en ${this.market} a Bitget. l'identificador de l'exchange per SPOT es obligatori`);
                }
                const ordersList = yield this.get(`api/spot/v1/trade/orderInfo`, { params, errorMessage });
                ordersList.data.map(o => {
                    return Promise.resolve({
                        id: o.clientOrderId,
                        exchangeId: o.orderId,
                        side: (0, bitget_parsers_1.parseOrderSide)(o.side),
                        type: (0, bitget_parsers_1.parseOrderType)(o.orderType),
                        status: (0, bitget_parsers_1.parseOrderStatus)(o.status),
                        symbol: this.parseSymbolProduct(o.symbol),
                        baseQuantity: +o.quantity,
                        price: +o.price,
                        created: (0, moment_1.default)(+o.cTime).format('YYYY-MM-DD HH:mm:ss').toString(),
                    });
                });
                return Promise.resolve({});
            }
            else {
                const response = yield this.get(`api/mix/v1/order/detail`, { params, errorMessage });
                let o = undefined;
                response.data.map(o => {
                    return Promise.resolve({
                        id: o.clientOrderId,
                        exchangeId: o.orderId,
                        side: (0, bitget_parsers_1.parseOrderSide)(o.side),
                        type: (0, bitget_parsers_1.parseOrderType)(o.orderType),
                        status: (0, bitget_parsers_1.parseOrderStatus)(o.status),
                        symbol: this.parseSymbolProduct(o.symbol),
                        baseQuantity: +o.quantity,
                        price: +o.price,
                        created: (0, moment_1.default)(+o.cTime).format('YYYY-MM-DD HH:mm:ss').toString(),
                    });
                });
                if (!o) {
                    const currentPlan = yield this.get(`/api/mix/v1/plan/currentPlan`, { params, errorMessage });
                    let o = undefined;
                    currentPlan.data.map(o => {
                        if (o.orderId === params.orderId) {
                            return Promise.resolve({
                                exchangeId: o.orderId,
                                side: (0, bitget_parsers_1.parsetOrderSideFutures)(o.side),
                                trade: (0, bitget_parsers_1.parsetOrderTradeSide)(o.side),
                                type: (0, bitget_parsers_1.parseOrderType)(o.orderType),
                                stop: (0, bitget_parsers_1.parseStopType)(o.planType),
                                status: (0, bitget_parsers_1.parsePlanStatus)(o.status),
                                symbol: this.parseSymbolProduct(o.symbol),
                                baseQuantity: +o.size,
                                price: +o.executePrice,
                                stopPrice: +o.triggerPrice,
                                created: (0, moment_1.default)(+o.cTime).format('YYYY-MM-DD HH:mm:ss'),
                            });
                        }
                    });
                }
                return Promise.resolve(o);
            }
        });
    }
    postOrder(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const symbol = this.getSymbolProduct(request.symbol);
            const errorMessage = { code: 500, message: `No s'ha pogut enviar l'ordre ${request.id} en ${this.market} a Bitget.` };
            if (this.market === 'spot') {
                const baseParams = {
                    symbol,
                    side: (0, bitget_parsers_2.formatOrderSide)(request.side),
                    orderType: (0, bitget_parsers_2.formatOrderType)(request.type),
                    clientOrderId: request.id,
                };
                if (!request.stop) {
                    const price = request.type === 'limit' ? { price: request.price } : undefined;
                    const quantity = +request.baseQuantity;
                    const force = 'normal';
                    const params = Object.assign(Object.assign(Object.assign({}, baseParams), price), { quantity, force });
                    const orderPlaced = yield this.post(`api/spot/v1/trade/orders`, { params, errorMessage });
                    const order = Object.assign(Object.assign({}, request), { status: 'post', exchangeId: orderPlaced.data.orderId });
                    return order;
                }
                else {
                    const size = +request.baseQuantity;
                    const executePrice = request.type === 'limit' ? { executePrice: +request.price } : undefined;
                    const triggerPrice = +request.stopPrice;
                    const triggerType = request.type === 'market' ? 'market_price' : 'fill_price';
                    const timeInForceValue = 'normal';
                    const params = Object.assign(Object.assign(Object.assign({}, baseParams), executePrice), { size, triggerPrice, triggerType, timeInForceValue });
                    const orderPlaced = yield this.post(`api/spot/v1/plan/placePlan`, { params, errorMessage });
                    const order = Object.assign(Object.assign({}, request), { status: 'post', exchangeId: orderPlaced.data.orderId });
                    return order;
                }
            }
            else {
                const { baseAsset, quoteAsset } = this.resolveAssets(request.symbol);
                const baseParams = {
                    symbol,
                    marginCoin: quoteAsset,
                    size: +request.baseQuantity,
                    clientOid: request.id,
                    side: (0, bitget_parsers_2.formatOrderTradeSide)(request.side, request.trade),
                    timeInForceValue: 'normal',
                };
                if (!request.stop) {
                    const price = request.type === 'limit' ? { price: request.price } : undefined;
                    const orderType = (0, bitget_parsers_2.formatOrderType)(request.type);
                    const params = Object.assign(Object.assign(Object.assign({}, baseParams), { orderType }), price);
                    const orderPlaced = yield this.post(`api/mix/v1/order/placeOrder`, { params, errorMessage });
                    const order = Object.assign(Object.assign({}, request), { status: 'post', exchangeId: orderPlaced.data.orderId });
                    return order;
                }
                else {
                    const executePrice = request.type === 'limit' ? { executePrice: +request.price } : undefined;
                    const triggerPrice = +request.stopPrice;
                    const orderType = request.type;
                    const triggerType = request.type === 'market' ? 'market_price' : 'fill_price';
                    const params = Object.assign(Object.assign(Object.assign({}, baseParams), executePrice), { triggerPrice, orderType, triggerType });
                    const planPlaced = yield this.post(`api/mix/v1/plan/placePlan`, { params, errorMessage });
                    const order = Object.assign(Object.assign({}, request), { status: 'post', exchangeId: planPlaced.data.orderId });
                    return order;
                }
            }
        });
    }
    cancelOrder(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { baseAsset, quoteAsset } = this.resolveAssets(request.symbol);
            const symbol = this.getSymbolProduct(request.symbol);
            const errorMessage = { code: 500, message: `No s'ha pogut cancel·lar l'ordre ${request.id} en ${this.market} a Bitget.` };
            if (this.market === 'spot') {
                const params = {
                    symbol,
                    orderId: request.exchangeId
                };
                const orderCanceled = yield this.post(`api/spot/v1/trade/cancel-order`, { params, errorMessage });
                const order = Object.assign({ status: 'cancel', id: orderCanceled.data.clientOid }, request);
                return order;
            }
            else {
                const { baseAsset, quoteAsset } = this.resolveAssets(request.symbol);
                const isStop = request.type.includes('stop');
                const planType = request.type.includes('stop') ? { planType: 'normal_plan' } : undefined;
                const params = Object.assign({ symbol, marginCoin: quoteAsset, orderId: request.exchangeId }, planType);
                const planCanceled = yield this.post(isStop ? `api/mix/v1/plan/cancelPlan` : `api/mix/v1/order/cancel-order`, { params, errorMessage });
                const order = Object.assign({ status: 'cancel', id: planCanceled.data.clientOid }, request);
                return order;
            }
        });
    }
}
exports.BitgetApi = BitgetApi;
//# sourceMappingURL=bitget-api.js.map