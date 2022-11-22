import WebSocket from 'isomorphic-ws';
import EventEmitter from 'events';
import { Subject, interval, timer, Subscription } from 'rxjs';
import { createHmac } from 'crypto';
import moment from 'moment';

import { AccountInfo, Position, timestamp } from '@metacodi/abstract-exchange';
import { MarketType, SymbolType, MarketPrice, MarketKline, KlineIntervalType, Order, CoinType, isSubjectUnobserved, matchChannelKey, buildChannelKey, calculateCloseTime, ApiOptions } from '@metacodi/abstract-exchange';
import { ExchangeWebsocket, WebsocketOptions, WsStreamType, WsConnectionState, WsAccountUpdate } from '@metacodi/abstract-exchange';

import { BitgetApi } from './bitget-api';
import { BitgetInstrumentType, BitgetWsChannelEvent, BitgetWsChannelType, BitgetWsEventType, BitgetWsSubscriptionArguments, BitgetWsSubscriptionRequest } from './bitget.types';
import { formatOrderSide, formatOrderType, formatOrderTradeSide, parseOrderSide, parseOrderType, parsetOrderTradeSide, parseOrderStatus, parsePlanStatus, parsetMarginMode, parsetPositionTradeSide, parsetOrderAlgoTradeSide } from './bitget-parsers';


/**
 * {@link https://bitgetlimited.github.io/apidoc/en/spot/#websocketapi Spot Websocket}
 * {@link https://bitgetlimited.github.io/apidoc/en/mix/#websocketapi Futures Websocket}
 */
export class BitgetWebsocket extends EventEmitter implements ExchangeWebsocket {
  /** Estat de la connexió. */
  status: WsConnectionState = 'initial';
  /** Referència a la instància del client API. */
  api: BitgetApi;
  /** Opcions de configuració. */
  protected options: WebsocketOptions;
  /** Referència a la instància del websocket subjacent. */
  protected ws: WebSocket;
  /** Subscripció al interval que envia un ping al servidor per mantenir viva la connexió.  */
  protected pingTimer?: Subscription;
  /** Subscriptor al timer que controla la resposta del servidor. */
  protected pongTimer?: Subscription;
  /** Emisors de missatges. */
  protected emitters: { [channelKey: string]: Subject<any> } = {};
  /** Identificador de login del servidor websocket. */
  protected loggedIn: boolean;
  /** Arguments per tornar a subscriure's al canal (respawn). */
  protected subArguments: { [key: string]: BitgetWsSubscriptionArguments[] } = {};
  // /** Identificador de connexió rebut del servidor websocket. */
  // protected connectId?: string;
  // /** Identificador de connexió rebut del servidor websocket. */
  // protected userId?: string;

  constructor(
    options: WebsocketOptions,
  ) {
    super();
    this.options = { ...this.defaultOptions, ...options };
  }

  // ---------------------------------------------------------------------------------------------------
  //  options
  // ---------------------------------------------------------------------------------------------------

  get instType(): BitgetInstrumentType { return this.market === 'spot' ? 'sp' : 'mc'; }

  get market(): MarketType { return this.options?.market; }

  get streamType(): WsStreamType { return this.options?.streamType; }

  get apiKey(): string { return this.options?.apiKey; }

  get apiSecret(): string { return this.options?.apiSecret; }

  get apiPassphrase(): string { return this.options?.apiPassphrase; }

  get isTest(): boolean { return this.options?.isTest; }

  get reconnectPeriod(): number { return this.options?.reconnectPeriod; }

  get pingInterval(): number { return this.options?.pingInterval; }

  get pongTimeout(): number { return this.options?.pongTimeout; }

  get defaultOptions(): Partial<WebsocketOptions> {
    return {
      isTest: true,
      reconnectPeriod: 5 * 1000,
      /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#connect Connect } */
      pingInterval: 25 * 1000,
      pongTimeout: 10 * 1000,
    }
  }


  // ---------------------------------------------------------------------------------------------------
  //  api
  // ---------------------------------------------------------------------------------------------------

  protected getApiClient(): BitgetApi {
    const { market } = this;
    const { apiKey, apiSecret, apiPassphrase, isTest } = this.options;
    return new BitgetApi({ market, apiKey, apiSecret, apiPassphrase, isTest });
  }

