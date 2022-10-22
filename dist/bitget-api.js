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
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const moment_1 = __importDefault(require("moment"));
const node_utils_1 = require("@metacodi/node-utils");
const abstract_exchange_1 = require("@metacodi/abstract-exchange");
const bitget_parsers_1 = require("./bitget-parsers");
const bitget_parsers_2 = require("./bitget-parsers");
class BitgetApi {
    constructor(options) {
        this.currencies = [];
        this.symbols = [];
        this.options = Object.assign(Object.assign({}, this.defaultOptions), options);
    }
    baseUrl() { return `api.bitget.com`; }
    ;
    get market() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.market; }
    get apiKey() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.apiKey; }
    get apiSecret() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.apiSecret; }
    get apiPassphrase() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.apiPassphrase; }
    get isTest() { var _a; return !!((_a = this.options) === null || _a === void 0 ? void 0 : _a.isTest); }
    get defaultOptions() {
        return {
            isTest: false,
        };
    }
    setCredentials(data) {
        this.options.apiKey = data.apiKey;
        this.options.apiSecret = data.apiSecret;
        this.options.apiPassphrase = data.apiPassphrase;
    }
    get(endpoint, options) { return this.request('GET', endpoint, options); }
    post(endpoint, options) { return this.request('POST', endpoint, options); }
    put(endpoint, options) { return this.request('PUT', endpoint, options); }
    delete(endpoint, options) { return this.request('DELETE', endpoint, options); }
    request(method, endpoint, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options) {
                options = {};
            }
            const isPublic = options.isPublic === undefined ? false : options.isPublic;
            const headers = options.headers === undefined ? undefined : options.headers;
            const params = options.params === undefined ? undefined : options.params;
            const baseUrl = this.baseUrl();
            const [uri, _query = ''] = endpoint.split('?');
            const config = {
                method,
                headers: Object.assign({}, headers),
            };
            const { body, query } = this.resolveData(method, params || {});
            if (query) {
                const concat = endpoint.includes('?') ? (endpoint.endsWith('?') ? '' : '&') : '?';
                endpoint += concat + query;
            }
            config.headers['Content-Type'] = 'application/json';
            config.headers['Locale'] = 'en-US';
            if (method === 'POST' || method === 'PUT') {
                config.data = body;
            }
            1;
            if (!isPublic) {
                const authHeaders = yield this.getAuthHeaders(method, '/' + endpoint, body);
                config.headers = Object.assign(Object.assign({}, config.headers), authHeaders);
            }
            config.url = 'https://' + [baseUrl, endpoint].join('/');
            console.log(config);
            return (0, axios_1.default)(config).then(response => {
                if (response.status !== 200) {
                    throw response;
                }
                return response.data;
            }).catch(e => this.parseException(e, config.url, options.error));
        });
    }
    resolveData(method, data = {}, options) {
        if (!options) {
            options = {};
        }
        const strictValidation = options.strictValidation === undefined ? false : options.strictValidation;
        const encodeValues = options.encodeValues === undefined ? true : options.encodeValues;
        const d = {};
        Object.keys(data).map(key => {
            const value = data[key];
            if (strictValidation && value === undefined) {
                throw { code: 500, message: `Failed to sign API request due to undefined data parameter` };
            }
            const canEncode = method === 'GET' || method === 'DELETE';
            const encodedValue = encodeValues && canEncode ? encodeURIComponent(value) : value;
            d[key] = encodedValue;
        });
        if (method === 'GET' || method === 'DELETE') {
            return {
                query: Object.keys(d).map(v => `${v}=${d[v]}`).join('&'),
                body: undefined,
            };
        }
        else {
            return {
                query: '',
                body: JSON.stringify(d),
            };
        }
    }
    getAuthHeaders(method, endpoint, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { apiKey, apiSecret, apiPassphrase } = this;
            const timestamp = Date.now();
            const mParams = String(JSON.stringify(params)).slice(1, -1);
            const formatedParams = String(mParams).replace(/\\/g, '');
            const data = (method === 'GET' || method === 'DELETE') ? this.formatQuery(params) : formatedParams;
            const message = timestamp + method + endpoint + data;
            const signature = yield this.signMessage(message, apiSecret);
            const locale = 'en-US';
            const headers = {
                'ACCESS-SIGN': signature,
                'ACCESS-TIMESTAMP': timestamp,
                'ACCESS-KEY': apiKey,
                'ACCESS-PASSPHRASE': apiPassphrase,
                'Content-Type': 'application/json',
                Cookie: 'locale=' + locale,
                locale,
            };
            return headers;
        });
    }
    formatQuery(params) {
        if (!!params && JSON.stringify(params).length !== 2) {
            const serialisedParams = this.serialiseParams(params, { encodeValues: true });
            return '?' + serialisedParams;
        }
        else {
            return '';
        }
    }
    serialiseParams(request = {}, options) {
        if (!options) {
            options = {};
        }
        const strictValidation = options.strictValidation === undefined ? false : options.strictValidation;
        const encodeValues = options.encodeValues === undefined ? true : options.encodeValues;
        return Object.keys(request).map(key => {
            const value = request[key];
            if (strictValidation && (value === null || value === undefined || isNaN(value))) {
                throw { code: 500, message: `Failed to sign API request due to undefined parameter` };
            }
            const encodedValue = value ? (encodeValues ? encodeURIComponent(value) : value) : null;
            return `${key}=${encodedValue}`;
        }).join('&');
    }
    ;
    signMessage(message, secret) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof crypto_1.createHmac === 'function') {
                return (0, crypto_1.createHmac)('sha256', secret).update(message).digest('base64');
            }
            const encoder = new TextEncoder();
            const keyData = encoder.encode(secret);
            const algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };
            const extractable = false;
            const keyUsages = ['sign'];
            const key = yield window.crypto.subtle.importKey('raw', keyData, algorithm, extractable, keyUsages);
            const signature = yield window.crypto.subtle.sign('HMAC', key, encoder.encode(message));
            return Buffer.from(signature).toString('base64');
        });
    }
    ;
    parseException(e, url, error) {
        var _a, _b, _c;
        const { response, request, message } = e;
        if (!response) {
            throw request ? e : message;
        }
        if (((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.code) === 429) {
            throw {
                code: 429,
            };
        }
        else {
            throw Object.assign(Object.assign({}, error), { requestCode: (_b = response.data) === null || _b === void 0 ? void 0 : _b.code, requestMessage: (_c = response.data) === null || _c === void 0 ? void 0 : _c.msg, body: response.data, headers: response.headers, requestUrl: url, requestBody: request.body, options: Object.assign({}, this.options) });
        }
    }
    getExchangeInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            const limits = [];
            if (this.market === 'spot') {
                limits.push({ type: 'request', maxQuantity: 20, period: 1, unitOfTime: 'second' });
                limits.push({ type: 'trade', maxQuantity: 10, period: 1, unitOfTime: 'second' });
            }
            else if (this.market === 'futures') {
                limits.push({ type: 'request', maxQuantity: 20, period: 1, unitOfTime: 'second' });
                limits.push({ type: 'trade', maxQuantity: 10, period: 1, unitOfTime: 'second' });
            }
            this.currencies = [];
            const error = { code: 500, message: `No s'han pogut obtenir les monedes a Bitget.` };
            const response = yield this.get(`api/spot/v1/public/currencies`, { isPublic: true, error });
            this.currencies.push(...response.data);
            this.symbols = [];
            const url = this.market === 'spot' ? `api/spot/v1/public/products` : `api/mix/v1/market/contracts`;
            if (this.market === 'spot') {
                const error = { code: 500, message: `No s'han pogut obtenir els símbols d'spot a Bitget.` };
                const response = yield this.get(url, { isPublic: true, error });
                this.symbols.push(...response.data.map(symbol => (Object.assign(Object.assign({}, symbol), { productType: 'spbl' }))));
                return Promise.resolve({ limits });
            }
            else {
                yield Promise.all(['umcbl', 'dmcbl', 'cmcbl'].map((productType) => __awaiter(this, void 0, void 0, function* () {
                    if (this.isTest) {
                        productType = `s${productType}`;
                    }
                    const error = { code: 500, message: `No s'han pogut obtenir els símbols pel producte '${productType}' de futurs a Bitget.` };
                    const response = yield this.get(url, { params: { productType }, isPublic: true, error });
                    this.symbols.push(...response.data.map(symbol => (Object.assign(Object.assign({}, symbol), { productType, symbolName: `${symbol.baseCoin}${symbol.quoteCoin}` }))));
                })));
                return Promise.resolve({ limits });
            }
        });
    }
    getMarketSymbol(symbol) {
        return __awaiter(this, void 0, void 0, function* () {
            const { baseAsset, quoteAsset } = symbol;
            const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
            if (!found) {
                throw { code: 500, message: `No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` };
            }
            if (this.market === 'spot') {
                return Promise.resolve({
                    symbol,
                    ready: found.status === 'online',
                    quotePrecision: +found.priceScale,
                    basePrecision: +found.priceScale,
                    quantityPrecision: +found.quantityScale,
                    pricePrecision: +found.priceScale,
                    minTradeAmount: +found.minTradeAmount,
                    maxTradeAmount: +found.maxTradeAmount,
                    makerCommission: +found.makerFeeRate,
                    takerCommission: +found.takerFeeRate,
                });
            }
            else {
                if (found.minLeverage === undefined) {
                    const error = { code: 500, message: `No s'ha pogut obtenir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
                    const params = { symbol: found.symbol };
                    const response = yield this.get(`api/mix/v1/market/symbol-leverage`, { params, isPublic: true, error });
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
                    minTradeAmount: +found.minTradeNum,
                    maxTradeAmount: +found.maxTradeAmount,
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
            throw { code: 500, message: `No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` };
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
            throw { code: 500, message: `No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` };
        }
    }
    getInstrumentId(symbol) {
        const { baseAsset, quoteAsset } = symbol;
        const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
        if (found) {
            return found.symbolName;
        }
        else {
            throw { code: 500, message: `No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` };
        }
    }
    parseInstrumentId(instId) {
        const found = this.symbols.find(s => s.symbolName === instId);
        if (found) {
            return { baseAsset: found.baseCoin, quoteAsset: found.quoteCoin };
        }
        else {
            throw { code: 500, message: `No s'ha trobat el símbol ${instId} a Bitget.` };
        }
    }
    parseSymbolProduct(symbol) {
        const found = this.symbols.find(s => s.symbol === symbol);
        if (found) {
            return { baseAsset: found.baseCoin, quoteAsset: found.quoteCoin };
        }
        else {
            throw { code: 500, message: `No s'ha trobat el símbol ${symbol} a Bitget.` };
        }
    }
    getPriceTicker(symbol) {
        return __awaiter(this, void 0, void 0, function* () {
            const { baseAsset, quoteAsset } = this.resolveAssets(symbol);
            const url = this.market === 'spot' ? `api/spot/v1/market/ticker` : `api/mix/v1/market/mark-price`;
            const bitgetSymbol = this.getSymbolProduct(symbol);
            const error = { code: 500, message: `No s'han pogut obtenir el preu del símbol ${baseAsset}_${quoteAsset} per ${this.market} a Bitget.` };
            const params = { symbol: bitgetSymbol };
            return this.get(url, { params, isPublic: true, error }).then(response => {
                const data = response.data[0];
                if (this.market === 'spot') {
                    return {
                        symbol,
                        price: +data.close,
                        timestamp: (0, node_utils_1.timestamp)(data.ts),
                        baseVolume: +data.baseVol,
                        quoteVolume: +data.quoteVol,
                    };
                }
                else {
                    return {
                        symbol,
                        price: +data.markPrice,
                        timestamp: (0, node_utils_1.timestamp)(+data.timestamp),
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
            const error = { code: 500, message: `No s'han pogut obtenir el preu del símbol ${baseAsset}_${quoteAsset} per ${this.market} a Bitget.` };
            const requestKlines = (query) => this.get(`${url}${query}`, { isPublic: true, error }).then(response => {
                return response.data.map(data => {
                    if (this.market === 'spot') {
                        return {
                            symbol: request.symbol,
                            interval: request.interval,
                            openTime: (0, node_utils_1.timestamp)(+data.ts),
                            closeTime: (0, abstract_exchange_1.calculateCloseTime)((0, node_utils_1.timestamp)(+data.ts), request.interval),
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
                            openTime: (0, node_utils_1.timestamp)(+data[0]),
                            closeTime: (0, abstract_exchange_1.calculateCloseTime)((0, node_utils_1.timestamp)(+data[0]), request.interval),
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
        });
    }
    getAccountInfo() {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function* () {
            const error = { code: 500, message: `No s'ha pogut obtenir la informació del compte a Bitget.` };
            const InfoApiKey = yield this.get(`api/spot/v1/account/getInfo`, { error });
            this.user_id = (_a = InfoApiKey === null || InfoApiKey === void 0 ? void 0 : InfoApiKey.data) === null || _a === void 0 ? void 0 : _a.user_id;
            const canWithdraw = (_c = (_b = InfoApiKey === null || InfoApiKey === void 0 ? void 0 : InfoApiKey.data) === null || _b === void 0 ? void 0 : _b.authorities) === null || _c === void 0 ? void 0 : _c.some((a) => a === 'withdraw');
            const canTrade = (_e = (_d = InfoApiKey === null || InfoApiKey === void 0 ? void 0 : InfoApiKey.data) === null || _d === void 0 ? void 0 : _d.authorities) === null || _e === void 0 ? void 0 : _e.some((a) => a === 'trade');
            const canDeposit = (_g = (_f = InfoApiKey === null || InfoApiKey === void 0 ? void 0 : InfoApiKey.data) === null || _f === void 0 ? void 0 : _f.authorities) === null || _g === void 0 ? void 0 : _g.some((a) => a === 'deposit');
            const accountInfo = { canTrade, canWithdraw, canDeposit, balances: [], positions: [] };
            if (this.market === 'spot') {
                const error = { code: 500, message: `No s'han pogut obtenir els balances per ${this.market} a Bitget.` };
                const response = yield this.get(`api/spot/v1/account/assets`, { error });
                accountInfo.balances.push(...response.data.map(b => {
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
                    const error = { code: 500, message: `No s'han pogut obtenir els balances per ${this.market} a Bitget.` };
                    const params = { productType };
                    const response = yield this.get(`api/mix/v1/account/accounts`, { params, error });
                    accountInfo.balances.push(...response.data.map(b => {
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
                    const error = { code: 500, message: `No s'han pogut obtenir les posicions per ${this.market} a Bitget.` };
                    const params = { productType };
                    const response = yield this.get(`api/mix/v1/position/allPosition`, { params, error });
                    accountInfo.positions.push(...response.data.map(p => {
                        const symbol = this.parseSymbolProduct(p.symbol);
                        const position = {
                            symbol,
                            marginAsset: p.marginCoin,
                            positionAmount: +p.available,
                            entryPrice: +p.averageOpenPrice,
                            unrealisedPnl: +p.unrealizedPL,
                            marginType: p.marginMode === 'crossed' ? 'cross' : 'isolated',
                            positionSide: p.holdSide,
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
            const { baseAsset, quoteAsset } = symbol;
            const bitgetSymbol = this.getSymbolProduct(symbol);
            const error = { code: 500, message: `No s'ha pogut obtenir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
            const params = { symbol: bitgetSymbol, marginCoin: quoteAsset };
            const response = yield this.get(`api/mix/v1/account/account`, { params, error });
            return Promise.resolve({
                symbol,
                longLeverage: +response.data.fixedLongLeverage,
                shortLeverage: +response.data.fixedShortLeverage,
                leverage: +response.data.crossMarginLeverage,
            });
        });
    }
    setLeverage(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { baseAsset, quoteAsset } = request.symbol;
            const symbol = this.getSymbolProduct(request.symbol);
            const errorMarginMode = { code: 500, message: `No s'ha pogut establir el mode a ${request.mode} del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
            const paramsMarginMode = { symbol, marginCoin: quoteAsset, marginMode: request.mode === 'cross' ? 'crossed' : 'fixed' };
            yield this.post(`api/mix/v1/account/setMarginMode`, { params: paramsMarginMode, error: errorMarginMode });
            const errorLeverage = { code: 500, message: `No s'ha pogut establir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
            if (request.mode === 'cross') {
                const paramsCross = { symbol, marginCoin: quoteAsset, leverage: request.longLeverage };
                yield this.post(`api/mix/v1/account/setLeverage`, { params: paramsCross, error: errorLeverage });
            }
            else {
                const paramsLong = { symbol, marginCoin: quoteAsset, leverage: request.longLeverage, holdSide: 'long' };
                yield this.post(`api/mix/v1/account/setLeverage`, { params: paramsLong, error: errorLeverage });
                const paramsShort = { symbol, marginCoin: quoteAsset, leverage: request.shortLeverage, holdSide: 'short' };
                yield this.post(`api/mix/v1/account/setLeverage`, { params: paramsShort, error: errorLeverage });
            }
            return Promise.resolve();
        });
    }
    getHistoryOrders(request) { return {}; }
    getOpenOrders(symbol) {
        return __awaiter(this, void 0, void 0, function* () {
            const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
            const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
            const error = { code: 500, message: `No s'ha pogut obtenir les orders del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
            const results = [];
            if (this.market === 'spot') {
                const params = { symbol: this.getSymbolProduct(symbol) };
                const response = yield this.post(`api/spot/v1/trade/open-orders`, { params, error });
                results.push(...response.data.map(o => {
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
                const response = yield this.get(`api/mix/v1/order/marginCoinCurrent`, { params, error });
                results.push(...response.data.map(o => {
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
                const responsePlan = yield this.get(`api/mix/v1/plan/currentPlan`, { params: paramsPlan, error });
                results.push(...responsePlan.data.map(o => {
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
            const params = { symbol, marginCoin: quoteAsset };
            const error = { code: 500, message: `No s'ha pogut obtenir l'ordre ${request.id} en ${this.market} a Bitget.` };
            if (this.market === 'spot') {
                const response = yield this.get(`api/spot/v1/trade/orderInfo`, { params, error });
                return response;
            }
            else {
                const response = yield this.get(`api/mix/v1/order/detail`, { params, error });
                return response;
            }
        });
    }
    postOrder(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const symbol = this.getSymbolProduct(request.symbol);
            const error = { code: 500, message: `No s'ha pogut enviar l'ordre ${request.id} en ${this.market} a Bitget.` };
            if (this.market === 'spot') {
                const params = {
                    symbol,
                    side: (0, bitget_parsers_2.formatOrderSide)(request.side),
                    orderType: (0, bitget_parsers_2.formatOrderType)(request.type),
                    force: 'normal',
                    price: +request.price,
                    quantity: +request.quantity,
                    clientOrderId: request.id
                };
                const response = yield this.post(`api/spot/v1/trade/orders`, { params, error });
                const order = Object.assign(Object.assign({}, request), { status: 'post', exchangeId: response.data.orderId });
                return order;
            }
            else {
                const { baseAsset, quoteAsset } = this.resolveAssets(request.symbol);
                const baseParams = {
                    symbol,
                    marginCoin: quoteAsset,
                    size: +request.quantity,
                    clientOid: request.id,
                    side: (0, bitget_parsers_2.formatOrderTradeSide)(request.side, request.trade),
                    timeInForceValue: 'normal',
                };
                if (!request.stop) {
                    const price = request.type === 'limit' ? { price: request.price } : undefined;
                    const orderType = (0, bitget_parsers_2.formatOrderType)(request.type);
                    const params = Object.assign(Object.assign(Object.assign({}, baseParams), { orderType }), price);
                    const response = yield this.post(`api/mix/v1/order/placeOrder`, { params, error });
                    const order = Object.assign(Object.assign({}, request), { status: 'post', exchangeId: response.data.orderId });
                    return order;
                }
                else {
                    const executePrice = +request.price;
                    const triggerPrice = +request.stopPrice;
                    const orderType = request.type;
                    const triggerType = request.type === 'market' ? 'market_price' : 'fill_price';
                    const params = Object.assign(Object.assign({}, baseParams), { executePrice, triggerPrice, orderType, triggerType });
                    const response = yield this.post(`api/mix/v1/plan/placePlan`, { params, error });
                    const order = Object.assign(Object.assign({}, request), { status: 'post', exchangeId: response.data.orderId });
                    return order;
                }
            }
        });
    }
    cancelOrder(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { baseAsset, quoteAsset } = this.resolveAssets(request.symbol);
            const symbol = this.getSymbolProduct(request.symbol);
            const error = { code: 500, message: `No s'ha pogut cancel·lar l'ordre ${request.id} en ${this.market} a Bitget.` };
            if (this.market === 'spot') {
                const params = {
                    symbol,
                    orderId: request.exchangeId
                };
                const response = yield this.post(`api/spot/v1/trade/cancel-order`, { params, error });
                const order = Object.assign({ status: 'new', id: response.data.clientOid }, request);
                return order;
            }
            else {
                const { baseAsset, quoteAsset } = this.resolveAssets(request.symbol);
                let params = {
                    symbol,
                    marginCoin: quoteAsset,
                    orderId: request.exchangeId
                };
                const isStop = request.type.includes('stop');
                if (request.type.includes('stop')) {
                    params = Object.assign(Object.assign({}, params), { planType: 'normal_plan' });
                }
                const response = yield this.post(isStop ? `api/mix/v1/plan/cancelPlan` : `api/mix/v1/order/cancel-order`, { params, error });
            }
        });
    }
}
exports.BitgetApi = BitgetApi;
//# sourceMappingURL=bitget-api.js.map