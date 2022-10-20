import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { createHmac } from 'crypto';
import moment, { unitOfTime } from 'moment';

import { timestamp } from "@metacodi/node-utils";
import { ExchangeApi, MarketType, HttpMethod, ApiOptions, ApiRequestOptions, AccountInfo, ExchangeInfo, SymbolType, MarketPrice, MarketKline, KlinesRequest, Balance, Position, MarginMode, LeverageInfo, Order, GetOrderRequest, PostOrderRequest, CancelOrderRequest, MarketSymbol, Limit, calculateCloseTime, KlineIntervalType, SetLeverage, GetHistoryOrdersRequest } from '@metacodi/abstract-exchange';
import { BitgetOrderSide, BitgetOrderType, BitgetOrderStatus, BitgetPlanStatus, BitgetOrderTradeSide } from './bitget.types';
import { parseOrderSide, parseOrderStatus, parseOrderType, parsePlanStatus, parsetOrderTradeSide, formatOrderSide, formatOrderType, formatOrderTradeSide, parsetOrderSideFutures, parseOrderTypeFutures } from './bitget-parsers';
import { map } from 'rxjs/operators';


/** {@link https://bitgetlimited.github.io/apidoc/en/mix/#request-interaction Request Interaction} */
export class BitgetApi implements ExchangeApi {

  /** Retorna la url base sense el protocol.
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#restapi Rest Api}
   * 
   *  Bitget account can be used for login on Demo Trading. If you already have an Bitget account, you can log in directly.
   *  Start API Demo Trading by the following steps:
   *  Login Bitget —> Assets —> Start Demo Trading —> Personal Center —> Demo Trading API -> Create Demo Trading V5 APIKey —> Start your Demo Trading
   */
  baseUrl(): string { return `api.bitget.com` };

  options: ApiOptions;
  user_id: String;
  currencies: any[] = [];
  symbols: any[] = [];

  constructor(
    options?: ApiOptions,
  ) {
    this.options = { ...this.defaultOptions, ...options };
  }


  // ---------------------------------------------------------------------------------------------------
  //  options
  // ---------------------------------------------------------------------------------------------------

  get market(): MarketType { return this.options?.market; }

  /** {@link https://www.bitget.com/en/account/newapi API Management} */
  get apiKey(): string { return this.options?.apiKey; }

  get apiSecret(): string { return this.options?.apiSecret; }

  get apiPassphrase(): string { return this.options?.apiPassphrase; }

  get isTest(): boolean { return !!this.options?.isTest; }

  get defaultOptions(): Partial<ApiOptions> {
    return {
      isTest: false,
      // recvWindow: 5000,
    }
  }

  public setCredentials(data: { apiKey: string; apiSecret: string; apiPassphrase: string }): void {
    this.options.apiKey = data.apiKey;
    this.options.apiSecret = data.apiSecret;
    this.options.apiPassphrase = data.apiPassphrase;
  }


  // ---------------------------------------------------------------------------------------------------
  //  request helpers
  // ---------------------------------------------------------------------------------------------------

  public get(endpoint: string, options?: ApiRequestOptions): Promise<any> { return this.request('GET', endpoint, options); }

  public post(endpoint: string, options?: ApiRequestOptions): Promise<any> { return this.request('POST', endpoint, options); }

  public put(endpoint: string, options?: ApiRequestOptions): Promise<any> { return this.request('PUT', endpoint, options); }

  public delete(endpoint: string, options?: ApiRequestOptions): Promise<any> { return this.request('DELETE', endpoint, options); }


  // ---------------------------------------------------------------------------------------------------
  //  request
  // ---------------------------------------------------------------------------------------------------

