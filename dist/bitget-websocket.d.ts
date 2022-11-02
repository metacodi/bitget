/// <reference types="ws" />
/// <reference types="node" />
import WebSocket from 'isomorphic-ws';
import EventEmitter from 'events';
import { Subject, Subscription } from 'rxjs';
import { AccountInfo } from '@metacodi/abstract-exchange';
import { MarketType, SymbolType, MarketPrice, MarketKline, KlineIntervalType, Order } from '@metacodi/abstract-exchange';
import { ExchangeWebsocket, WebsocketOptions, WsStreamType, WsConnectionState, WsAccountUpdate } from '@metacodi/abstract-exchange';
import { BitgetApi } from './bitget-api';
import { BitgetInstrumentType, BitgetWsChannelEvent, BitgetWsChannelType, BitgetWsEventType, BitgetWsSubscriptionArguments } from './bitget.types';
export declare class BitgetWebsocket extends EventEmitter implements ExchangeWebsocket {
    status: WsConnectionState;
    api: BitgetApi;
    protected options: WebsocketOptions;
    protected ws: WebSocket;
    protected pingTimer?: Subscription;
    protected pongTimer?: Subscription;
    protected emitters: {
        [channelKey: string]: Subject<any>;
    };
    protected loggedIn: boolean;
    protected subArguments: {
        [key: string]: BitgetWsSubscriptionArguments[];
    };
    constructor(options: WebsocketOptions);
    get instType(): BitgetInstrumentType;
    get market(): MarketType;
    get streamType(): WsStreamType;
    get apiKey(): string;
    get apiSecret(): string;
    get apiPassphrase(): string;
    get isTest(): boolean;
    get reconnectPeriod(): number;
    get pingInterval(): number;
    get pongTimeout(): number;
    get defaultOptions(): Partial<WebsocketOptions>;
    protected getApiClient(): BitgetApi;
    initialize(): Promise<void>;
    connect(): Promise<void>;
    signMessage(message: string, secret: string): Promise<string>;
    reconnect(): Promise<void>;
    close(): Promise<void>;
    destroy(): void;
    protected onWsOpen(event: WebSocket.Event): Promise<void>;
    protected login(): Promise<void>;
    protected onConnected(): void;
    protected onWsClose(event: WebSocket.CloseEvent): void;
    protected onWsError(event: WebSocket.ErrorEvent): void;
    protected ping(): void;
    protected onWsPing(event: any): void;
    protected onWsPong(event: any): void;
    protected onWsMessage(event: WebSocket.MessageEvent): void;
    protected parseWsMessage(event: any): any;
    protected discoverEventType(data: any): BitgetWsChannelType | 'klines' | BitgetWsEventType | undefined;
    priceTicker(symbol: SymbolType): Subject<MarketPrice>;
    klineTicker(symbol: SymbolType, interval: KlineIntervalType): Subject<MarketKline>;
    accountUpdate(symbol?: SymbolType): Subject<WsAccountUpdate>;
    orderUpdate(symbol?: SymbolType): Subject<Order>;
    protected registerChannelSubscription(args: BitgetWsSubscriptionArguments | BitgetWsSubscriptionArguments[]): Subject<any>;
    protected respawnChannelSubscriptions(): void;
    protected emitChannelEvent(ev: BitgetWsChannelEvent): void;
    protected getChannelParser(arg: BitgetWsSubscriptionArguments): Function;
    protected subscribeChannel(arg: BitgetWsSubscriptionArguments): void;
    protected unsubscribeChannel(arg: BitgetWsSubscriptionArguments): void;
    protected unsubscribeAllChannels(): void;
    parsePriceTickerEvent(ev: BitgetWsChannelEvent): MarketPrice;
    parseKlineTickerEvent(ev: BitgetWsChannelEvent): MarketKline;
    parseAccountUpdateEvent(ev: BitgetWsChannelEvent): AccountInfo;
    parseOrderUpdateEvent(ev: BitgetWsChannelEvent): Order;
    protected get wsId(): string;
}
//# sourceMappingURL=bitget-websocket.d.ts.map