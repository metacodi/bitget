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
  limits: Limit[] = [];
  currencies: any[] = [];
  exchangeSymbols: any[] = [];

  constructor(
    options?: ApiOptions,
  ) {
    super(options);
  }


  // ---------------------------------------------------------------------------------------------------
  //  ApiClient implementation
  // ---------------------------------------------------------------------------------------------------

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#api-domain API Domain}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#api-domain-name API Domain Name}
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
    this.exchangeSymbols = [];
    const url = this.market === 'spot' ? `api/spot/v1/public/products` : `api/mix/v1/market/contracts`;
    if (this.market === 'spot') {
      /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-symbols Get Symbols} */
      const errorMessage = { code: 500, message: `No s'ha pogut obtenir el llistat de símbols per spot a Bitget.` };
      const symbolsList: { data: any[] } = await this.get(url, { isPublic: true, errorMessage });
      this.exchangeSymbols.push(...symbolsList.data.map(symbol => ({ ...symbol, productType: 'spbl' })));
      return Promise.resolve({ limits: this.limits });
    } else {
      await Promise.all(['umcbl', 'dmcbl', 'cmcbl'].map(async productType => {
        if (this.isTest) { productType = `s${productType}`; }
        /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-all-symbols Get Symbols} */
        const errorMessage = { code: 500, message: `No s'ha pogut obtenir el llistat dels símbols disponibles pel producte '${productType}' de futurs a Bitget.` };
        const symbolsList: { data: any[] } = await this.get(url, { params: { productType }, isPublic: true, errorMessage });
        this.exchangeSymbols.push(...symbolsList.data.map(symbol => ({ ...symbol, productType, symbolName: `${symbol.baseCoin}${symbol.quoteCoin}` })));
      }));
      return Promise.resolve({ limits: this.limits });
    }
  }

  /** Les propietats `minLeverage` i `maxLeverage` potser no estan definides. S'estableixen amb una crida a `getMarketSymbol()`. */
  get symbols(): MarketSymbol[] { return this.exchangeSymbols.map(s => this.parseMarketSymbol(s)); }

  private findMarketSymbol(symbol: SymbolType): any {
    const baseCoin = this.resolveAsset(symbol.baseAsset);
    const quoteCoin = this.resolveAsset(symbol.quoteAsset);
    const found = this.exchangeSymbols.find(s => s.baseCoin === baseCoin && s.quoteCoin === quoteCoin);
    return found;
  }

  /** Obtenim els detalls del símbol. */
  async getMarketSymbol(symbol: SymbolType): Promise<MarketSymbol> {
    const { baseAsset, quoteAsset } = symbol;
    const found = this.findMarketSymbol(symbol);
    if (!found) { throw { code: 500, message: `getMarketSymbol: No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
    // NOTA: A futures, haurem de recuperar el leverage la primera vegada.
    if (this.market === 'futures' && found.minLeverage === undefined) {
      /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-symbol-leverage Get Symbol Leverage} */
      const errorMessage = { code: 500, message: `No s'ha pogut obtenir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
      const params = { symbol: found.symbol };
      const response: { data: any } = await this.get(`api/mix/v1/market/symbol-leverage`, { params, isPublic: true, errorMessage });
      found.minLeverage = +response.data.minLeverage;
      found.maxLeverage = +response.data.maxLeverage;
    }
    return Promise.resolve<MarketSymbol>(this.parseMarketSymbol(found));
  }


  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-single-ticker Get Single Ticker}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-symbol-mark-price Get Symbol Mark Price}
   */
  async getPriceTicker(symbol: SymbolType): Promise<MarketPrice> {
    const { baseAsset, quoteAsset } = symbol;
    const url = this.market === 'spot' ? `api/spot/v1/market/ticker` : `api/mix/v1/market/mark-price`;
    const bitgetSymbol = this.resolveSymbol(symbol);
    const errorMessage = { code: 500, message: `No s'ha pogut obtenir el preu del símbol ${baseAsset}_${quoteAsset} a Bitget ${this.market}.` };
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
    const symbol = this.resolveSymbol(request.symbol);
    const unit = request.interval.charAt(request.interval.length - 1) as unitOfTime.DurationConstructor;
    const interval = ['h', 'd', 'w', 'y'].includes(unit) ? request.interval.toLocaleUpperCase() : request.interval;
    const intervalField = this.market === 'spot' ? 'period' : 'granularity';
    const start: string | moment.MomentInput = request.start ? moment(request.start) : moment();
    const endTime: string | moment.MomentInput = request.end ? moment(request.end) : '';
    const startField = this.market === 'spot' ? 'after' : 'startTime';
    const endField = this.market === 'spot' ? 'before' : 'endTime';
    const toUnix = (time: string | moment.MomentInput): string => { return moment(time).unix().toString() + '000'; }
    // Ex: ?symbol=BTCUSDT_UMCBL&granularity=300&startTime=1659406928000&endTime=1659410528000
    const errorMessage = { code: 500, message: `No s'ha pogut obtenir el preu del símbol ${baseAsset}_${quoteAsset} a Bitget ${this.market}.` };
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
      const errorMessage = { code: 500, message: `No s'han pogut obtenir els balanços a Bitget ${this.market}.` };
      const assetsList: { data: any[] } = await this.get(`api/spot/v1/account/assets`, { errorMessage });
      accountInfo.balances.push(...assetsList.data.map(b => {
        const balance: Balance = {
          asset: this.parseAsset(b.coinName),
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
        const errorMessage = { code: 500, message: `No s'han pogut obtenir els balanços a Bitget ${this.market}.` };
        const params = { productType };
        const accountsList: { data: any[] } = await this.get(`api/mix/v1/account/accounts`, { params, errorMessage });
        accountInfo.balances.push(...accountsList.data.map(b => {
          const balance: Balance = {
            asset: this.parseAsset(b.marginCoin),
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
        const errorMessage = { code: 500, message: `No s'han pogut obtenir les posicions a Bitget ${this.market}.` };
        const params = { productType };
        const positionsList: { data: any[] } = await this.get(`api/mix/v1/position/allPosition`, { params, errorMessage });
        accountInfo.positions.push(...positionsList.data.map(p => {
          const symbol = this.parseSymbol(p.symbol);
          const position: Position = {
            symbol,
            marginAsset: this.parseAsset(p.marginCoin),
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
    const { baseAsset, quoteAsset } = symbol;
    const bitgetSymbol = this.resolveSymbol(symbol);
    const marginCoin = this.resolveAsset(quoteAsset);
    const errorMessage = { code: 500, message: `No s'ha pogut obtenir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
    const params = { symbol: bitgetSymbol, marginCoin };
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
    const { baseAsset, quoteAsset } = request.symbol;
    const marginCoin = this.resolveAsset(quoteAsset);
    const symbol = this.resolveSymbol(request.symbol);
    const marginMode = request.mode === 'cross' ? 'crossed' : 'fixed';
    const errorMarginMode = { code: 500, message: `No s'ha pogut establir el mode a ${request.mode} pel símbol ${baseAsset}_${quoteAsset} a Bitget.` };
    const paramsMarginMode = { symbol, marginCoin, marginMode };
    /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#change-margin-mode Change Margin Mode} */
    await this.post(`api/mix/v1/account/setMarginMode`, { params: paramsMarginMode, errorMessage: errorMarginMode });
    const errorLeverage = { code: 500, message: `No s'ha pogut establir el leverage pel símbol ${baseAsset}_${quoteAsset} a Bitget.` };
    if (request.mode === 'cross') {
      const paramsCross = { symbol, marginCoin, leverage: request.longLeverage };
      /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#change-leverage Change Leverage} */
      await this.post(`api/mix/v1/account/setLeverage`, { params: paramsCross, errorMessage: errorLeverage });
    } else {
      const paramsLong = { symbol, marginCoin, leverage: request.longLeverage, holdSide: 'long' };
      /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#change-leverage Change Leverage} */
      await this.post(`api/mix/v1/account/setLeverage`, { params: paramsLong, errorMessage: errorLeverage });
      const paramsShort = { symbol, marginCoin, leverage: request.shortLeverage, holdSide: 'short' };
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
    const { baseAsset, quoteAsset } = request.symbol;
    const marginCoin = this.resolveAsset(quoteAsset);
    const symbol = this.resolveSymbol(request.symbol);
    const productType = this.resolveProductType(request.symbol);
    const errorMessage = { code: 500, message: `No s'han pogut obtenir les orders del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
    const results: Partial<Order>[] = [];
    if (this.market === 'spot') {
      /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-order-list Get order List} */
      const ordersList: { data: any[] } = await this.post(`api/spot/v1/trade/open-orders`, { params: { symbol }, errorMessage });
      results.push(...ordersList.data.map(o => {
        // return o as any;
        return {
          id: o.clientOrderId,
          exchangeId: o.orderId,
          side: parseOrderSide(o.side),
          type: parseOrderType(o.orderType),
          status: parseOrderStatus(o.status),
          symbol: this.parseSymbol(o.symbol),
          baseQuantity: +o.quantity,
          price: +o.price,
          created: moment(+o.cTime).format('YYYY-MM-DD HH:mm:ss').toString(),
        };
      }));
    } else {
      /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-all-open-order Get All Open Order} */
      const ordersList: { data: any[] } = await this.get(`api/mix/v1/order/marginCoinCurrent`, { params: { productType, marginCoin }, errorMessage });
      results.push(...ordersList.data.map(o => {
        // return o as any;
        return {
          id: o.clientOid,
          exchangeId: o.orderId,
          side: parsetOrderSideFutures(o.side),
          trade: parsetOrderTradeSide(o.side),
          type: parseOrderType(o.orderType),
          status: parseOrderStatus(o.state),
          symbol: this.parseSymbol(o.symbol),
          baseQuantity: +o.size,
          price: +o.price,
          created: moment(+o.cTime).format('YYYY-MM-DD HH:mm:ss').toString(),
        };
      }));
      /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-plan-order-tpsl-list Get Plan Order (TPSL) List} */
      const currentPlan: { data: any[] } = await this.get(`api/mix/v1/plan/currentPlan`, { params: { symbol, productType, marginCoin }, errorMessage });
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
          symbol: this.parseSymbol(o.symbol),
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
    const marginCoin = this.resolveAsset(quoteAsset);
    const symbol = this.resolveSymbol(request.symbol);
    const exchangeId = request.exchangeId ? { orderId: request.exchangeId } : undefined;
    const id = request.id ? { clientOid: request.id } : undefined;
    const params = { symbol, marginCoin, ...exchangeId, ...id };
    const errorMessage = { code: 500, message: `No s'ha pogut obtenir l'ordre ${request.id} a Bitget ${this.market}.` };
    if (this.market === 'spot') {
      if (!params.orderId) { return Promise.reject(`No s'ha pogut obtenir l'ordre ${request.id} a Bitget ${this.market}. L'identificador d'exchange es obligatori per 'spot'.`); }
      /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-order-details Get order details} */
      const ordersList: { data: any[] } = await this.get(`api/spot/v1/trade/orderInfo`, { params, errorMessage });
      ordersList.data.map(o => {
        return Promise.resolve({
          id: o.clientOrderId,
          exchangeId: o.orderId,
          side: parseOrderSide(o.side),
          type: parseOrderType(o.orderType),
          status: parseOrderStatus(o.status),
          symbol: this.parseSymbol(o.symbol),
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
          symbol: this.parseSymbol(o.symbol),
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
              symbol: this.parseSymbol(o.symbol),
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

  /**
   * ```
   * (spot) !request.stop => api/spot/v1/trade/orders
   * (spot) request.stop => api/spot/v1/plan/placePlan
   * (futures) !request.stop => api/mix/v1/order/placeOrder
   * (futures) request.stop: 'normal' => api/mix/v1/plan/placePlan
   * (futures) request.stop: 'profit' | 'loss' => api/mix/v1/plan/placeTPSL
   * (futures) request.stop: 'profit-position' | 'loss-position' => api/mix/v1/plan/placePositionsTPSL
   * ```
   */
  async postOrder(request: PostOrderRequest): Promise<Order> {
    const { baseAsset, quoteAsset } = request.symbol;
    const marginCoin = this.resolveAsset(quoteAsset);
    const symbol = this.resolveSymbol(request.symbol);
    const errorMessage = { code: 500, message: `No s'ha pogut enviar l'ordre ${request.id} a Bitget ${this.market}.` };
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
        /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#place-order Place order - SPOT } */
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
        /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#place-plan-order Place plan order - SPOT } */
        const orderPlaced: { data: any } = await this.post(`api/spot/v1/plan/placePlan`, { params, errorMessage });
        const order: Order = { ...request, status: 'post', exchangeId: orderPlaced.data.orderId };
        return order;
      }
      
    } else {
      const baseParams = {
        symbol,
        marginCoin,
        size: +request.baseQuantity,
        clientOid: request.id,
        side: formatOrderTradeSide(request.side, request.trade),
        timeInForceValue: 'normal',
      };
      if (!request.stop) {
        const price = request.type === 'limit' ? { price: request.price } : undefined;
        const orderType = formatOrderType(request.type);
        const params = { ...baseParams, orderType, ...price };
        /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#place-order Place order} */
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
          const planType = request.stop.includes('profit') ? 'profit_plan' : 'loss_plan';
          const holdSide = request.trade;
          params = { ...baseParams, triggerPrice, planType, holdSide, triggerType };
          urlPlan = `api/mix/v1/plan/${request.stop.includes('-position') ? `placePositionsTPSL` : `placeTPSL`}`;
        }
        /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#place-plan-order Place Plan Order} */
        /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#place-stop-order Place Stop Order} */
        /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#place-position-tpsl Place Position TPSL} */
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
    const { baseAsset, quoteAsset } = request.symbol;
    const marginCoin = this.resolveAsset(quoteAsset);
    const symbol = this.resolveSymbol(request.symbol);
    const errorMessage = { code: 500, message: `No s'ha pogut cancel·lar l'ordre ${request.id} a Bitget ${this.market}.` };
    if (this.market === 'spot') {
      const params = {
        symbol,
        orderId: request.exchangeId
      };
      const orderCanceled: { data: any } = await this.post(`api/spot/v1/trade/cancel-order`, { params, errorMessage });
      const order: any = { status: 'cancel', id: orderCanceled.data.clientOid, ...request };
      return order;
    } else {
      const isStop = request.type.includes('stop');
      const planType = request.type.includes('stop') ? { planType: 'normal_plan' } : undefined;
      const params = {
        symbol,
        marginCoin,
        orderId: request.exchangeId,
        ...planType,
      };
      const planCanceled: { data: any } = await this.post(isStop ? `api/mix/v1/plan/cancelPlan` : `api/mix/v1/order/cancel-order`, { params, errorMessage });
      const order: any = { status: 'cancel', id: planCanceled.data.clientOid, ...request };
      return order;
    }
  }


  // ---------------------------------------------------------------------------------------------------
  //  helpers
  // ---------------------------------------------------------------------------------------------------

  /** Arrodoneix la quantitat de quote asset per posar ordres. */
  fixPrice(price: number, symbol: SymbolType | MarketSymbol) { return +price.toFixed(this.resolveMarketSymbol(symbol).pricePrecision || 3); }
  
  /** Arrodoneix la quantitat de base asset per posar ordres. */
  fixQuantity(quantity: number, symbol: SymbolType | MarketSymbol) { return +quantity.toFixed(this.resolveMarketSymbol(symbol).quantityPrecision || 2); }
  
  /** Arrodoneix la quantitat de quote asset per gestionar els balanços. */
  fixBase(base: number, symbol: SymbolType | MarketSymbol) { return +base.toFixed(this.resolveMarketSymbol(symbol).basePrecision); }
  
  /** Arrodoneix la quantitat de base asset per gestionar els balanços. */
  fixQuote(quote: number, symbol: SymbolType | MarketSymbol) { return +quote.toFixed(this.resolveMarketSymbol(symbol).quotePrecision); }

  private resolveMarketSymbol(symbol: SymbolType | MarketSymbol): MarketSymbol {
    if (typeof symbol === 'object' && symbol.hasOwnProperty('symbol')) { return symbol as MarketSymbol; }
    const { baseAsset, quoteAsset } = symbol as SymbolType;
    const found = this.findMarketSymbol(symbol as SymbolType);
    if (found) { return found; } else { throw { code: 500, message: `[resolveMarketSymbol] No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
  }


  // ---------------------------------------------------------------------------------------------------
  //  parsers
  // ---------------------------------------------------------------------------------------------------

  resolveAsset(asset: CoinType): string {
    return this.isTest ? `S${asset}` : asset;
  }

  parseAsset(asset: string): CoinType {
    return (this.isTest ? String(asset).slice(1) : asset) as CoinType;
  }

  resolveSymbol(symbol: SymbolType): string {
    const { baseAsset, quoteAsset } = symbol;
    const found = this.findMarketSymbol(symbol);
    if (found) { return found.symbol; } else { throw { code: 500, message: `[resolveSymbol] No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
  }

  parseSymbol(symbol: string): SymbolType {
    const found = this.exchangeSymbols.find(s => s.symbol === symbol);
    if (found) {
      const baseAsset = this.parseAsset(found.baseCoin);
      const quoteAsset = this.parseAsset(found.quoteCoin);
      return { baseAsset, quoteAsset };
    } else { throw { code: 500, message: `[parseSymbol] No s'ha trobat el símbol ${symbol} a Bitget.` }; }
  }

  resolveProductType(symbol: SymbolType): string {
    const { baseAsset, quoteAsset } = symbol;
    const found = this.findMarketSymbol(symbol);
    if (found) { return found.productType; } else { throw { code: 500, message: `[resolveProductType] No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
  }

  parseProductType(productType: string): SymbolType {
    const found = this.exchangeSymbols.find(s => s.productType === productType);
    if (found) {
      const baseAsset = this.parseAsset(found.baseCoin);
      const quoteAsset = this.parseAsset(found.quoteCoin);
      return { baseAsset, quoteAsset };
    } else { throw { code: 500, message: `[parseProductType] No s'ha trobat el símbol ${productType} a Bitget.` }; }
  }

  resolveInstrumentId(symbol: SymbolType): string {
    const { baseAsset, quoteAsset } = symbol;
    const found = this.findMarketSymbol(symbol);
    if (found) { return found.symbolName; } else { throw { code: 500, message: `[resolveInstrumentId] No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
  }

  parseInstrumentId(instId: string): SymbolType {
    const found = this.exchangeSymbols.find(s => s.symbolName === instId);
    if (found) {
      const baseAsset = this.parseAsset(found.baseCoin);
      const quoteAsset = this.parseAsset(found.quoteCoin);
      return { baseAsset, quoteAsset };
    } else { throw { code: 500, message: `[parseInstrumentId] No s'ha trobat el símbol ${instId} a Bitget.` }; }
  }

  parseMarketSymbol(ms: any): MarketSymbol {
    const { market } = this;
    if (market === 'spot') {
      /*
        {
          "symbol":"BTCUSDT_SPBL",
          "symbolName":"BTCUSDT",
          "baseCoin":"BTC",
          "quoteCoin":"USDT",
          "minTradeAmount":"0.0001",
          "maxTradeAmount":"10000",
          "takerFeeRate":"0.001",
          "makerFeeRate":"0.001",
          "priceScale":"4",
          "quantityScale":"8",
          "status":"online"
        }
      */
      return {
        symbol: this.parseSymbol(ms.symbol),
        ready: ms.status === 'online',
        // NOTA: No s'informa de la precisió de quote asset per posar ordres. Forcem la precissió a 1 decimal.
        pricePrecision: 1,
        quantityPrecision: +ms.priceScale,
        basePrecision: +ms.quantityScale,
        quotePrecision: +ms.quantityScale,
        tradeAmountAsset: 'base',
        minTradeAmount: +ms.minTradeAmount,
        maxTradeAmount: +ms.maxTradeAmount,
        commissionAsset: 'quote',
        makerCommission: +ms.makerFeeRate,
        takerCommission: +ms.takerFeeRate,
      };
      
    } else {
      /**
        {
          baseCoin: 'BTC'
          buyLimitPriceRatio: '0.01'
          feeRateUpRatio: '0.005'
          makerFeeRate: '0.0002'
          minTradeNum: '0.001'
          openCostUpRatio: '0.01'
          priceEndStep: '5'
          pricePlace: '1' <=> 0.1
          quoteCoin: 'USDT'
          sellLimitPriceRatio: '0.01'
          sizeMultiplier: '0.001'
          supportMarginCoins: (1) ['USDT']
          symbol: 'BTCUSDT_UMCBL'
          symbolType: 'perpetual'
          takerFeeRate: '0.0006'
          volumePlace: '3'
        }
      */
      return {
        symbol: this.parseSymbol(ms.symbol),
        ready: true,
        pricePrecision: +ms.pricePlace,
        quantityPrecision: +ms.volumePlace,
        // NOTA: A diferència d'spot, a futures no s'informa de cap `quantityScale`. Forcem la precissió a 8 decimals.
        basePrecision: 8,
        // NOTA: A diferència d'spot, a futures no s'informa de cap `quantityScale`. Forcem la precissió a 8 decimals.
        quotePrecision: 8,
        tradeAmountAsset: 'base',
        minTradeAmount: +ms.minTradeNum,
        maxTradeAmount: +ms.maxTradeAmount,
        commissionAsset: 'quote',
        makerCommission: +ms.makerFeeRate,
        takerCommission: +ms.takerFeeRate,
        minLeverage: +ms.minLeverage,
        maxLeverage: +ms.maxLeverage,
      };
    }
  }

}