  async initialize() {
    // Instanciem un client per l'API.
    this.api = this.getApiClient();
    // NOTA: Com que el ws es salta la restricció de la IP, fem una comprovació abans de connectar-lo.
    if (this.options.apiKey) { await this.api.getApiKeyInfo(); }
    // Iniciem la connexió amb l'stream de l'exchange.
    await this.connect();
  }


  // ---------------------------------------------------------------------------------------------------
  //  connect . close . login
  // ---------------------------------------------------------------------------------------------------

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#connect Connect}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#connect Connect}
   */
  async connect() {
    const { market } = this;
    const { pingInterval, pongTimeout, isTest } = this.options;
    // Obtenim la info de l'exchange.
    await this.api.getExchangeInfo();

    const url = market === 'spot' ? `wss://ws.bitget.com/spot/v1/stream` : `wss://ws.bitget.com/mix/v1/stream`;

    // Ajustem els paràmetres segons el nou servidor.
    this.options.pingInterval = pingInterval || this.defaultOptions.pingInterval;
    this.options.pongTimeout = pongTimeout || this.defaultOptions.pongTimeout;

    // Nova instància.
    // console.log(this.wsId, '=> connecting...', url);
    this.ws = new WebSocket(url);
    // Listeners.
    this.ws.onopen = event => this.onWsOpen(event);
    this.ws.onerror = event => this.onWsError(event);
    this.ws.onclose = event => this.onWsClose(event);
    this.ws.onmessage = event => this.onWsMessage(event);
    // ping . pong
    if (typeof this.ws.on === 'function') {
      this.ws.on('ping', event => this.onWsPing(event));
      this.ws.on('pong', event => this.onWsPong(event));
    }
    // Not sure these work in the browser, the traditional event listeners are required for ping/pong frames in node.
    (this.ws as any).onping = (event: WebSocket.Event) => this.onWsPing(event);
    (this.ws as any).onpong = (event: WebSocket.Event) => this.onWsPong(event);
    return Promise.resolve();
  }

