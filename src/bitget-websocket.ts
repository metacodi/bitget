import WebSocket from 'isomorphic-ws';
import EventEmitter from 'events';
import { Subject, interval, timer, Subscription } from 'rxjs';
import { createHmac } from 'crypto';

import { MarketType, SymbolType, MarketPrice, KlinesRequest, MarketKline, KlineIntervalType, Order, CoinType, ApiOptions } from '@metacodi/abstract-exchange';
import { ExchangeWebsocket, WebsocketOptions, WsStreamType, WsConnectionState, WsAccountUpdate, WsBalancePositionUpdate } from '@metacodi/abstract-exchange';

import { BitgetApi } from './bitget-api';
import { BitgetMarketType, BitgetWsChannelEvent, BitgetWsChannelType, BitgetWsEventType, BitgetWsSubscriptionArguments, BitgetWsSubscriptionRequest } from './bitget.types';
import { formatMarketType, formatSymbol, parseKlineTickerEvent, parsePriceTickerEvent } from './bitget-parsers';



/**
 * {@link https://bitgetlimited.github.io/apidoc/en/spot/#websocketapi Spot Websocket}
 * {@link https://bitgetlimited.github.io/apidoc/en/mix/#websocketapi Futures Websocket}
 */
export class BitgetWebsocket extends EventEmitter implements ExchangeWebsocket {
  /** Estat de la connexió. */
  status: WsConnectionState = 'initial';
  /** Referència a la instància del client API. */
  protected api: BitgetApi;
  /** Opcions de configuració. */
  protected options: WebsocketOptions;
  /** Referència a la instància del websocket subjacent. */
  protected ws: WebSocket
  /** Subscripció al interval que envia un ping al servidor per mantenir viva la connexió.  */
  protected pingTimer?: Subscription;
  /** Subscriptor al timer que controla la resposta del servidor. */
  protected pongTimer?: Subscription;
  /** Identificador de connexió rebut del servidor websocket. */
  protected connectId?: string;
  /** Emisors de missatges. */
  protected emitters: { [channelKey: string]: Subject<any> } = {};
  /** Identificador de login del servidor websocket. */
  protected loggedIn: boolean;
  /** Arguments per tornar a subscriure's al canal (respawn). */
  protected subArguments: { [key: string]: BitgetWsSubscriptionArguments[] } = {};
  /** Identificador de connexió rebut del servidor websocket. */
  protected userId?: string;

  constructor(
    options: WebsocketOptions,
  ) {
    super();
    this.options = { ...this.defaultOptions, ...options };

    this.initialize();
  }

  // ---------------------------------------------------------------------------------------------------
  //  options
  // ---------------------------------------------------------------------------------------------------