  async request(method: HttpMethod, endpoint: string, options?: ApiRequestOptions): Promise<any> {
    if (!options) { options = {}; }
    const isPublic = options.isPublic === undefined ? false : options.isPublic;
    const headers = options.headers === undefined ? undefined : options.headers;
    const params = options.params === undefined ? undefined : options.params;

    const baseUrl = this.baseUrl();
    const [uri, _query = ''] = endpoint.split('?');

    const config: AxiosRequestConfig<any> = {
      method,
      // url: 'https://' + [baseUrl, endpoint].join('/'),
      headers: { ...headers as any },
      // timeout: 1000 * 60 * 5, // 5 min.
    };

    const { body, query } = this.resolveData(method, params || {});

    if (query) {
      const concat = endpoint.includes('?') ? (endpoint.endsWith('?') ? '' : '&') : '?';
      endpoint += concat + query;
    }

    //** Per a totes les consultes */
    config.headers['Content-Type'] = 'application/json';
    config.headers['Locale'] = 'en-US';

    if (method === 'POST' || method === 'PUT') {
      config.data = body;
    } 1

    if (!isPublic) {
      const authHeaders = await this.getAuthHeaders(method, '/' + endpoint, body);
      config.headers = { ...config.headers, ...authHeaders } as any;
    }

    config.url = 'https://' + [baseUrl, endpoint].join('/');

    console.log(config);

    return axios(config).then(response => {
      // console.log(config.url, response);
      if (response.status !== 200) { throw response; }
      return response.data;
    }).catch(e => this.parseException(e, config.url, options.error));
  }

  protected resolveData(method: HttpMethod, data: { [key: string]: any } = {}, options?: { encodeValues?: boolean, strictValidation?: boolean }) {
    if (!options) { options = {}; }
    const strictValidation = options.strictValidation === undefined ? false : options.strictValidation;
    const encodeValues = options.encodeValues === undefined ? true : options.encodeValues;
    const d: { [key: string]: any } = {};
    Object.keys(data).map(key => {
      const value = data[key];
      if (strictValidation && value === undefined) {
        throw new Error('Failed to sign API request due to undefined parameter');
      }
      const canEncode = method === 'GET' || method === 'DELETE';
      const encodedValue = encodeValues && canEncode ? encodeURIComponent(value) : value;
      d[key] = encodedValue;
    });

    if (method === 'GET' || method === 'DELETE') {
      return {
        query: Object.keys(d).map(v => `${v}=${d[v]}`).join('&'),
        body: undefined,
      }
    } else {
      return {
        query: '',
        body: JSON.stringify(d),
      }
    }
  }

  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#api-verification API Verificatio} */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#signature Signature} */
  protected async getAuthHeaders(method: string, endpoint: string, params: any) {
    const { apiKey, apiSecret, apiPassphrase } = this;

    const timestamp = Date.now();
    const mParams = String(JSON.stringify(params)).slice(1, -1);
    const formatedParams = String(mParams).replace(/\\/g, '');
    const data = (method === 'GET' || method === 'DELETE') ? this.formatQuery(params) : formatedParams;
    const message = timestamp + method + endpoint + data;
    // console.log('message =>', message);
    const signature = await this.signMessage(message, apiSecret);
    const locale = 'en-US';
    const headers: { [header: string]: number | string } = {
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-KEY': apiKey,
      'ACCESS-PASSPHRASE': apiPassphrase,
      'Content-Type': 'application/json',
      Cookie: 'locale=' + locale,
      locale,
    };
    return headers;
  }


  protected formatQuery(params: any) {
    if (!!params && JSON.stringify(params).length !== 2) {
      const serialisedParams = this.serialiseParams(params, { encodeValues: true });
      return '?' + serialisedParams;
    } else {
      return '';
    }
  }

  protected serialiseParams(params: { [key: string]: any } = {}, options?: { encodeValues?: boolean, strictValidation?: boolean }): string {
    if (!options) { options = {}; }
    const strictValidation = options.strictValidation === undefined ? false : options.strictValidation;
    const encodeValues = options.encodeValues === undefined ? true : options.encodeValues;
    return Object.keys(params).map(key => {
      const value = params[key];
      if (strictValidation && (value === null || value === undefined || isNaN(value))) {
        throw new Error('Failed to sign API request due to undefined parameter');
      }
      const encodedValue = value ? (encodeValues ? encodeURIComponent(value) : value) : null;
      return `${key}=${encodedValue}`;
    }).join('&');
  };

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

