import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { createHmac } from 'crypto';
import moment, { unitOfTime } from 'moment';

import { GetOpenOrdersRequest, timestamp } from '@metacodi/abstract-exchange';
import { ExchangeApi, CoinType, MarketType, HttpMethod, ApiOptions, ApiRequestOptions, AccountInfo } from '@metacodi/abstract-exchange';
import { ExchangeInfo, SymbolType, MarketPrice, MarketKline, KlinesRequest, Balance, Position, MarginMode } from '@metacodi/abstract-exchange';
import { LeverageInfo, Order, GetOrderRequest, PostOrderRequest, CancelOrderRequest, MarketSymbol, Limit } from '@metacodi/abstract-exchange';
import { calculateCloseTime, KlineIntervalType, SetLeverage, GetHistoryOrdersRequest } from '@metacodi/abstract-exchange';
import { ApiClient } from '@metacodi/node-api-client';

import { parseOrderSide, parseOrderStatus, parseOrderType, parsePlanStatus, parsetOrderTradeSide, parsetOrderSideFutures, parseStopType, parsetPositionTradeSide } from './bitget-parsers';
import { formatOrderSide, formatOrderType, formatOrderTradeSide } from './bitget-parsers';


/** {@link https://bitgetlimited.github.io/apidoc/en/mix/#request-interaction Request Interaction} */
export class BitgetApi extends ApiClient implements ExchangeApi {

  options: ApiOptions;
  user_id: String;
  limits: any[] = [];
  currencies: any[] = [];
  symbols: any[] = [];

  constructor(
    options?: ApiOptions,
  ) {
    super(options);
  }


  // ---------------------------------------------------------------------------------------------------
  //  ApiClient implementation
  // ---------------------------------------------------------------------------------------------------

  /** Retorna la url base sense el protocol.
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#restapi Rest Api}
   * 
   *  Bitget account can be used for login on Demo Trading. If you already have an Bitget account, you can log in directly.
   *  Start API Demo Trading by the following steps:
   *  Login Bitget —> Assets —> Start Demo Trading —> Personal Center —> Demo Trading API -> Create Demo Trading V5 APIKey —> Start your Demo Trading
   */
   baseUrl(): string { return `api.bitget.com` };

  async request(method: HttpMethod, endpoint: string, options?: ApiRequestOptions): Promise<any> {
    if (!options) { options = {}; }
    options.headers = options.headers || {};
    options.headers['Content-Type'] = 'application/json';
    options.headers['Locale'] = 'en-US';
    return super.request(method, endpoint, options);
  }

  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#api-verification API Verificatio} */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#signature Signature} */
  protected async getAuthHeaders(method: HttpMethod, endpoint: string, params: any) {
    const locale = 'en-US';
    const headers = await super.getAuthHeaders(method, endpoint, params);
    headers.Cookie = `locale=${locale}`;
    headers[locale];
    return headers;
  }


  // ---------------------------------------------------------------------------------------------------
  //  Market
  // ---------------------------------------------------------------------------------------------------