  async signMessage(message: string, secret: string): Promise<string> {
    // Si és possible, fem servir la funció de crypto.
    if (typeof createHmac === 'function') {
      return createHmac('sha256', secret).update(message).digest('base64');
    }
    // Si no s'ha pogut importar la funció en entorn browser, li donem suport.
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };
    const extractable = false;
    const keyUsages: KeyUsage[] = ['sign'];
    const key = await window.crypto.subtle.importKey('raw', keyData, algorithm, extractable, keyUsages);
    const signature = await window.crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Buffer.from(signature).toString('base64');
  };

  async reconnect() {
    if (this.status === 'reconnecting') { return; }
    this.status = 'reconnecting';
    await this.close();
    setTimeout(() => this.connect(), this.reconnectPeriod);
    return Promise.resolve();
  }

  async close() {
    try {
      this.unsubscribeAllChannels();
      if (this.status !== 'reconnecting') { this.status = 'closing'; }
      if (this.pingTimer) { this.pingTimer.unsubscribe(); }
      if (this.pongTimer) { this.pongTimer.unsubscribe(); }
      // NOTA: Comprovem que existeix una instància creada.
      if (typeof this.ws?.close === 'function') { this.ws.close(); }
      // #168: ws.terminate() undefined in browsers.
      if (typeof this.ws?.terminate === 'function') { this.ws.terminate(); }
      return Promise.resolve();

    } catch (error) {
      console.error(error);
      return Promise.reject(error);
    }
  }

  destroy() {
    Object.keys(this.emitters).map(WsStreamEmitterType => this.emitters[WsStreamEmitterType].complete());
    this.emitters = {};
  }


  // ---------------------------------------------------------------------------------------------------
  //  open . close . error
  // ---------------------------------------------------------------------------------------------------

  protected async onWsOpen(event: WebSocket.Event) {
    const wsType = this.streamType === 'market' ? 'public' : 'private';

    if (this.status === 'reconnecting') {
      // console.log(this.wsId, '=> reconnected!');
      this.emit('reconnected', { event });
    } else {
      // console.log(this.wsId, '=> connected!');
      this.emit('open', { event });

    }
    if (wsType === 'private') {
      await this.login();
    } else {
      this.onConnected();
    }
  }

  protected async login() {
    const { apiKey, apiSecret, apiPassphrase } = this;
    this.status = 'login';
    this.loggedIn = false;
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${timestamp}GET/user/verify`;
    const signature = await this.signMessage(message, apiSecret);
    const data = { op: 'login', args: [{ apiKey, passphrase: apiPassphrase, timestamp, sign: signature }] };
    // console.log(`${this.wsId} =>`, data);
    this.ws.send(JSON.stringify(data));
  }

  protected onConnected() {
    this.status = 'connected';
    // Iniciem la comunicació ping-pong.
    if (this.pingTimer) { this.pingTimer.unsubscribe(); }
    this.pingTimer = interval(this.pingInterval).subscribe(() => this.ping());
    // Establim les subscripcions dels topics.
    this.respawnChannelSubscriptions();
  }

  protected onWsClose(event: WebSocket.CloseEvent) {
    // console.log(this.wsId, '=> closed');
    if (this.status !== 'closing') {
      this.reconnect();
      this.emit('reconnecting', { event });
    } else {
      this.status = 'initial';
      this.emit('close', { event });
    }
  }

  protected onWsError(event: any) {
    // Ignore "Error: Cannot call write after a stream was destroyed"
    if (event?.code === 'ERR_STREAM_DESTROYED') { return; }
    // Ignore "xhr poll error"
    if (event?.type === 'TransportError') { return; }
    // console.log(this.wsId, '=> onWsError');
    console.error(`${this.wsId} =>`, event?.error || event);
  }


  // ---------------------------------------------------------------------------------------------------
  //  ping . pong
  // ---------------------------------------------------------------------------------------------------

  protected ping() {
    // console.log(this.wsId, `=> Sending ping...`);
    try {
      if (this.pongTimer) { this.pongTimer.unsubscribe(); }

      if (typeof this.ws.ping === 'function') {
        this.pongTimer = timer(this.pongTimeout).subscribe(() => {
          console.log(this.wsId, `=> Pong timeout - closing socket to reconnect`);
          this.reconnect();
        });
        // this.ws.ping();
        this.ws.send('ping');
      } else {
        // this.ws.send(0x09);
        // this.ws.send(Buffer.alloc(0x09));
      }

    } catch (error) {
      console.error(this.wsId, `=> Failed to send WS ping`, error);
      // TODO: Notificar l'error.
    }
  }

  protected onWsPing(event: any) {
    try {
      // console.log(this.wsId, '=> Received ping, sending pong');
      if (typeof this.ws.pong === 'function') {
        this.ws.pong();
      } else {
        // this.ws.send(0xA);
      }

    } catch (error) {
      // console.error(this.wsId, `=> Failed to send WS pong`, error);
      // TODO: Notificar l'error.
    }
  }

  protected onWsPong(event: any) {
    // console.log(this.wsId, '=> Received pong, clearing timer');
    if (this.pongTimer) { this.pongTimer.unsubscribe(); }
  }


  // ---------------------------------------------------------------------------------------------------
  //  message event
  // ---------------------------------------------------------------------------------------------------

  protected onWsMessage(event: WebSocket.MessageEvent) {
    const data = this.parseWsMessage(event);
    // console.log(JSON.stringify(data));
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
        const obj = data as BitgetWsChannelEvent;
        this.emitChannelEvent(obj);
        break;
      case 'error':
        // NOTA: no podem llançar l'excepció pq, com que ningú la intercepta, fa caure el servidor.
        // throw { code: data.code, message: `WEBSOCKET-ERROR: ${data.msg}` };
        console.error(this.constructor.name + `.onWsMessage error: ${data.msg}`);
      default:
        console.log(this.constructor.name + '.onWsMessage =>', data);
      // console.log(JSON.stringify(data));
    }
  }

  protected parseWsMessage(event: any): any {
    if (typeof event === 'string') {
      const parsedEvent = JSON.parse(event);
      if (parsedEvent.data) {
        return this.parseWsMessage(parsedEvent.data);
      }
    }
    if (event?.data === 'pong') {
      return { event: 'pong' };
    } else {
      return event?.data ? JSON.parse(event.data) : event;
    }
  }

  protected discoverEventType(data: any): BitgetWsChannelType | 'klines' | BitgetWsEventType | undefined {
    const obj = Array.isArray(data) ? (data.length ? data[0] : undefined) : data;
    if (typeof obj === 'object') {
      if (obj.hasOwnProperty('event')) {
        return obj.event as BitgetWsEventType;
      } else if (obj.hasOwnProperty('arg') && obj.arg.hasOwnProperty('channel')) {
        const ev = obj as BitgetWsChannelEvent;
        const channel = ev.arg.channel.startsWith('candle') ? 'klines' : ev.arg.channel;
        return channel;
      }
    }
    return undefined;
  }


  // ---------------------------------------------------------------------------------------------------
  //  Public channels
  // ---------------------------------------------------------------------------------------------------

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#tickers-channel Tickers channel}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#tickers-channel Tickers channel}
   */
  priceTicker(symbol: SymbolType): Subject<MarketPrice> {
    const channel: BitgetWsChannelType = `ticker`;
    const { instType } = this;
    const instId = this.api.getInstrumentId(symbol);
    return this.registerChannelSubscription({ channel, instType, instId });
  }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#candlesticks-channel Candlesticks channel}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#candlesticks-channel Candlesticks channel}
   */
  klineTicker(symbol: SymbolType, interval: KlineIntervalType): Subject<MarketKline> {
    const channel: BitgetWsChannelType = `candle${interval}`;
    const { instType } = this;
    const instId = this.api.getInstrumentId(symbol);
    return this.registerChannelSubscription({ channel, instType, instId });
  }


  // ---------------------------------------------------------------------------------------------------
  //  Private channels
  // ---------------------------------------------------------------------------------------------------

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#account-channel Account channel}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#account-channel Account channel}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#positions-channel Positions channel}
   */
  accountUpdate(symbol?: SymbolType): Subject<WsAccountUpdate> {
    if (this.market === 'spot') {
      // NOTA: el canal `account` no accepta monedes per `instId`, només 'default'.
      return this.registerChannelSubscription({ channel: 'account', instType: 'spbl', instId: 'default' });
    } else {
      const instId = symbol ? this.api.getSymbolProduct(symbol) : 'default';
      const instType = symbol === undefined || symbol?.quoteAsset === 'USDT' ? 'umcbl' : (symbol.quoteAsset === 'USDC' ? 'cmcbl' : 'dmcbl');
      // NOTA: el canal `account` no accepta monedes per `instId`, només 'default'.
      // NOTA: el canal `positions` requereix un paràmetre `instId` informat encara que a la documentació digui que és opcional.
      return this.registerChannelSubscription([{ channel: 'account', instType: this.isTest ? 's' + instType : instType, instId: 'default' }, { channel: 'positions', instType: this.isTest ? 's' + instType : instType, instId }]);
    }
  }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#order-channel Order channel}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#order-channel Order channel}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#plan-order-channel Plan Order Channel}
   */
  orderUpdate(symbol?: SymbolType): Subject<Order> {
    if (this.market === 'spot') {
      const instId = symbol ? { instId: this.api.getSymbolProduct(symbol) } : 'default';
      // NOTA: el canal `orders` requereix un paràmetre `instId` informat encara que a la documentació digui que és opcional.
      return this.registerChannelSubscription({ channel: 'orders', instType: 'spbl', instId });
    } else {
      const instId = symbol ? this.api.getSymbolProduct(symbol) : 'default';
      const instType = symbol === undefined || symbol?.quoteAsset === 'USDT' ? 'umcbl' : (symbol.quoteAsset === 'USDC' ? 'cmcbl' : 'dmcbl');
      // NOTA: el canal `orders` requereix un paràmetre `instId` informat encara que a la documentació digui que és opcional.
      // NOTA: el canal `ordersAlgo` requereix un paràmetre `instId` informat encara que a la documentació digui que és opcional.
      return this.registerChannelSubscription([{ channel: 'orders', instType: this.isTest ? 's' + instType : instType, instId: 'default' }, { channel: 'ordersAlgo', instType: this.isTest ? 's' + instType : instType, instId }]);
    }
  }

  // ---------------------------------------------------------------------------------------------------
  //  Channel subscriptions
  // ---------------------------------------------------------------------------------------------------

  protected registerChannelSubscription(args: BitgetWsSubscriptionArguments | BitgetWsSubscriptionArguments[]) {
    if (!Array.isArray(args)) { args = [args] };
    // Ex: channelKey = 'tickers#USDT'
    const channelKey = args.map(arg => buildChannelKey(arg)).join(';');
    const emitter = this.emitters[channelKey]
    if (emitter) { return emitter; }
    const created = new Subject<any>();
    this.emitters[channelKey] = created;
    this.subArguments[channelKey] = args;
    if (this.status === 'connected') { args.map(arg => this.subscribeChannel(arg)); }
    return created;
  }

  protected respawnChannelSubscriptions() {
    const topics: string[] = [];
    Object.keys(this.emitters).map(channelKey => {
      const stored = this.emitters[channelKey];
      const hasSubscriptions = !isSubjectUnobserved(stored);
      if (hasSubscriptions) {
        const args = this.subArguments[channelKey];
        args.map(a => this.subscribeChannel(a));
      } else {
        if (stored) { stored.complete(); }
        delete this.emitters[channelKey];
        delete this.subArguments[channelKey];
      }
    });
  }

  protected emitChannelEvent(ev: BitgetWsChannelEvent) {
    // NOTA: Eliminem l'identificador d'usuari que l'exchange ha afegit a la resposta per fer coincidir la channelKey.
    delete ev.arg.uid;
    const channelKey = Object.keys(this.subArguments).find(key => !!this.subArguments[key].find(arg => matchChannelKey(arg, ev.arg)));
    const emitter = this.emitters[channelKey];
    if (!emitter) { return; }
    const hasSubscriptions = !isSubjectUnobserved(emitter);
    if (hasSubscriptions) {
      const parser = this.getChannelParser(ev.arg);
      const value = parser ? parser.call(this, ev) : ev;
      emitter.next(value);
    } else {
      this.unsubscribeChannel(ev.arg);
      if (emitter) { emitter.complete(); }
      delete this.emitters[channelKey];
      delete this.subArguments[channelKey];
    }
  }

  protected getChannelParser(arg: BitgetWsSubscriptionArguments): Function {
    // console.log('getChannelParser => ', arg);
    const channel = arg.channel.startsWith('candle') ? 'klines' : arg.channel;
    switch (channel) {
      case 'ticker': return this.parsePriceTickerEvent;
      case 'klines': return this.parseKlineTickerEvent;
      case 'account': return this.parseAccountUpdateEvent;
      case 'positions': return this.parseAccountUpdateEvent;
      case 'orders': return this.parseOrderUpdateEvent;
      case 'ordersAlgo': return this.parseOrderUpdateEvent;
      default: return undefined;
    }
  }

  protected subscribeChannel(arg: BitgetWsSubscriptionArguments) {
    const data: BitgetWsSubscriptionRequest = { op: "subscribe", args: [arg] };
    // console.log(this.wsId, '=> subscribing...', JSON.stringify(data));
    this.ws.send(JSON.stringify(data), error => error ? this.onWsError(error as any) : undefined);
  }

  protected unsubscribeChannel(arg: BitgetWsSubscriptionArguments) {
    // console.log(this.wsId, '=> unsubscribing...', arg);
    const data: BitgetWsSubscriptionRequest = { op: "unsubscribe", args: [arg] };
    /** {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState } */
    const WS_STATE_OPEN = 1;
    if (this.ws.readyState === WS_STATE_OPEN) { this.ws.send(JSON.stringify(data), error => error ? this.onWsError(error as any) : undefined); }
  }

  protected unsubscribeAllChannels() {
    Object.keys(this.emitters).map(channelKey => {
      const emitter = this.emitters[channelKey];
      if (emitter) {
        const args = this.subArguments[channelKey];
        args.map(a => this.unsubscribeChannel(a));
      }
    });
  }


  // ---------------------------------------------------------------------------------------------------
  //  parsers
  // ---------------------------------------------------------------------------------------------------

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#tickers-channel Tickers channel}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#tickers-channel Tickers channel}
   */
  parsePriceTickerEvent(ev: BitgetWsChannelEvent): MarketPrice {
    const data = ev.data[0];
    const symbol = this.api.parseInstrumentId(ev.arg.instId);
    const baseVolume = +data.baseVolume;
    const quoteVolume = +data.quoteVolume;
    const ts = +data[this.market === 'spot' ? 'ts' : 'systemTime'];
    return {
      symbol,
      price: +data.last,
      baseVolume, quoteVolume,
      timestamp: timestamp(moment(ts)),
    }
  }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#candlesticks-channel Candlesticks channel}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#candlesticks-channel Candlesticks channel}
   */
  parseKlineTickerEvent(ev: BitgetWsChannelEvent): MarketKline {
    const symbol = this.api.parseInstrumentId(ev.arg.instId);
    const candle = ev.arg.channel.replace('candle', '');
    const unit = candle.charAt(candle.length - 1);
    const interval = (['H', 'D', 'W', 'Y'].includes(unit) ? candle.toLocaleLowerCase() : candle) as KlineIntervalType;
    // En la primera connexió ens arriben 500 candles de cop, notifiquem només la darrera que és la més recent.
    const data = ev.data[ev.data.length - 1];
    const openTime = timestamp(moment(+data[0]));
    const closeTime = calculateCloseTime(openTime, interval);
    const baseVolume = +data[5];
    const quoteVolume = +data[5] * +data[4];
    return {
      symbol, openTime, closeTime, interval,
      open: +data[1],
      high: +data[2],
      low: +data[3],
      close: +data[4],
      baseVolume, quoteVolume,
    }
  }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#account-channel Account Channel}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#account-channel Account Channel}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#positions-channel Positions Channel}
   */
  parseAccountUpdateEvent(ev: BitgetWsChannelEvent): AccountInfo {
    if (ev.arg.channel === 'account') {
      if (this.market === 'spot') {
        return {
          balances: ev.data.map(b => ({ asset: this.isTest ? String(b.coinName).slice(1) : b.coinName, available: b.available })),
        };
      } else if (this.market === 'futures') {
        return {
          balances: ev.data.map(b => ({ asset: this.isTest ? String(b.marginCoin).slice(1) : b.marginCoin, available: b.available, locked: b.locked })),
        };
      }
    } else if (ev.arg.channel === 'positions') {
      const positions: Position[] = [];
      const dataPositions = ev.data;

      dataPositions.map(data => {
        const symbol = this.api.parseSymbolProduct(data.instId);
        const positionSide = parsetPositionTradeSide(data.holdSide);
        const marginAsset = symbol.quoteAsset;
        const positionAmount = +data.total;
        const leverage = +data.leverage;
        const price = +data.averageOpenPrice;
        const unrealisedPnl = +data.upl;
        const marginType = parsetMarginMode(data.marginMode);
        const liquidationPrice = +data.liqPx;
        positions.push({ symbol, positionSide, marginAsset, positionAmount, price, leverage, unrealisedPnl, marginType, liquidationPrice });
      });
      return { positions };
    }
  }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#order-channel Order Channel - SPOT}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#order-channel Order Channel - FUTURES}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#plan-order-channel Plan Order Channel - FUTURES}
   */
  parseOrderUpdateEvent(ev: BitgetWsChannelEvent): Order {
    const data = ev.data[0];
    const channel = ev.arg.channel;
    if (this.market === 'spot') {
      const id = data.clOrdId;
      const exchangeId = data.ordId;
      const symbol = this.api.parseSymbolProduct(data.instId);
      const side = parseOrderSide(data.side);
      const type = parseOrderType(data.ordType);
      const status = parseOrderStatus(data.status);
      const baseQuantity = status === 'filled' || status === 'partial' ? { baseQuantity: (status === 'partial' ? +data.fillSz : +data.accFillSz) } : +data.sz ? { baseQuantity: +data.sz } : undefined;
      const price = status === 'filled' || status === 'partial' ? { price: (status === 'partial' ? +data.fillPx : +data.avgPx) } : +data.px ? { price: +data.px } : undefined;
      const quoteQuantity = +data.notional ? { quoteQuantity: +data.notional } : !!price && !!baseQuantity ? { quoteQuantity: baseQuantity.baseQuantity * price.price } : undefined;

      const created = status === 'post' ? timestamp(moment()) : timestamp(moment(+data.cTime));
      const posted = timestamp(moment(+data.cTime));
      const executed = timestamp(moment(+data?.uTime ? +data.uTime : moment()));

      const commission = status === 'filled' || status === 'partial' ? data?.fillFee ? { commission: data?.fillFee } : undefined : undefined;
      const commissionAsset = status === 'filled' || status === 'partial' ? { commissionAsset: symbol.quoteAsset } : undefined;
      return {
        id, exchangeId, side, type, stop: 'normal', status, symbol,
        ...baseQuantity,   // quantitat satifeta baseAsset
        ...quoteQuantity,  // quantitat satifeta quoteAsset
        ...price,           // preu per les ordres de tipus limit, les market l'ignoren pq ja entren a mercat.
        // stopPrice, Bitget no diu res de les ordres Algoritmiques 
        // rejectReason?: string;
        // isOco?: boolean;
        created,       // timestamp: moment de creació per part de la nostra app.
        posted,        // timestamp: moment de creació a l'exchange (Binance, Kucoin, ...)
        executed,      // timestamp: moment en que s'ha filled o canceled.
        // syncronized?: boolean;
        // idOrderBuyed?: string;
        ...commission,
        ...commissionAsset,
      };

    } else {
      const id = channel === 'orders' ? data.clOrdId : data.cOid;
      const exchangeId = channel === 'orders' ? data.ordId : data.id;
      const trade = channel === 'orders' ? parsetOrderTradeSide(data.posSide) : parsetOrderAlgoTradeSide(data.posSide);
      const symbol = this.api.parseSymbolProduct(data.instId);
      const side = parseOrderSide(data.side);
      const type = parseOrderType(data.ordType);
      const status = channel === 'orders' ? parseOrderStatus(data.status) : parsePlanStatus(data.state);
      const baseQuantity = status === 'filled' || status === 'partial' ? (status === 'partial' ? +data.fillSz : channel === 'orders' ? +data.accFillSz : +data.sz) : +data.sz;
      const price = status === 'filled' || status === 'partial' ? (status === 'partial' ? +data.fillPx : (channel === 'orders' ? +data.avgPx : +data.actualPx)) : (channel === 'orders' ? +data.px : +data.actualPx);
      const quoteQuantity = status === 'filled' || status === 'partial' ? (channel === 'orders' ? +data.fillNotionalUsd : (price * baseQuantity)) : (channel === 'orders' ? +data.notionalUsd : price * baseQuantity);
      const stopPrice = channel === 'orders' ? undefined : { stopPrice: +data.triggerPx };
      const created = status === 'post' ? timestamp(moment()) : timestamp(moment(+data.cTime));
      const posted = timestamp(moment(+data.cTime));
      const executed = timestamp(moment(status === 'filled' || status === 'partial' ? (channel === 'orders' ? +data.fillTime : +data.triggerTime) : channel === 'orders' ? +data.uTime : moment()));
      const profit = status === 'filled' || status === 'partial' ? { profit: data?.pnl } : undefined;
      const commission = status === 'filled' || status === 'partial' ? { commission: data?.fillFee } : undefined;
      const commissionAsset = status === 'filled' || status === 'partial' ? { commissionAsset: symbol.quoteAsset } : undefined;
      const leverage = status === 'filled' || status === 'partial' ? { leverage: +data?.lever } : undefined;

      return {
        id, exchangeId, side, type, stop: 'normal', trade, status, symbol,
        baseQuantity,   // quantitat satifeta baseAsset
        quoteQuantity,  // quantitat satifeta quoteAsset
        price,           // preu per les ordres de tipus limit, les market l'ignoren pq ja entren a mercat.
        ...stopPrice,
        // rejectReason?: string;
        // isOco?: boolean;
        created,       // timestamp: moment de creació per part de la nostra app.
        posted,        // timestamp: moment de creació a l'exchange (Binance, Kucoin, ...)
        executed,      // timestamp: moment en que s'ha filled o canceled.
        // syncronized?: boolean;
        // idOrderBuyed?: string;
        ...profit,
        ...commission,
        ...commissionAsset,
        ...leverage,
      };
    }
  }

  // ---------------------------------------------------------------------------------------------------
  //  log
  // ---------------------------------------------------------------------------------------------------

  protected get wsId(): string { return `${this.market}-${this.streamType}-ws`; }

}