  protected parseException(e: AxiosError, url: string, error: ApiRequestOptions['error']): any {
    const { response, request, message } = e;
    // Si no hem rebut una resposta...
    if (!response) { throw request ? e : message; }
    if (response?.data?.code === 429) {
      throw {
        code: 429,

      };
    } else {
      throw {
        ...error,
        requestCode: response.data?.code,
        requestMessage: response.data?.msg,
        body: response.data,
        headers: response.headers,
        requestUrl: url,
        requestBody: request.body,
        options: { ...this.options },
      };
    }
  }


  // ---------------------------------------------------------------------------------------------------
  //  Market
  // ---------------------------------------------------------------------------------------------------

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-account-list Get Symbols - Spot}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-all-symbols Get Symbols - Futures}
   */
  async getExchangeInfo(): Promise<ExchangeInfo> {
    // Obtenim els límits.
    const limits: Limit[] = [];
    if (this.market === 'spot') {
      limits.push({ type: 'request', maxQuantity: 20, period: 1, unitOfTime: 'second' });
      limits.push({ type: 'trade', maxQuantity: 10, period: 1, unitOfTime: 'second' });
    } else if (this.market === 'futures') {
      limits.push({ type: 'request', maxQuantity: 20, period: 1, unitOfTime: 'second' });
      limits.push({ type: 'trade', maxQuantity: 10, period: 1, unitOfTime: 'second' });
    }

    // Obtenim les monedes.
    this.currencies = [];
    /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-coin-list Get Coin List} */
    const error = { code: 500, message: `No s'han pogut obtenir les monedes a Bitget.` };
    const response = await this.get(`api/spot/v1/public/currencies`, { isPublic: true, error });
    this.currencies.push(...response.data);

    // Obtenim els símbols.
    this.symbols = [];
    const url = this.market === 'spot' ? `api/spot/v1/public/products` : `api/mix/v1/market/contracts`;
    if (this.market === 'spot') {
      /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-symbols Get Symbols} */
      const error = { code: 500, message: `No s'han pogut obtenir els símbols d'spot a Bitget.` };
      const response = await this.get(url, { isPublic: true, error });
      this.symbols.push(...(response.data as any[]).map(symbol => ({ ...symbol, productType: 'spbl' })));
      return Promise.resolve({ limits });
    } else {
      await Promise.all(['umcbl', 'dmcbl', 'cmcbl'].map(async productType => {
        // throw { code: 500, message: 'Excepció provocada!' };
        if (this.isTest) { productType = `s${productType}`; }
        /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-all-symbols Get Symbols} */
        const error = { code: 500, message: `No s'han pogut obtenir els símbols pel producte '${productType}' de futurs a Bitget.` };
        const response = await this.get(url, { params: { productType }, isPublic: true, error });
        this.symbols.push(...(response.data as any[]).map(symbol => ({ ...symbol, productType, symbolName: `${symbol.baseCoin}${symbol.quoteCoin}` })));
      }));
      return Promise.resolve({ limits });
    }
  }

  async getMarketSymbol(symbol: SymbolType): Promise<MarketSymbol> {
    const { baseAsset, quoteAsset } = symbol;
    const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
    if (!found) { throw { code: 500, message: `No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
    if (this.market === 'spot') {
      return Promise.resolve<MarketSymbol>({
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
    } else {
      if (found.minLeverage === undefined) {
        /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-symbol-leverage Get Symbol Leverage} */
        const error = { code: 500, message: `No s'ha pogut obtenir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
        const params = { symbol: found.symbol };
        const response = await this.get(`api/mix/v1/market/symbol-leverage`, { params, isPublic: true, error });
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
        minTradeAmount: +found.minTradeNum,
        maxTradeAmount: +found.maxTradeAmount,
        makerCommission: +found.makerFeeRate,
        takerCommission: +found.takerFeeRate,
        minLeverage: +found.minLeverage,
        maxLeverage: +found.maxLeverage,
      });
    }
  }

  // resolveAssets(symbol: SymbolType): SymbolType {
  //   return { baseAsset: this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset, quoteAsset: this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset };
  // }

  getSymbolProduct(symbol: SymbolType): string {
    const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
    const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
    const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
    if (found) { return found.symbol; } else { throw { code: 500, message: `No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
  }

  getProductType(symbol: SymbolType): string {
    const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
    const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
    const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
    if (found) { return found.productType; } else { throw { code: 500, message: `No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
  }

  getInstrumentId(symbol: SymbolType): string {
    const { baseAsset, quoteAsset } = symbol;
    const found = this.symbols.find(s => s.baseCoin === baseAsset && s.quoteCoin === quoteAsset);
    // if (found) { return this.market === 'spot' ? found.symbolName : `${found.baseCoin}${found.quoteCoin}`; } else { throw { code: 500, message: `No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
    if (found) { return found.symbolName; } else { throw { code: 500, message: `No s'ha trobat el símbol ${baseAsset}_${quoteAsset} a Bitget.` }; }
  }

  parseInstrumentId(instId: string): SymbolType {
    const found = this.symbols.find(s => s.symbolName === instId);
    if (found) {
      return { baseAsset: found.baseCoin, quoteAsset: found.quoteCoin };
    } else { throw { code: 500, message: `No s'ha trobat el símbol ${instId} a Bitget.` }; }
  }

  parseSymbolProduct(symbol: string): SymbolType {
    const found = this.symbols.find(s => s.symbol === symbol);
    if (found) {
      return { baseAsset: found.baseCoin, quoteAsset: found.quoteCoin };
    } else { throw { code: 500, message: `No s'ha trobat el símbol ${symbol} a Bitget.` }; }
  }

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-single-ticker Get Single Ticker}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-symbol-mark-price Get Symbol Mark Price}
   */
  async getPriceTicker(symbol: SymbolType): Promise<MarketPrice> {
    const { baseAsset, quoteAsset } = symbol;
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
  async getKlines(params: KlinesRequest): Promise<MarketKline[]> {
    const { limit } = params;
    const { baseAsset, quoteAsset } = params.symbol;
    const url = this.market === 'spot' ? `api/spot/v1/market/candles` : `api/mix/v1/market/candles`;
    const symbol = this.getSymbolProduct(params.symbol);
    const unit = params.interval.charAt(params.interval.length - 1) as unitOfTime.DurationConstructor;
    const interval = ['h', 'd', 'w', 'y'].includes(unit) ? params.interval.toLocaleUpperCase() : params.interval;
    const intervalField = this.market === 'spot' ? 'period' : 'granularity';
    const start: string | moment.MomentInput = params.start ? moment(params.start) : moment();
    const endTime: string | moment.MomentInput = params.end ? moment(params.end) : '';
    const startField = this.market === 'spot' ? 'after' : 'startTime';
    const endField = this.market === 'spot' ? 'before' : 'endTime';
    const toUnix = (time: string | moment.MomentInput): string => { return moment(time).unix().toString() + '000'; }
    // Ex: ?symbol=BTCUSDT_UMCBL&granularity=300&startTime=1659406928000&endTime=1659410528000
    const error = { code: 500, message: `No s'han pogut obtenir el preu del símbol ${baseAsset}_${quoteAsset} per ${this.market} a Bitget.` };
    const requestKlines = (query: string): Promise<MarketKline[]> => this.get(`${url}${query}`, { isPublic: true, error }).then(response => {
      return (response.data as any[]).map(data => {
        if (this.market === 'spot') {
          return {
            symbol: params.symbol,
            interval: params.interval,
            openTime: timestamp(+data.ts),
            closeTime: calculateCloseTime(timestamp(+data.ts), params.interval),
            open: +data.open,
            high: +data.high,
            low: +data.low,
            close: +data.close,
            baseVolume: +data.baseVol,
            quoteVolume: +data.quoteVol,
          }
        } else {
          return {
            symbol: params.symbol,
            interval: params.interval,
            openTime: timestamp(+data[0]),
            closeTime: calculateCloseTime(timestamp(+data[0]), params.interval),
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
  }

  // getOrderBookTicker(params: OrderBookTickerRequest): Promise<OrderBookTicker | OrderBookTicker[]> { return {} as any; }


  // ---------------------------------------------------------------------------------------------------
  //  Account
  // ---------------------------------------------------------------------------------------------------

  /**
   * {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-account Get Account List Spot}
   * {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-account-list Get Account List Futures}
   */
  async getAccountInfo(): Promise<AccountInfo> {
    // ApiKey Info
    /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-apikey-info Get ApiKey Info} */
    const error = { code: 500, message: `No s'han pogut obtenir la informació ApiKey a Bitget.` };
    const InfoApiKey = await this.get(`api/spot/v1/account/getInfo`, { error });
    this.user_id = InfoApiKey?.data?.user_id;
    const canWithdraw = InfoApiKey?.data?.authorities?.some((a: any) => a === 'withdraw');
    const canTrade = InfoApiKey?.data?.authorities?.some((a: any) => a === 'trade');
    const canDeposit = InfoApiKey?.data?.authorities?.some((a: any) => a === 'deposit');
    const accountInfo: AccountInfo = { canTrade, canWithdraw, canDeposit, balances: [], positions: [] };

    if (this.market === 'spot') {
      // Balances
      /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-account Get Account List Spot} */
      const error = { code: 500, message: `No s'han pogut obtenir els balances per ${this.market} a Bitget.` };
      const response = await this.get(`api/spot/v1/account/assets`, { error });
      accountInfo.balances.push(...(response.data as any[]).map(b => {
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
        const error = { code: 500, message: `No s'han pogut obtenir els balances per ${this.market} a Bitget.` };
        const params = { productType };
        const response = await this.get(`api/mix/v1/account/accounts`, { params, error });
        accountInfo.balances.push(...(response.data as any[]).map(b => {
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
        const error = { code: 500, message: `No s'han pogut obtenir les posicions per ${this.market} a Bitget.` };
        const params = { productType };
        const response = await this.get(`api/mix/v1/position/allPosition`, { params, error });
        accountInfo.positions.push(...(response.data as any[]).map(p => {
          const symbol = this.parseSymbolProduct(p.symbol);
          const position: Position = {
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
      }));
      return Promise.resolve(accountInfo);
    }
  }

  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-single-account Get Single Account} */
  async getLeverage(symbol: SymbolType, mode?: MarginMode): Promise<LeverageInfo> {
    const { baseAsset, quoteAsset } = symbol;
    const bitgetSymbol = this.getSymbolProduct(symbol);
    const error = { code: 500, message: `No s'ha pogut obtenir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
    const params = { symbol: bitgetSymbol, marginCoin: quoteAsset };
    const response = await this.get(`api/mix/v1/account/account`, { params, error });
    return Promise.resolve<LeverageInfo>({
      symbol,
      longLeverage: +response.data.fixedLongLeverage,
      shortLeverage: +response.data.fixedShortLeverage,
      leverage: +response.data.crossMarginLeverage,
    });
  }

  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#change-leverage Change Leverage} */
  async setLeverage(params: SetLeverage): Promise<void> {
    const { baseAsset, quoteAsset } = params.symbol;
    const symbol = this.getSymbolProduct(params.symbol);
    const dataMarginMode = { symbol, marginCoin: quoteAsset, marginMode: params.mode === 'cross' ? 'crossed' : 'fixed' };
    const errorMarginMode = { code: 500, message: `No s'ha pogut establir el mode a ${params.mode} del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
    await this.post(`api/mix/v1/account/setMarginMode`, { params: dataMarginMode, error: errorMarginMode });
    if (params.mode === 'cross') {
      const dataCross = { symbol, marginCoin: quoteAsset, leverage: params.longLeverage };
      const errorCross = { code: 500, message: `No s'ha pogut establir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
      await this.post(`api/mix/v1/account/setLeverage`, { params: dataCross, error: errorCross });
    } else {
      const dataLong = { symbol, marginCoin: quoteAsset, leverage: params.longLeverage, holdSide: 'long' };
      const errorLong = { code: 500, message: `No s'ha pogut establir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
      await this.post(`api/mix/v1/account/setLeverage`, { params: dataLong, error: errorLong });
      const dataShort = { symbol, marginCoin: quoteAsset, leverage: params.shortLeverage, holdSide: 'short' };
      const errorShort = { code: 500, message: `No s'ha pogut establir el leverage del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
      await this.post(`api/mix/v1/account/setLeverage`, { params: dataShort, error: errorShort });
    }
    return Promise.resolve();
  }

  //  Account Orders
  // ---------------------------------------------------------------------------------------------------

  getHistoryOrders(params: GetHistoryOrdersRequest): Promise<Order[]> { return {} as any; }

  /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-order-list Get order List - SPOT } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-all-open-order Get All Open Order - FUTURES } */
  async getOpenOrders(symbol: SymbolType): Promise<Order[]> {
    const baseAsset = this.isTest ? `S${symbol.baseAsset}` : symbol.baseAsset;
    const quoteAsset = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
    const error = { code: 500, message: `No s'ha pogut obtenir les orders del símbol ${baseAsset}_${quoteAsset} a Bitget.` };
    const results: Order[] = [];
    if (this.market === 'spot') {
      const params = { symbol: this.getSymbolProduct(symbol) };
      const response = await this.post(`api/spot/v1/trade/open-orders`, { params, error });
      results.push(...(response.data as any[]).map(o => {
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
      const response = await this.get(`api/mix/v1/order/marginCoinCurrent`, { params, error });
      results.push(...(response.data as any[]).map(o => {
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
      const responsePlan = await this.get(`api/mix/v1/plan/currentPlan`, { params: paramsPlan, error });
      results.push(...(responsePlan.data as any[]).map(o => {
        // return o as any; 
        return {
          id: null,
          exchangeId: o.orderId,
          side: parsetOrderSideFutures(o.side),
          trade: parsetOrderTradeSide(o.side),
          type: parseOrderTypeFutures(o.orderType),
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

  /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#get-order-details Get order details - SPOT } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-order-details Get order details - FUTURES } */
  async getOrder(params: GetOrderRequest): Promise<any> {
    // async getOrder(params: GetOrderRequest): Promise<Order> {
    const { baseAsset, quoteAsset } = params.symbol;
    const bitgetSymbol = this.getSymbolProduct(params.symbol);
    const paramsOrder = { symbol: bitgetSymbol, marginCoin: quoteAsset };
    const error = { code: 500, message: `No s'ha pogut obtenir la order a Bitget.` };
    const url = this.market === 'spot' ? `api/spot/v1/trade/orderInfo` : `api/mix/v1/order/detail`;
    const response = await this.get(url, { params, error });
    return response;
    // return Promise.resolve<Order>({
    //   id: response.clientOrderId,
    //   exchangeId: response.orderId,
    //   side: parseOrderSide(response.side),
    //   type: parseOrderType(response.orderType),
    //   status: parseOrderStatus(response.status),
    //   symbol: this.parseSymbolProduct(response.symbol),
    //   baseQuantity: this.market === 'spot' ? +response.quantity : +response.size,
    //   // quoteQuantity?: number,
    //   price: +response.price,
    //   // stopPrice?: number,
    //   // rejectReason?: string,
    //   // isOco?: boolean,
    //   created: moment(response.cTime).format('YYYY-MM-DD HH:mm:ss').toString(),
    //   // posted?: string,
    //   // executed?: string,
    //   // syncronized?: boolean,
    //   // idOrderBuyed?: string,
    //   // profit?: number,
    //   // commission?: number,
    //   // commissionAsset?: CoinType,
    // });
  }

  // getAccountTradeList(params: GetHistoryOrdersRequest): Promise<Order[]> { return {} as any; }


  //  Trade Orders
  // ---------------------------------------------------------------------------------------------------

  /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#place-order Place order - SPOT } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#place-order Place order - Futures } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#place-stop-order Place Stop Order - Futures } */
  async postOrder(params: PostOrderRequest): Promise<Order> {
    const bitgetSymbol = this.getSymbolProduct(params.symbol);
    if (this.market === 'spot') {
      const paramsOrder = {
        symbol: bitgetSymbol,
        side: formatOrderSide(params.side),
        orderType: formatOrderType(params.type),
        force: 'normal',
        price: +params.price,
        quantity: +params.quantity,
        clientOrderId: params.id
      };
      const error = { code: 500, message: `No s'ha pogut enviar la order en spot a Bitget.` };
      const response = await this.post(`api/spot/v1/trade/orders`, { params: paramsOrder, error });
      const order: Order = { status: 'new', exchangeId: response.data.orderId, ...params };
      return order;
    } else {
      const baseAsset = this.isTest ? `S${params.symbol.baseAsset}` : params.symbol.baseAsset;
      const quoteAsset = this.isTest ? `S${params.symbol.quoteAsset}` : params.symbol.quoteAsset;
      let paramsOrder: any = {
        symbol: bitgetSymbol,
        marginCoin: quoteAsset,
        size: +params.quantity,
        clientOid: params.id,
        side: formatOrderTradeSide(params.side, params.trade),
        timeInForceValue: 'normal',
      };
      if (params.type === 'limit' || params.type === 'market') {
        if (params.type === 'limit') { paramsOrder = { ...paramsOrder, price: params.price }; }
        paramsOrder = { ...paramsOrder, orderType: formatOrderType(params.type) };
        const error = { code: 500, message: `No s'ha pogut enviar la order en futures a Bitget.` };
        const response = await this.post(`api/mix/v1/order/placeOrder`, { params: paramsOrder, error });
        const order: Order = { status: 'new', exchangeId: response.data.orderId, ...params };
        return order;

      } else {
        paramsOrder = { ...paramsOrder, executePrice: +params.price, };
        if (params.type === 'stop' || params.type === 'stop_loss_limit') {
          paramsOrder = { ...paramsOrder, triggerPrice: +params.stopPrice, orderType: 'limit', triggerType: 'fill_price' };
        }
        if (params.type === 'stop_market') {
          paramsOrder = { ...paramsOrder, triggerPrice: +params.stopPrice, orderType: 'market', triggerType: 'market_price' };
        }

        const error = { code: 500, message: `No s'ha pogut enviar la order de stop en futures a Bitget.` };
        const response = await this.post(`api/mix/v1/plan/placePlan`, { params: paramsOrder, error });
        const order: Order = { status: 'new', exchangeId: response.data.orderId, ...params };
        return order;
      }
    }
  }

  /** {@link https://bitgetlimited.github.io/apidoc/en/spot/#cancel-order cancel order - SPOT } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#cancel-order Cancel order - Futures } */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#cancel-plan-order-tpsl Cancel Plan Order (TPSL) - Futures } */
  async cancelOrder(params: CancelOrderRequest): Promise<any> {
    const bitgetSymbol = this.getSymbolProduct(params.symbol);
    if (this.market === 'spot') {
      const quoteAsset = this.isTest ? `S${params.symbol.quoteAsset}` : params.symbol.quoteAsset;
      const paramsOrder = {
        symbol: bitgetSymbol,
        orderId: params.exchangeId
      };
      const error = { code: 500, message: `No s'ha pogut cancelar la order en spot a Bitget.` };
      const response = await this.post(`api/spot/v1/trade/cancel-order`, { params: paramsOrder, error });
      const order: any = { status: 'new', id: response.data.clientOid, ...params };
      return order;
    } else {
      const quoteAsset = this.isTest ? `S${params.symbol.quoteAsset}` : params.symbol.quoteAsset;
      let paramsOrder: any = {
        symbol: bitgetSymbol,
        marginCoin: quoteAsset,
        orderId: params.exchangeId
      };
      if (params.triggered) { paramsOrder = { ...paramsOrder, planType: 'normal_plan' }; }
      const error = { code: 500, message: `No s'ha pogut cancelar la order en spot a Bitget.` };
      const response = await this.post(params.triggered ? `api/mix/v1/plan/cancelPlan` : `api/mix/v1/order/cancel-order`, { params: paramsOrder, error });
      // if (response.message === 'success') {
      //   const order: Order = { status: 'cancel', id: response.data.clientOid, ...params };
      //   return order;
      // } else {
      //   const order: any = { status: 'rejected', id: response.data.clientOid, ...params };
      //   return order;

      // }
    }
  }

  // async cancelAllSymbolOrders(symbol: SymbolType, orders?: Order[]): Promise<Order[]> {
  //   const bitgetSymbol = this.getSymbolProduct(symbol);
  //   const results: Order[] = [];
  //   const orderIds: any[] = [];
  //   const responseOrderCanceled: any[] = [];
  //   const responseOrderFailed: any[] = [];
  //   if (orders === undefined) { orders = await this.getOpenOrders(symbol); }
  //   if (orders && orders.length > 0) {
  //     if (this.market === 'spot') {
  //       orders.map(o => orderIds.push(o.exchangeId));
  //       const error = { code: 500, message: `No s'ha pogut cancelar les order en spot a Bitget.` };
  //       const response = await this.post(`api/spot/v1/trade/cancel-batch-orders`, { params: { symbol: bitgetSymbol, orderIds }, error });
  //       const params = { symbol: bitgetSymbol, orderIds };
  //     } else {
  //       const orderNormal = orders.filter(o => o.type === 'market' || o.type === 'limit');
  //       if (orderNormal && orderNormal.length > 0) {
  //         orderNormal.map(o => orderIds.push(o.exchangeId));
  //         const error = { code: 500, message: `No s'ha pogut cancelar les order en spot a Bitget.` };
  //         const marginCoin = this.isTest ? `S${symbol.quoteAsset}` : symbol.quoteAsset;
  //         const params = { symbol: bitgetSymbol, marginCoin, orderIds };
  //         const response = await this.post(`api/mix/v1/order/cancel-batch-orders`, { params, error });
  //         if (response.data && response.data.order_ids) { 
  //           response.data.order_ids.map(id => {
              
  //           });
  //           orders.map(o => { o.status = 'cancel'; return o; });
  //           responseOrderCanceled.push(...(response.data.order_ids)); 
  //         } 
  //         if (response.data && response.data.fail_infos) { responseOrderFailed.push(...(response.data.fail_infos)); } 
  //       }
  //       const orderPlan = orders.filter(o => o.type !== 'market' && o.type !== 'limit');
  //       if (orderPlan && orderPlan.length > 0) {
  //         Promise.all(orderPlan.map(async o => {
  //           orderIds.push(o.exchangeId);
  //           /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#cancel-plan-order-tpsl} Limit rule: 10 times/1s (uid) */
  //           setTimeout(async () => {
  //             const response = await this.cancelOrder({ symbol, exchangeId: o.exchangeId, triggered: true });
  //             // if (response && response.status === 'cancel') { responseOrderCanceled.push(...(response.exchangeId)); } 
  //             // if (response && response.status === 'rejected') { responseOrderFailed.push(...(response.exchangeId)); } 
  //           }, 3600 / 10);
  //         }));
  //       }
  //     }
  //   }
  //   return Promise.resolve();
  // }
}