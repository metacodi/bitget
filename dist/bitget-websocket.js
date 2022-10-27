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
exports.BitgetWebsocket = void 0;
const isomorphic_ws_1 = __importDefault(require("isomorphic-ws"));
const events_1 = __importDefault(require("events"));
const rxjs_1 = require("rxjs");
const crypto_1 = require("crypto");
const moment_1 = __importDefault(require("moment"));
const abstract_exchange_1 = require("@metacodi/abstract-exchange");
const abstract_exchange_2 = require("@metacodi/abstract-exchange");
const bitget_api_1 = require("./bitget-api");
const bitget_parsers_1 = require("./bitget-parsers");
class BitgetWebsocket extends events_1.default {
    constructor(options) {
        super();
        this.status = 'initial';
        this.emitters = {};
        this.subArguments = {};
        this.options = Object.assign(Object.assign({}, this.defaultOptions), options);
    }
    get instType() { return this.market === 'spot' ? 'sp' : 'mc'; }
    get market() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.market; }
    get streamType() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.streamType; }
    get apiKey() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.apiKey; }
    get apiSecret() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.apiSecret; }
    get apiPassphrase() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.apiPassphrase; }
    get isTest() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.isTest; }
    get reconnectPeriod() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.reconnectPeriod; }
    get pingInterval() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.pingInterval; }
    get pongTimeout() { var _a; return (_a = this.options) === null || _a === void 0 ? void 0 : _a.pongTimeout; }
    get defaultOptions() {
        return {
            isTest: true,
            reconnectPeriod: 5 * 1000,
            pingInterval: 25 * 1000,
            pongTimeout: 10 * 1000,
        };
    }
    getApiClient() {
        const { market } = this;
        const { apiKey, apiSecret, apiPassphrase, isTest } = this.options;
        return new bitget_api_1.BitgetApi({ market, apiKey, apiSecret, apiPassphrase, isTest });
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.api = this.getApiClient();
            return yield this.connect();
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            const { market } = this;
            const { pingInterval, pongTimeout, isTest } = this.options;
            yield this.api.getExchangeInfo();
            const url = market === 'spot' ? `wss://ws.bitget.com/spot/v1/stream` : `wss://ws.bitget.com/mix/v1/stream`;
            this.options.pingInterval = pingInterval || this.defaultOptions.pingInterval;
            this.options.pongTimeout = pongTimeout || this.defaultOptions.pongTimeout;
            console.log(this.wsId, '=> connecting...', url);
            this.ws = new isomorphic_ws_1.default(url);
            this.ws.onopen = event => this.onWsOpen(event);
            this.ws.onerror = event => this.onWsError(event);
            this.ws.onclose = event => this.onWsClose(event);
            this.ws.onmessage = event => this.onWsMessage(event);
            if (typeof this.ws.on === 'function') {
                this.ws.on('ping', event => this.onWsPing(event));
                this.ws.on('pong', event => this.onWsPong(event));
            }
            this.ws.onping = (event) => this.onWsPing(event);
            this.ws.onpong = (event) => this.onWsPong(event);
            return Promise.resolve();
        });
    }
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
    reconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.status === 'reconnecting') {
                return;
            }
            this.status = 'reconnecting';
            yield this.close();
            setTimeout(() => this.connect(), this.reconnectPeriod);
            return Promise.resolve();
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.unsubscribeAllChannels();
                if (this.status !== 'reconnecting') {
                    this.status = 'closing';
                }
                if (this.pingTimer) {
                    this.pingTimer.unsubscribe();
                }
                if (this.pongTimer) {
                    this.pongTimer.unsubscribe();
                }
                this.ws.close();
                if (typeof this.ws.terminate === 'function') {
                    this.ws.terminate();
                }
                return Promise.resolve();
            }
            catch (error) {
                console.error(error);
                return Promise.reject(error);
            }
        });
    }
    destroy() {
        Object.keys(this.emitters).map(WsStreamEmitterType => this.emitters[WsStreamEmitterType].complete());
        this.emitters = {};
    }
    onWsOpen(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const wsType = this.streamType === 'market' ? 'public' : 'private';
            if (this.status === 'reconnecting') {
                console.log(this.wsId, '=> reconnected!');
                this.emit('reconnected', { event });
            }
            else {
                console.log(this.wsId, '=> connected!');
                this.emit('open', { event });
            }
            if (wsType === 'private') {
                yield this.login();
            }
            else {
                this.onConnected();
            }
        });
    }
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            const { apiKey, apiSecret, apiPassphrase } = this;
            this.status = 'login';
            this.loggedIn = false;
            const timestamp = Math.floor(Date.now() / 1000);
            const message = `${timestamp}GET/user/verify`;
            const signature = yield this.signMessage(message, apiSecret);
            const data = { op: 'login', args: [{ apiKey, passphrase: apiPassphrase, timestamp, sign: signature }] };
            console.log(`${this.wsId} =>`, data);
            this.ws.send(JSON.stringify(data));
        });
    }
    onConnected() {
        this.status = 'connected';
        if (this.pingTimer) {
            this.pingTimer.unsubscribe();
        }
        this.pingTimer = (0, rxjs_1.interval)(this.pingInterval).subscribe(() => this.ping());
        this.respawnChannelSubscriptions();
    }
    onWsClose(event) {
        console.log(this.wsId, '=> closed');
        if (this.status !== 'closing') {
            this.reconnect();
            this.emit('reconnecting', { event });
        }
        else {
            this.status = 'initial';
            this.emit('close', { event });
        }
    }
    onWsError(event) {
        console.error(`${this.wsId} =>`, (event === null || event === void 0 ? void 0 : event.error) || event);
    }
    ping() {
        console.log(this.wsId, `=> Sending ping...`);
        try {
            if (this.pongTimer) {
                this.pongTimer.unsubscribe();
            }
            if (typeof this.ws.ping === 'function') {
                this.pongTimer = (0, rxjs_1.timer)(this.pongTimeout).subscribe(() => {
                    console.log(this.wsId, `=> Pong timeout - closing socket to reconnect`);
                    this.reconnect();
                });
                this.ws.send('ping');
            }
            else {
            }
        }
        catch (error) {
            console.error(this.wsId, `=> Failed to send WS ping`, error);
        }
    }
    onWsPing(event) {
        try {
            console.log(this.wsId, '=> Received ping, sending pong');
            if (typeof this.ws.pong === 'function') {
                this.ws.pong();
            }
            else {
            }
        }
        catch (error) {
            console.error(this.wsId, `=> Failed to send WS pong`, error);
        }
    }
    onWsPong(event) {
        console.log(this.wsId, '=> Received pong, clearing timer');
        if (this.pongTimer) {
            this.pongTimer.unsubscribe();
        }
    }
    onWsMessage(event) {
        const data = this.parseWsMessage(event);
        this.emit('message', data);
        switch (this.discoverEventType(data)) {
            case 'login':
                this.loggedIn = true;
                this.onConnected();
                break;
            case 'pong':
                this.onWsPong(event);
                break;
            case 'ticker':
            case 'klines':
            case 'account':
            case 'positions':
            case 'orders':
            case 'ordersAlgo':
                const obj = data;
                this.emitChannelEvent(obj);
                break;
            case 'error':
            default:
                console.log('onWsMessage =>', data);
        }
    }
    parseWsMessage(event) {
        if (typeof event === 'string') {
            const parsedEvent = JSON.parse(event);
            if (parsedEvent.data) {
                return this.parseWsMessage(parsedEvent.data);
            }
        }
        if ((event === null || event === void 0 ? void 0 : event.data) === 'pong') {
            return { event: 'pong' };
        }
        else {
            return (event === null || event === void 0 ? void 0 : event.data) ? JSON.parse(event.data) : event;
        }
    }
    discoverEventType(data) {
        const obj = Array.isArray(data) ? (data.length ? data[0] : undefined) : data;
        if (typeof obj === 'object') {
            if (obj.hasOwnProperty('event')) {
                return obj.event;
            }
            else if (obj.hasOwnProperty('arg') && obj.arg.hasOwnProperty('channel')) {
                const ev = obj;
                const channel = ev.arg.channel.startsWith('candle') ? 'klines' : ev.arg.channel;
                return channel;
            }
        }
        return undefined;
    }
    priceTicker(symbol) {
        const channel = `ticker`;
        const { instType } = this;
        const instId = this.api.getInstrumentId(symbol);
        return this.registerChannelSubscription({ channel, instType, instId });
    }
    klineTicker(symbol, interval) {
        const channel = `candle${interval}`;
        const { instType } = this;
        const instId = this.api.getInstrumentId(symbol);
        return this.registerChannelSubscription({ channel, instType, instId });
    }
    accountUpdate(symbol) {
        if (this.market === 'spot') {
            return this.registerChannelSubscription({ channel: 'account', instType: 'spbl', instId: 'default' });
        }
        else {
            const instId = symbol ? this.api.getSymbolProduct(symbol) : 'default';
            const instType = symbol === undefined || (symbol === null || symbol === void 0 ? void 0 : symbol.quoteAsset) === 'USDT' ? 'umcbl' : (symbol.quoteAsset === 'USDC' ? 'cmcbl' : 'dmcbl');
            return this.registerChannelSubscription([{ channel: 'account', instType: this.isTest ? 's' + instType : instType, instId: 'default' }, { channel: 'positions', instType: this.isTest ? 's' + instType : instType, instId }]);
        }
    }
    orderUpdate(symbol) {
        if (this.market === 'spot') {
            const instId = symbol ? { instId: this.api.getSymbolProduct(symbol) } : 'default';
            return this.registerChannelSubscription({ channel: 'orders', instType: 'spbl', instId });
        }
        else {
            const instId = symbol ? this.api.getSymbolProduct(symbol) : 'default';
            const instType = symbol === undefined || (symbol === null || symbol === void 0 ? void 0 : symbol.quoteAsset) === 'USDT' ? 'umcbl' : (symbol.quoteAsset === 'USDC' ? 'cmcbl' : 'dmcbl');
            return this.registerChannelSubscription([{ channel: 'orders', instType: this.isTest ? 's' + instType : instType, instId: 'default' }, { channel: 'ordersAlgo', instType: this.isTest ? 's' + instType : instType, instId }]);
        }
    }
    allUpdate(symbol) {
        if (this.market === 'spot') {
            const instId = symbol ? { instId: this.api.getSymbolProduct(symbol) } : 'default';
            return this.registerChannelSubscription([
                { channel: 'account', instType: 'spbl', instId: 'default' },
                { channel: 'orders', instType: 'spbl', instId }
            ]);
        }
        else {
            const instId = symbol ? this.api.getSymbolProduct(symbol) : 'default';
            const instType = symbol === undefined || (symbol === null || symbol === void 0 ? void 0 : symbol.quoteAsset) === 'USDT' ? 'umcbl' : (symbol.quoteAsset === 'USDC' ? 'cmcbl' : 'dmcbl');
            return this.registerChannelSubscription([
                { channel: 'account', instType: this.isTest ? 's' + instType : instType, instId: 'default' },
                { channel: 'positions', instType: this.isTest ? 's' + instType : instType, instId },
                { channel: 'orders', instType: this.isTest ? 's' + instType : instType, instId: 'default' },
                { channel: 'ordersAlgo', instType: this.isTest ? 's' + instType : instType, instId }
            ]);
        }
    }
    registerChannelSubscription(args) {
        if (!Array.isArray(args)) {
            args = [args];
        }
        ;
        const channelKey = args.map(arg => (0, abstract_exchange_2.buildChannelKey)(arg)).join(';');
        const emitter = this.emitters[channelKey];
        if (emitter) {
            return emitter;
        }
        const created = new rxjs_1.Subject();
        this.emitters[channelKey] = created;
        this.subArguments[channelKey] = args;
        if (this.status === 'connected') {
            args.map(arg => this.subscribeChannel(arg));
        }
        return created;
    }
    respawnChannelSubscriptions() {
        const topics = [];
        Object.keys(this.emitters).map(channelKey => {
            const stored = this.emitters[channelKey];
            const hasSubscriptions = !(0, abstract_exchange_2.isSubjectUnobserved)(stored);
            if (hasSubscriptions) {
                const args = this.subArguments[channelKey];
                args.map(a => this.subscribeChannel(a));
            }
            else {
                if (stored) {
                    stored.complete();
                }
                delete this.emitters[channelKey];
                delete this.subArguments[channelKey];
            }
        });
    }
    emitChannelEvent(ev) {
        delete ev.arg.uid;
        const channelKey = Object.keys(this.subArguments).find(key => !!this.subArguments[key].find(arg => (0, abstract_exchange_2.matchChannelKey)(arg, ev.arg)));
        const emitter = this.emitters[channelKey];
        if (!emitter) {
            return;
        }
        const hasSubscriptions = !(0, abstract_exchange_2.isSubjectUnobserved)(emitter);
        if (hasSubscriptions) {
            const parser = this.getChannelParser(ev.arg);
            const value = parser ? parser.call(this, ev) : ev;
            emitter.next(value);
        }
        else {
            this.unsubscribeChannel(ev.arg);
            if (emitter) {
                emitter.complete();
            }
            delete this.emitters[channelKey];
            delete this.subArguments[channelKey];
        }
    }
    getChannelParser(arg) {
        const channel = arg.channel.startsWith('candle') ? 'klines' : arg.channel;
        switch (channel) {
            case 'ticker': return this.parsePriceTickerEvent;
            case 'klines': return this.parseKlineTickerEvent;
            case 'account': return this.parseAccountUpdateEvent;
            case 'positions': return this.parseAccountUpdateEvent;
            case 'orders': return this.parseOrderUpdateEvent;
            default: return undefined;
        }
    }
    subscribeChannel(arg) {
        const data = { op: "subscribe", args: [arg] };
        console.log(this.wsId, '=> subscribing...', JSON.stringify(data));
        this.ws.send(JSON.stringify(data), error => error ? this.onWsError(error) : undefined);
    }
    unsubscribeChannel(arg) {
        console.log(this.wsId, '=> unsubscribing...', arg);
        const data = { op: "unsubscribe", args: [arg] };
        const WS_STATE_OPEN = 1;
        if (this.ws.readyState === WS_STATE_OPEN) {
            this.ws.send(JSON.stringify(data), error => error ? this.onWsError(error) : undefined);
        }
    }
    unsubscribeAllChannels() {
        Object.keys(this.emitters).map(channelKey => {
            const emitter = this.emitters[channelKey];
            if (emitter) {
                const args = this.subArguments[channelKey];
                args.map(a => this.unsubscribeChannel(a));
            }
        });
    }
    parsePriceTickerEvent(ev) {
        const data = ev.data[0];
        const symbol = this.api.parseInstrumentId(ev.arg.instId);
        const baseVolume = +data.baseVolume;
        const quoteVolume = +data.quoteVolume;
        const ts = +data[this.market === 'spot' ? 'ts' : 'systemTime'];
        return {
            symbol,
            price: +data.last,
            baseVolume, quoteVolume,
            timestamp: (0, abstract_exchange_1.timestamp)((0, moment_1.default)(ts)),
        };
    }
    parseKlineTickerEvent(ev) {
        const symbol = this.api.parseInstrumentId(ev.arg.instId);
        const candle = ev.arg.channel.replace('candle', '');
        const unit = candle.charAt(candle.length - 1);
        const interval = (['H', 'D', 'W', 'Y'].includes(unit) ? candle.toLocaleLowerCase() : candle);
        const data = ev.data[ev.data.length - 1];
        const openTime = (0, abstract_exchange_1.timestamp)((0, moment_1.default)(+data[0]));
        const closeTime = (0, abstract_exchange_2.calculateCloseTime)(openTime, interval);
        const baseVolume = +data[5];
        const quoteVolume = +data[5] * +data[4];
        return {
            symbol, openTime, closeTime, interval,
            open: +data[1],
            high: +data[2],
            low: +data[3],
            close: +data[4],
            baseVolume, quoteVolume,
        };
    }
    parseAccountUpdateEvent(ev) {
        if (ev.arg.channel === 'account') {
            if (this.market === 'spot') {
                return {
                    balances: ev.data.map(b => ({ asset: b.coinName, available: b.available })),
                };
            }
            else if (this.market === 'futures') {
                return {
                    balances: ev.data.map(b => ({ asset: b.coinName, available: b.available, locked: b.locked })),
                };
            }
        }
        else if (ev.arg.channel === 'positions') {
            return {};
        }
    }
    parseOrderUpdateEvent(ev) {
        const data = ev.data[0];
        if (this.market === 'spot') {
            return {};
        }
        else {
            const symbol = this.api.parseInstrumentId(data.instId);
            const baseVolume = +data.baseVolume;
            const quoteVolume = +data.quoteVolume;
            const side = (0, bitget_parsers_1.parseOrderSide)(data.side);
            const status = (0, bitget_parsers_1.parseOrderStatus)(data.status);
            return {
                id: data.clOrdId,
                exchangeId: data.ordId,
                side,
                type: (0, bitget_parsers_1.parseOrderType)(data.ordType),
                trade: (0, bitget_parsers_1.parsetOrderTradeSide)(data.posSide),
                status,
                symbol: symbol,
                baseQuantity: status === 'filled' || status === 'partial' ? +data.fillSz : +data.sz,
                quoteQuantity: status === 'filled' || status === 'partial' ? +data.fillNotionalUsd : +data.notionalUsd,
                created: (0, abstract_exchange_1.timestamp)((0, moment_1.default)(+data.cTime)),
                executed: (0, abstract_exchange_1.timestamp)((0, moment_1.default)(status === 'filled' || status === 'partial' ? +data.fillTime : +data.uTime)),
                profit: status === 'filled' || status === 'partial' ? data === null || data === void 0 ? void 0 : data.pnl : 0,
                commission: status === 'filled' || status === 'partial' ? data === null || data === void 0 ? void 0 : data.fillFee : 0,
                commissionAsset: status === 'filled' || status === 'partial' ? symbol.quoteAsset : '',
                fillPrice: status === 'filled' || status === 'partial' ? +data.fillPx : 0,
            };
        }
    }
    get wsId() { return `${this.market}-${this.streamType}-ws`; }
}
exports.BitgetWebsocket = BitgetWebsocket;
//# sourceMappingURL=bitget-websocket.js.map