  get market(): MarketType { return this.options?.market; }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-account-list Get Symbols - Spot}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-all-symbols Get Symbols - Futures}
   */
  async getExchangeInfo(): Promise<ExchangeInfo> {
    // Obtenim els límits.
    this.limits = [];
    if (this.market === 'spot') {
      this.limits.push({ type: 'request', maxQuantity: 20, period: 1, unitOfTime: 'second' });
      this.limits.push({ type: 'trade', maxQuantity: 10, period: 1, unitOfTime: 'second' });
    } else if (this.market === 'futures') {
      this.limits.push({ type: 'request', maxQuantity: 20, period: 1, unitOfTime: 'second' });
      this.limits.push({ type: 'trade', maxQuantity: 10, period: 1, unitOfTime: 'second' });
    }

    // Obtenim les monedes.
    this.currencies = [];
    /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-coin-list Get Coin List} */
    const errorMessage = { code: 500, message: `No s'ha pogut obtenir el llistat de monedes disponibles a Bitget.` };
    const currenciesList: { data: any[] } = await this.get(`api/spot/v1/public/currencies`, { isPublic: true, errorMessage });
    this.currencies.push(...currenciesList.data);

    // Obtenim els símbols.
    this.symbols = [];
    const url = this.market === 'spot' ? `api/spot/v1/public/products` : `api/mix/v1/market/contracts`;
    if (this.market === 'spot') {
      /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-symbols Get Symbols} */
      const errorMessage = { code: 500, message: `No s'ha pogut obtenir el llistat de símbols per spot a Bitget.` };
      const symbolsList: { data: any[] } = await this.get(url, { isPublic: true, errorMessage });
      this.symbols.push(...symbolsList.data.map(symbol => ({ ...symbol, productType: 'spbl' })));
      return Promise.resolve({ limits: this.limits });
    } else {
      await Promise.all(['umcbl', 'dmcbl', 'cmcbl'].map(async productType => {
        // throw { code: 500, message: 'Excepció provocada!' };
        if (this.isTest) { productType = `s${productType}`; }
        /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-all-symbols Get Symbols} */
        const errorMessage = { code: 500, message: `No s'ha pogut obtenir el llistat dels símbols disponibles pel producte '${productType}' de futurs a Bitget.` };
        const symbolsList: { data: any[] } = await this.get(url, { params: { productType }, isPublic: true, errorMessage });
        this.symbols.push(...symbolsList.data.map(symbol => ({ ...symbol, productType, symbolName: `${symbol.baseCoin}${symbol.quoteCoin}` })));
      }));
      return Promise.resolve({ limits: this.limits });
    }
  }

  async getMarketSymbol(symbol: SymbolType): Promise<MarketSymbol> {
    const { baseAsset, quoteAsset } = symbol;
    const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
    if (!found) { throw { code: 500, message: `getMarketSymbol: No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
    if (this.market === 'spot') {
      return Promise.resolve<MarketSymbol>({
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
    } else {
      if (found.minLeverage === undefined) {
        /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-symbol-leverage Get Symbol Leverage} */
        const errorMessage = { code: 500, message: `No s'ha pogut obtenir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
        const params = { symbol: found.symbol };
        const response: { data: any } = await this.get(`api/mix/v1/market/symbol-leverage`, { params, isPublic: true, errorMessage });
        found.minLeverage = +response.data.minLeverage;
        found.maxLeverage = +response.data.maxLeverage;
      }
      return Promise.resolve<MarketSymbol>({
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
  }

  resolveAssets(symbol: SymbolType): SymbolType {
    return {
      baseAsset: (this.isTest ? `S${symbol.baseAsset}` as CoinType : symbol.baseAsset),
      quoteAsset: (this.isTest ? `S${symbol.quoteAsset}` as CoinType : symbol.quoteAsset)
    };
  }

  getSymbolProduct(symbol: SymbolType): string {
    const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
    const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
    const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
    if (found) { return found.symbol; } else { throw { code: 500, message: `getSymbolProduct: No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
  }

  getProductType(symbol: SymbolType): string {
    const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
    const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
    const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
    if (found) { return found.productType; } else { throw { code: 500, message: `getProductType: No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
  }

  getInstrumentId(symbol: SymbolType): string {
    const { baseAsset, quoteAsset } = symbol;
    const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
    if (found) { return found.symbolName; } else { throw { code: 500, message: `getInstrumentId: No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
  }

  parseInstrumentId(instId: string): SymbolType {
    const found = this.symbols.find(s => s.symbolName === instId);
    if (found) {
      const baseAsset = this.isTest ? String(found.baseCoin).slice(1) : found.baseCoin;
      const quoteAsset = this.isTest ? String(found.quoteCoin).slice(1) : found.quoteCoin;
      return { baseAsset, quoteAsset };
    } else { throw { code: 500, message: `parseInstrumentId: No s'ha trobat el símbol ${instId} a Bitget.` }; }
  }

  parseSymbolProduct(symbol: string): SymbolType {
    const found = this.symbols.find(s => s.symbol === symbol);
    if (found) {
      const baseAsset = this.isTest ? String(found.baseCoin).slice(1) : found.baseCoin;
      const quoteAsset = this.isTest ? String(found.quoteCoin).slice(1) : found.quoteCoin;
      return { baseAsset, quoteAsset };
    } else { throw { code: 500, message: `parseSymbolProduct: No s'ha trobat el símbol ${symbol} a Bitget.` }; }
  }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-single-ticker Get Single Ticker}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-symbol-mark-price Get Symbol Mark Price}
   */
  async getPriceTicker(symbol: SymbolType): Promise<MarketPrice> {
    const { baseAsset, quoteAsset } = this.resolveAssets(symbol);
    const url = this.market === 'spot' ? `api/spot/v1/market/ticker` : `api/mix/v1/market/mark-price`;
    const bitgetSymbol = this.getSymbolProduct(symbol);
    const errorMessage = { code: 500, message: `No s'ha pogut obtenir el preu del símbol ${baseAsset}_${quoteAsset} per ${this.market} a Bitget.` };
    const params = { symbol: bitgetSymbol };
    return this.get(url, { params, isPublic: true, errorMessage }).then(response => {
      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      if (this.market === 'spot') {
        return {
          symbol,
          price: +data.close,
          timestamp: timestamp(data.ts),
          baseVolume: +data.baseVol,
          quoteVolume: +data.quoteVol,
        }
      } else {
        return {
          symbol,
          price: +data.markPrice,
          timestamp: timestamp(+data.timestamp),
          baseVolume: undefined,
          quoteVolume: undefined,
        }
      }
    });
  }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-candle-data Get Candle Data}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-candle-data Get Candle Data}
   */
  async getKlines(request: KlinesRequest): Promise<MarketKline[]> {
    const { limit } = request;
    const { baseAsset, quoteAsset } = request.symbol;
    const url = this.market === 'spot' ? `api/spot/v1/market/candles` : `api/mix/v1/market/candles`;
    const symbol = this.getSymbolProduct(request.symbol);
    const unit = request.interval.charAt(request.interval.length - 1) as unitOfTime.DurationConstructor;
    const interval = ['h', 'd', 'w', 'y'].includes(unit) ? request.interval.toLocaleUpperCase() : request.interval;
    const intervalField = this.market === 'spot' ? 'period' : 'granularity';
    const start: string | moment.MomentInput = request.start ? moment(request.start) : moment();
    const endTime: string | moment.MomentInput = request.end ? moment(request.end) : '';
    const startField = this.market === 'spot' ? 'after' : 'startTime';
    const endField = this.market === 'spot' ? 'before' : 'endTime';
    const toUnix = (time: string | moment.MomentInput): string => { return moment(time).unix().toString() + '000'; }
    // Ex: ?symbol=BTCUSDT_UMCBL&granularity=300&startTime=1659406928000&endTime=1659410528000
    const errorMessage = { code: 500, message: `No s'ha pogut obtenir el preu del símbol ${baseAsset}_${quoteAsset} per ${this.market} a Bitget.` };
    const requestKlines = (query: string): Promise<MarketKline[]> => this.get(`${url}${query}`, { isPublic: true, errorMessage }).then(response => {
      return (response.data as any[]).map(data => {
        if (this.market === 'spot') {
          return {
            symbol: request.symbol,
            interval: request.interval,
            openTime: timestamp(+data.ts),
            closeTime: calculateCloseTime(timestamp(+data.ts), request.interval),
            open: +data.open,
            high: +data.high,
            low: +data.low,
            close: +data.close,
            baseVolume: +data.baseVol,
            quoteVolume: +data.quoteVol,
          }
        } else {
          return {
            symbol: request.symbol,
            interval: request.interval,
            openTime: timestamp(+data[0]),
            closeTime: calculateCloseTime(timestamp(+data[0]), request.interval),
            open: +data[1],
            high: +data[2],
            low: +data[3],
            close: +data[4],
            baseVolume: +data[5],
            quoteVolume: +data[6],
          }
        }
      });
    });
    try {
      const results: MarketKline[] = [];
      let startTime: string | moment.MomentInput = start;
      if (!endTime && !limit) {
        const query = this.formatQuery({ symbol, [intervalField]: interval });
        results.push(...await requestKlines(query));
  
      } else if (!endTime && !!limit) {
        do {
          const query = this.formatQuery({ symbol, [intervalField]: interval, [startField]: toUnix(startTime) });
          const response = await requestKlines(query);
          if (!response.length) { break; }
          results.push(...response);
          startTime = results[results.length - 1].openTime;
        } while (results.length < limit);
        if (results.length > limit) { results.splice(limit); }
  
      } else {
        do {
          const query = this.formatQuery({ symbol, [intervalField]: interval, [startField]: toUnix(startTime), [endField]: toUnix(endTime) });
          const response = await requestKlines(query);
          if (!response.length) { break; }
          results.push(...response);
          startTime = results[results.length - 1].openTime;
        } while (moment(startTime).isAfter(moment(endTime)));
      }
      return Promise.resolve(results);

    } catch (error: any) { throw error; }
  }

  // getOrderBookTicker(request: OrderBookTickerRequest): Promise<OrderBookTicker | OrderBookTicker[]> { return {} as any; }


  // ---------------------------------------------------------------------------------------------------
  //  Account
  // ---------------------------------------------------------------------------------------------------

  /** S'utilitza només per comprovar si tenim accés amb la IP actual. */
   async getApiKeyInfo(): Promise<AccountInfo> {
    // ApiKey Info
    /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-apikey-info Get ApiKey Info} */
    const errorMessage = { code: 500, message: `No s'ha pogut obtenir la informació del compte a Bitget.` };
    const infoApiKey: { data: any } = await this.get(`api/spot/v1/account/getInfo`, { errorMessage });
    this.user_id = infoApiKey?.data?.user_id;
    const canWithdraw = infoApiKey?.data?.authorities?.some((a: any) => a === 'withdraw');
    const canTrade = infoApiKey?.data?.authorities?.some((a: any) => a === 'trade');
    const canDeposit = infoApiKey?.data?.authorities?.some((a: any) => a === 'deposit');
    const accountInfo: AccountInfo = { canTrade, canWithdraw, canDeposit, balances: [], positions: [] };
    return Promise.resolve(accountInfo);
  }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-account Get Account List Spot}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-account-list Get Account List Futures}
   */
  async getAccountInfo(): Promise<AccountInfo> {
    // ApiKey Info
    /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-apikey-info Get ApiKey Info} */
    const errorMessage = { code: 500, message: `No s'ha pogut obtenir la informació del compte a Bitget.` };
    const InfoApiKey: { data: any } = await this.get(`api/spot/v1/account/getInfo`, { errorMessage });
    this.user_id = InfoApiKey?.data?.user_id;
    const canWithdraw = InfoApiKey?.data?.authorities?.some((a: any) => a === 'withdraw');
    const canTrade = InfoApiKey?.data?.authorities?.some((a: any) => a === 'trade');
    const canDeposit = InfoApiKey?.data?.authorities?.some((a: any) => a === 'deposit');
    const accountInfo: AccountInfo = { canTrade, canWithdraw, canDeposit, balances: [], positions: [] };

    if (this.market === 'spot') {
      // Balances
      /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-account Get Account List Spot} */
      const errorMessage = { code: 500, message: `No s'han pogut obtenir els balanços per ${this.market} a Bitget.` };
      const assetsList: { data: any[] } = await this.get(`api/spot/v1/account/assets`, { errorMessage });
      accountInfo.balances.push(...assetsList.data.map(b => {
        const balance: Balance = {
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

    } else {
      // Balances futures
      await Promise.all(['umcbl', 'dmcbl', 'cmcbl'].map(async productType => {
        if (this.isTest) { productType = `s${productType}`; }
        /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-account-list Get Account List} */
        const errorMessage = { code: 500, message: `No s'han pogut obtenir els balanços per ${this.market} a Bitget.` };
        const params = { productType };
        const accountsList: { data: any[] } = await this.get(`api/mix/v1/account/accounts`, { params, errorMessage });
        accountInfo.balances.push(...accountsList.data.map(b => {
          const balance: Balance = {
            asset: b.marginCoin,
            balance: +b.available + +b.locked,
            available: +b.available,
            locked: +b.locked,
            remainder: 0.0,
            fee: 0.0,
          };
          return balance;
        }));
      }));
      // Positions futures
      await Promise.all(['umcbl', 'dmcbl', 'cmcbl'].map(async productType => {
        if (this.isTest) { productType = `s${productType}`; }
        /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-all-position Get All Position} */
        const errorMessage = { code: 500, message: `No s'han pogut obtenir les posicions per ${this.market} a Bitget.` };
        const params = { productType };
        const positionsList: { data: any[] } = await this.get(`api/mix/v1/position/allPosition`, { params, errorMessage });
        accountInfo.positions.push(...positionsList.data.map(p => {
          const symbol = this.parseSymbolProduct(p.symbol);
          const position: Position = {
            symbol,
            marginAsset: p.marginCoin,
            positionAmount: +p.available,
            price: +p.averageOpenPrice,
            leverage: +p.leverage,
            unrealisedPnl: +p.unrealizedPL,
            marginType: p.marginMode === 'crossed' ? 'cross' : 'isolated',
            positionSide: parsetPositionTradeSide(p.holdSide),
          };
          return position;
        }));
      }));
      return Promise.resolve(accountInfo);
    }
  }

  async getLeverage(symbol: SymbolType, mode?: MarginMode): Promise<LeverageInfo> {
    const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
    const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
    const bitgetSymbol = this.getSymbolProduct(symbol);
    const errorMessage = { code: 500, message: `No s'ha pogut obtenir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
    const params = { symbol: bitgetSymbol, marginCoin: quoteAsset };
    /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-single-account Get Single Account} */
    const account: { data: any } = await this.get(`api/mix/v1/account/account`, { params, errorMessage });
    return Promise.resolve<LeverageInfo>({
      symbol,
      longLeverage: +account.data.fixedLongLeverage,
      shortLeverage: +account.data.fixedShortLeverage,
      leverage: +account.data.crossMarginLeverage,
    });
  }

  async setLeverage(request: SetLeverage): Promise<void> {
    const baseAsset = this.isTest ? `S${request.symbol.baseAsset}` : request.symbol.baseAsset;
    const quoteAsset = this.isTest ? `S${request.symbol.quoteAsset}` : request.symbol.quoteAsset;
    const symbol = this.getSymbolProduct(request.symbol);
    const errorMarginMode = { code: 500, message: `No s'ha pogut establir el mode a ${request.mode} pel símbol ${baseAsset}_${quoteAsset} a Bitget.` };
    const paramsMarginMode = { symbol, marginCoin: quoteAsset, marginMode: request.mode === 'cross' ? 'crossed' : 'fixed' };
    /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#change-margin-mode Change Margin Mode} */
    await this.post(`api/mix/v1/account/setMarginMode`, { params: paramsMarginMode, errorMessage: errorMarginMode });
    const errorLeverage = { code: 500, message: `No s'ha pogut establir el leverage pel símbol ${baseAsset}_${quoteAsset} a Bitget.` };
    if (request.mode === 'cross') {
      const paramsCross = { symbol, marginCoin: quoteAsset, leverage: request.longLeverage };
      /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#change-leverage Change Leverage} */
      await this.post(`api/mix/v1/account/setLeverage`, { params: paramsCross, errorMessage: errorLeverage });
    } else {
      const paramsLong = { symbol, marginCoin: quoteAsset, leverage: request.longLeverage, holdSide: 'long' };
      /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#change-leverage Change Leverage} */
      await this.post(`api/mix/v1/account/setLeverage`, { params: paramsLong, errorMessage: errorLeverage });
      const paramsShort = { symbol, marginCoin: quoteAsset, leverage: request.shortLeverage, holdSide: 'short' };
      /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#change-leverage Change Leverage} */
      await this.post(`api/mix/v1/account/setLeverage`, { params: paramsShort, errorMessage: errorLeverage });
    }
    return Promise.resolve();
  }

  //  Account Orders
  // ---------------------------------------------------------------------------------------------------

  getHistoryOrders(request: GetHistoryOrdersRequest): Promise<Order[]> { return {} as any; }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-order-list Get order List - SPOT }
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-all-open-order Get All Open Order - FUTURES }
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-plan-order-tpsl-list Get Plan Order (TPSL) List}
   */
  async getOpenOrders(request: GetOpenOrdersRequest): Promise<Partial<Order>[]> {
    const { symbol } = request;
    const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
    const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
    const errorMessage = { code: 500, message: `No s'han pogut obtenir les orders del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
    const results: Partial<Order>[] = [];
    if (this.market === 'spot') {
      const params = { symbol: this.getSymbolProduct(symbol) };
      /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-order-list Get order List} */
      const ordersList: { data: any[] } = await this.post(`api/spot/v1/trade/open-orders`, { params, errorMessage });
      results.push(...ordersList.data.map(o => {
        // return o as any;
        return {
          id: o.clientOrderId,
          exchangeId: o.orderId,
          side: parseOrderSide(o.side),
          type: parseOrderType(o.orderType),
          status: parseOrderStatus(o.status),
          symbol: this.parseSymbolProduct(o.symbol),
          baseQuantity: +o.quantity,
          price: +o.price,
          created: moment(+o.cTime).format('YYYY-MM-DD HH:mm:ss').toString(),
        };
      }));
    } else {
      const params = { productType: this.getProductType(symbol), marginCoin: quoteAsset };
      /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-all-open-order Get All Open Order} */
      const ordersList: { data: any[] } = await this.get(`api/mix/v1/order/marginCoinCurrent`, { params, errorMessage });
      results.push(...ordersList.data.map(o => {
        // return o as any;
        return {
          id: o.clientOid,
          exchangeId: o.orderId,
          side: parsetOrderSideFutures(o.side),
          trade: parsetOrderTradeSide(o.side),
          type: parseOrderType(o.orderType),
          status: parseOrderStatus(o.state),
          symbol: this.parseSymbolProduct(o.symbol),
          baseQuantity: +o.size,
          price: +o.price,
          created: moment(+o.cTime).format('YYYY-MM-DD HH:mm:ss').toString(),
        };
      }));
      const paramsPlan = { symbol: this.getSymbolProduct(symbol), productType: this.getProductType(symbol), marginCoin: quoteAsset };
      /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-plan-order-tpsl-list Get Plan Order (TPSL) List} */
      const currentPlan: { data: any[] } = await this.get(`api/mix/v1/plan/currentPlan`, { params: paramsPlan, errorMessage });
      results.push(...currentPlan.data.map(o => {
        // return o as any;
        return {
          // id: null,
          exchangeId: o.orderId,
          side: parsetOrderSideFutures(o.side),
          trade: parsetOrderTradeSide(o.side),
          type: parseOrderType(o.orderType),
          stop: parseStopType(o.planType),
          status: parsePlanStatus(o.status),
          symbol: this.parseSymbolProduct(o.symbol),
          baseQuantity: +o.size,
          price: +o.executePrice,
          stopPrice: +o.triggerPrice,
          created: moment(+o.cTime).format('YYYY-MM-DD HH:mm:ss'),
        };
      }));
    }
    return Promise.resolve(results);
  }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-order-details Get order details - SPOT }
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-order-details Get order details - FUTURES }
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-plan-order-tpsl-list Get Plan Order (TPSL) List - FUTURES }
   */
  async getOrder(request: GetOrderRequest): Promise<Partial<Order>> {
    const { baseAsset, quoteAsset } = request.symbol;
    const symbol = this.getSymbolProduct(request.symbol);
    let params: any = { symbol, marginCoin: quoteAsset };
    if (request.exchangeId) { params = { ...params, orderId: request.exchangeId }; }
    if (request.id) { params = { ...params, clientOid: request.id }; }
    const errorMessage = { code: 500, message: `No s'ha pogut obtenir l'ordre ${request.id} en ${this.market} a Bitget.` };
    if (this.market === 'spot') {
      if (!params.orderId) { return Promise.reject(`No s'ha pogut obtenir l'ordre ${request.id} en ${this.market} a Bitget. l'identificador de l'exchange per SPOT es obligatori`); }
      /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-order-details Get order details} */
      const ordersList: { data: any[] } = await this.get(`api/spot/v1/trade/orderInfo`, { params, errorMessage });
      ordersList.data.map(o => {
        return Promise.resolve({
          id: o.clientOrderId,
          exchangeId: o.orderId,
          side: parseOrderSide(o.side),
          type: parseOrderType(o.orderType),
          status: parseOrderStatus(o.status),
          symbol: this.parseSymbolProduct(o.symbol),
          baseQuantity: +o.quantity,
          price: +o.price,
          created: moment(+o.cTime).format('YYYY-MM-DD HH:mm:ss').toString(),
        });
      });

      return Promise.resolve({});

    } else {
      /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-order-details Get order details} */
      const response: { data: any[] } = await this.get(`api/mix/v1/order/detail`, { params, errorMessage });
      let o: Order = undefined;
      response.data.map(o => {
        return Promise.resolve({
          id: o.clientOrderId,
          exchangeId: o.orderId,
          side: parseOrderSide(o.side),
          type: parseOrderType(o.orderType),
          status: parseOrderStatus(o.status),
          symbol: this.parseSymbolProduct(o.symbol),
          baseQuantity: +o.quantity,
          price: +o.price,
          created: moment(+o.cTime).format('YYYY-MM-DD HH:mm:ss').toString(),
        });
      });
      if (!o) {
        const currentPlan: { data: any[] } = await this.get(`/api/mix/v1/plan/currentPlan`, { params, errorMessage });
        let o: Order = undefined;
        currentPlan.data.map(o => {
          if (o.orderId === params.orderId) {
            return Promise.resolve({
              exchangeId: o.orderId,
              side: parsetOrderSideFutures(o.side),
              trade: parsetOrderTradeSide(o.side),
              type: parseOrderType(o.orderType),
              stop: parseStopType(o.planType),
              status: parsePlanStatus(o.status),
              symbol: this.parseSymbolProduct(o.symbol),
              baseQuantity: +o.size,
              price: +o.executePrice,
              stopPrice: +o.triggerPrice,
              created: moment(+o.cTime).format('YYYY-MM-DD HH:mm:ss'),
            });
          }
        });
      }
      return Promise.resolve(o);
    }
  }

  // getAccountTradeList(request: GetHistoryOrdersRequest): Promise<Order[]> { return {} as any; }


  //  Trade Orders
  // ---------------------------------------------------------------------------------------------------

  /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#place-order Place order - SPOT } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#place-plan-order Place plan order - SPOT } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#place-order Place order - Futures } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#place-stop-order Place Stop Order - Futures } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#place-stop-order Place plan order - Futures } */
  async postOrder(request: PostOrderRequest): Promise<Order> {
    const symbol = this.getSymbolProduct(request.symbol);
    const errorMessage = { code: 500, message: `No s'ha pogut enviar l'ordre ${request.id} en ${this.market} a Bitget.` };
    if (this.market === 'spot') {
      const baseParams = {
        symbol,
        side: formatOrderSide(request.side),
        orderType: formatOrderType(request.type),
        clientOrderId: request.id,
      };
      if (!request.stop) {
        const price = request.type === 'limit' ? { price: request.price } : undefined;
        const quantity = +request.baseQuantity;
        const force = 'normal';
        const params = { ...baseParams, ...price, quantity, force };
        const orderPlaced: { data: any } = await this.post(`api/spot/v1/trade/orders`, { params, errorMessage });
        const order: Order = { ...request, status: 'post', exchangeId: orderPlaced.data.orderId };
        return order;

      } else {
        const size = +request.baseQuantity;
        const executePrice = request.type === 'limit' ? { executePrice: +request.price } : undefined;
        const triggerPrice = +request.stopPrice;
        const triggerType = request.type === 'market' ? 'market_price' : 'fill_price';
        const timeInForceValue = 'normal';
        const params = { ...baseParams, ...executePrice, size, triggerPrice, triggerType, timeInForceValue };
        const orderPlaced: { data: any } = await this.post(`api/spot/v1/plan/placePlan`, { params, errorMessage });
        const order: Order = { ...request, status: 'post', exchangeId: orderPlaced.data.orderId };
        return order;
      }

    } else {
      const { baseAsset, quoteAsset } = this.resolveAssets(request.symbol);
      const baseParams = {
        symbol,
        marginCoin: quoteAsset,
        size: +request.baseQuantity,
        clientOid: request.id,
        side: formatOrderTradeSide(request.side, request.trade),
        timeInForceValue: 'normal',
      };
      if (!request.stop) {
        const price = request.type === 'limit' ? { price: request.price } : undefined;
        const orderType = formatOrderType(request.type);
        const params = { ...baseParams, orderType, ...price };
        const orderPlaced: { data: any } = await this.post(`api/mix/v1/order/placeOrder`, { params, errorMessage });
        const order: Order = { ...request, status: 'post', exchangeId: orderPlaced.data.orderId };
        return order;

      } else {
        const executePrice = request.type === 'limit' ? { executePrice: +request.price } : undefined;
        const triggerPrice = +request.stopPrice;
        const orderType = request.type;
        const triggerType = request.type === 'market' ? 'market_price' : 'fill_price';
        let urlPlan = '';
        let params = {};
        if (request.stop === 'normal') {
          params = { ...baseParams, ...executePrice, triggerPrice, orderType, triggerType };
          urlPlan = `api/mix/v1/plan/placePlan`;
        } else {
          const planType = request.stop === 'profit' || request.stop === 'profit-position' ? 'profit_plan' : 'loss_plan';
          const holdSide = request.trade;
          params = { ...baseParams, triggerPrice, planType, holdSide, triggerType };
          urlPlan = `api/mix/v1/plan/${request.stop === 'profit' || request.stop === 'loss' ? `placeTPSL` : `placePositionsTPSL`}`;
        }
        const planPlaced: { data: any } = await this.post(urlPlan, { params, errorMessage });
        const order: Order = { ...request, status: 'post', exchangeId: planPlaced.data.orderId };
        console.log(order);
        return order;
      }
    }
  }

  /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#cancel-order cancel order - SPOT } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#cancel-order Cancel order - Futures } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#cancel-plan-order-tpsl Cancel Plan Order (TPSL) - Futures } */
  async cancelOrder(request: CancelOrderRequest): Promise<any> {
    const { baseAsset, quoteAsset } = this.resolveAssets(request.symbol);
    const symbol = this.getSymbolProduct(request.symbol);
    const errorMessage = { code: 500, message: `No s'ha pogut cancel·lar l'ordre ${request.id} en ${this.market} a Bitget.` };
    if (this.market === 'spot') {
      const params = {
        symbol,
        orderId: request.exchangeId
      };
      const orderCanceled: { data: any } = await this.post(`api/spot/v1/trade/cancel-order`, { params, errorMessage });
      const order: any = { status: 'cancel', id: orderCanceled.data.clientOid, ...request };
      return order;
    } else {
      const { baseAsset, quoteAsset } = this.resolveAssets(request.symbol);
      const isStop = request.type.includes('stop');
      const planType = request.type.includes('stop') ? { planType: 'normal_plan' } : undefined;
      const params = {
        symbol,
        marginCoin: quoteAsset,
        orderId: request.exchangeId,
        ...planType,
      };
      const planCanceled: { data: any } = await this.post(isStop ? `api/mix/v1/plan/cancelPlan` : `api/mix/v1/order/cancel-order`, { params, errorMessage });
      const order: any = { status: 'cancel', id: planCanceled.data.clientOid, ...request };
      return order;
    }
  }


  // ---------------------------------------------------------------------------------------------------
  //  parsers
  // ---------------------------------------------------------------------------------------------------


}