  get bitgetMarket(): BitgetMarketType { return formatMarketType(this.market); }

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
      pingInterval: 18 * 1000,
      pongTimeout: 10 * 1000,
    }
  }

  protected async initialize() {
    // Iniciem la connexió amb l'stream de l'exchange.
    this.connect();
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

  reconnect() {
    if (this.status === 'reconnecting') { return; }
    this.status = 'reconnecting';
    this.close();
    setTimeout(() => this.connect(), this.reconnectPeriod);
  }


  async close() {
    try {
      if (this.status !== 'reconnecting') { this.status = 'closing'; }
      if (this.pingTimer) { this.pingTimer.unsubscribe(); }
      if (this.pongTimer) { this.pongTimer.unsubscribe(); }
      // if (this.streamType === 'user') { await this.api.closeUserDataListenKey(this.listenKey); }
      this.ws.close();
      // #168: ws.terminate() undefined in browsers.
      if (typeof this.ws.terminate === 'function') { this.ws.terminate(); }

    } catch (error) {
      console.error(error);
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
        this.ws.ping();
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
    this.emit('message', data);
    switch (this.discoverEventType(data)) {
      case 'login':
        this.loggedIn = true;
        this.onConnected();
        break;
      case 'ticker':
      case 'klines':
      case 'account':
        const obj = data as BitgetWsChannelEvent;
        this.emitChannelEvent(obj);
        break;
      default:
        console.log('onWsMessage =>', data);
        console.log(JSON.stringify(data));
    }
  }

  protected parseWsMessage(event: any): any {
    if (typeof event === 'string') {
      const parsedEvent = JSON.parse(event);
      if (parsedEvent.data) {
        return this.parseWsMessage(parsedEvent.data);
      }
    }
    return event?.data ? JSON.parse(event.data) : event;
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

  /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#tickers-channel Tickers channel} */
  priceTicker(symbol: SymbolType): Subject<MarketPrice> {
    const channel: BitgetWsChannelType = `ticker`;
    const instId = `${formatSymbol(symbol)}`;
    const instType = this.bitgetMarket;
    // NOTA: L'ordre dels paràmetres és important per fer mathcing de la channelKey.
    return this.registerChannelSubscription({ instType, channel, instId });
  }

  /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#candlesticks-channel Candlesticks channel} */
  klineTicker(symbol: SymbolType, interval: KlineIntervalType): Subject<MarketKline> {
    const channel: BitgetWsChannelType = `candle${interval}`;
    const instId = `${formatSymbol(symbol)}`;
    const instType = this.bitgetMarket;
    // NOTA: L'ordre dels paràmetres és important per fer mathcing de la channelKey.
    return this.registerChannelSubscription({ instType, channel, instId });
  }


  // ---------------------------------------------------------------------------------------------------
  //  Private channels
  // ---------------------------------------------------------------------------------------------------

  /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#account-channel Account channel} */
  accountUpdate(asset?: CoinType): Subject<WsAccountUpdate> {
    const channel: BitgetWsChannelType = 'account';
    const instId = asset ? asset : 'default';
    const instType = this.market === 'spot' ? 'spbl' : 'umcbl';
    // NOTA: L'ordre dels paràmetres és important per fer mathcing de la channelKey.
    return this.registerChannelSubscription({ instType, channel, instId });
  }

  /** {@link } */
  balancePositionUpdate(): Subject<WsBalancePositionUpdate> {
    // const channel: BitgetWsChannelType = 'balance_and_position';
    // return this.registerChannelSubscription({ channel });
    return {} as any;
  }

  /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#order-channel Order channel} */
  orderUpdate(symbol?: SymbolType): Subject<Order> {
    // const instType = this.bitgetMarket;
    // const uly = symbol ? { uly: formatSymbol(symbol) } : undefined;
    // const subject = this.registerChannelSubscription([{ channel: 'orders', instType, ...uly }, { channel: 'orders-algo', instType, ...uly }]);
    // return subject;
    return {} as any;
  }


  // ---------------------------------------------------------------------------------------------------
  //  Channel subscriptions
  // ---------------------------------------------------------------------------------------------------

  protected registerChannelSubscription(args: BitgetWsSubscriptionArguments | BitgetWsSubscriptionArguments[]) {
    if (!Array.isArray(args)) { args = [args] };
    // Ex: channelKey = 'orders#SWAP;orders-algo#SWAP'
    const channelKey = args.map(arg => this.buildArgKey(arg)).join(';');
    const stored = this.emitters[channelKey]
    if (stored) { return stored; }
    const created = new Subject<any>();
    this.emitters[channelKey] = created;
    this.subArguments[channelKey] = args;
    if (this.status === 'connected') { args.map(a => this.subscribeChannel(a)); }
    return created;
  }

  protected respawnChannelSubscriptions() {
    const topics: string[] = [];
    Object.keys(this.emitters).map(channelKey => {
      const stored = this.emitters[channelKey];
      const hasSubscriptions = !this.isSubjectUnobserved(stored);
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
    const argKey = this.buildArgKey(ev.arg);
    const channelKey = Object.keys(this.subArguments).find(key => !!this.subArguments[key].find(arg => this.buildArgKey(arg) === argKey))
    const stored = this.emitters[channelKey];
    if (!stored) { return; }
    const hasSubscriptions = !this.isSubjectUnobserved(stored);
    if (hasSubscriptions) {
      const parser = this.getChannelParser(ev.arg);
      const value = parser ? parser(ev) : ev;
      stored.next(value);
    } else {
      this.unsubscribeChannel(ev.arg);
      if (stored) { stored.complete(); }
      delete this.emitters[channelKey];
      delete this.subArguments[channelKey];
    }
  }

  protected buildArgKey = (arg: BitgetWsSubscriptionArguments): string => { return Object.keys(arg).map(key => arg[key]).join('#'); }

  protected getChannelParser(arg: BitgetWsSubscriptionArguments): any {
    console.log('getChannelParser => ', arg);
    const channel = arg.channel.startsWith('candle') ? 'klines' : arg.channel;
    switch (channel) {
      case 'ticker': return parsePriceTickerEvent;
      case 'klines': return parseKlineTickerEvent;
      // case 'account': return parseAccountUpdateEvent;
      // case 'balance_and_position': return parseBalancePositionUpdateEvent;
      // case 'orders': return parseOrderUpdateEvent;
      // case 'orders-algo': return parseOrderUpdateEvent;
      default: return undefined;
    }
  }

  protected isSubjectUnobserved(emitter: Subject<any>): boolean {
    return !emitter || emitter.closed || !emitter.observers?.length;
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


  // ---------------------------------------------------------------------------------------------------
  //  log
  // ---------------------------------------------------------------------------------------------------

  protected get wsId(): string { return `${this.market}-${this.streamType}-ws`; }

}

