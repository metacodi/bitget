import WebSocket from 'isomorphic-ws';
import EventEmitter from 'events';
import { Subject, interval, timer, Subscription } from 'rxjs';
import { createHmac } from 'crypto';
import moment from 'moment';

import { timestamp } from '@metacodi/abstract-exchange';
import { MarketType, SymbolType, MarketPrice, MarketKline, KlineIntervalType, Order, CoinType, isSubjectUnobserved, matchChannelKey, buildChannelKey, calculateCloseTime, ApiOptions } from '@metacodi/abstract-exchange';
import { ExchangeWebsocket, WebsocketOptions, WsStreamType, WsConnectionState, WsAccountUpdate } from '@metacodi/abstract-exchange';

import { BitgetApi } from './bitget-api';
import { BitgetInstrumentType, BitgetWsChannelEvent, BitgetWsChannelType, BitgetWsEventType, BitgetWsSubscriptionArguments, BitgetWsSubscriptionRequest } from './bitget.types';


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
    // Iniciem la connexió amb l'stream de l'exchange.
    return await this.connect();
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
    // // Obtenim una clau per l'stream d'usuari.
    // if (this.streamType === 'user') { await this.api.getAccountInfo(); }

    const url = market === 'spot' ? `wss://ws.bitget.com/spot/v1/stream` : `wss://ws.bitget.com/mix/v1/stream`;

    // Ajustem els paràmetres segons el nou servidor.
    this.options.pingInterval = pingInterval || this.defaultOptions.pingInterval;
    this.options.pongTimeout = pongTimeout || this.defaultOptions.pongTimeout;

    // Nova instància.
    console.log(this.wsId, '=> connecting...', url);
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
      // if (this.streamType === 'user') { await this.api.closeUserDataListenKey(this.listenKey); }
      this.ws.close();
      // #168: ws.terminate() undefined in browsers.
      if (typeof this.ws.terminate === 'function') { this.ws.terminate(); }
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
      console.log(this.wsId, '=> reconnected!');
      this.emit('reconnected', { event });
    } else {
      console.log(this.wsId, '=> connected!');
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
    console.log(`${this.wsId} =>`, data);
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
    console.log(this.wsId, '=> closed');
    if (this.status !== 'closing') {
      this.reconnect();
      this.emit('reconnecting', { event });
    } else {
      this.status = 'initial';
      this.emit('close', { event });
    }
  }

  protected onWsError(event: WebSocket.ErrorEvent) {
    // console.log(this.wsId, '=> onWsError');
    console.error(`${this.wsId} =>`, event?.error || event);
  }


  // ---------------------------------------------------------------------------------------------------
  //  ping . pong
  // ---------------------------------------------------------------------------------------------------

  protected ping() {
    console.log(this.wsId, `=> Sending ping...`);
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
      console.log(this.wsId, '=> Received ping, sending pong');
      if (typeof this.ws.pong === 'function') {
        this.ws.pong();
      } else {
        // this.ws.send(0xA);
      }

    } catch (error) {
      console.error(this.wsId, `=> Failed to send WS pong`, error);
      // TODO: Notificar l'error.
    }
  }

  protected onWsPong(event: any) {
    console.log(this.wsId, '=> Received pong, clearing timer');
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
        throw { code: data.code, message: `WEBSOCKET-ERROR: ${data.msg}` };
      default:
        console.log('onWsMessage =>', data);
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
      return this.registerChannelSubscription([{ channel: 'account', instType: this.isTest ? 's'+instType : instType, instId: 'default' }, { channel: 'positions', instType: this.isTest ? 's'+instType : instType, instId }]);
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
      return this.registerChannelSubscription([{ channel: 'orders', instType: this.isTest ? 's'+instType : instType, instId: 'default' }, { channel: 'ordersAlgo', instType: this.isTest ? 's'+instType : instType, instId }]);
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
      // case 'account': return parseAccountUpdateEvent;
      // case 'balance_and_position': return parseBalancePositionUpdateEvent;
      // case 'orders': return parseOrderUpdateEvent;
      // case 'orders-algo': return parseOrderUpdateEvent;
      default: return undefined;
    }
  }

  protected subscribeChannel(arg: BitgetWsSubscriptionArguments) {
    const data: BitgetWsSubscriptionRequest = { op: "subscribe", args: [arg] };
    console.log(this.wsId, '=> subscribing...', JSON.stringify(data));
    this.ws.send(JSON.stringify(data), error => error ? this.onWsError(error as any) : undefined);
  }

  protected unsubscribeChannel(arg: BitgetWsSubscriptionArguments) {
    console.log(this.wsId, '=> unsubscribing...', arg);
    const data: BitgetWsSubscriptionRequest = { op: "unsubscribe", args: [arg] };
    this.ws.send(JSON.stringify(data), error => error ? this.onWsError(error as any) : undefined);
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


  // ---------------------------------------------------------------------------------------------------
  //  log
  // ---------------------------------------------------------------------------------------------------

  protected get wsId(): string { return `${this.market}-${this.streamType}-ws`; }

}

