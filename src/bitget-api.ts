import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { createHmac } from 'crypto';
import { METHODS } from "http";

import { ExchangeApi, MarketType, HttpMethod, ApiOptions, ApiRequestOptions, AccountInfo, ExchangeInfo, SymbolType, MarketPrice, MarketKline, KlinesRequest, Balance, Position, MarginMode, LeverageInfo, Order, GetOrdersRequest, GetOpenOrdersRequest, GetOrderRequest, PostOrderRequest, CancelOrderRequest, AssetInfo } from '@metacodi/abstract-exchange';
// import { BitgetMarketType } from "./types/bitget.types";
// import { formatMarketType } from './types/bitget-parsers';



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
    }).catch(e => this.parseException(e, config.url));
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

  protected parseException(e: AxiosError, url: string): unknown {
    const { response, request, message } = e;
    // Si no hem rebut una resposta...
    if (!response) { throw request ? e : message; }
    throw {
      code: response.data?.code,
      message: response.data?.msg,
      body: response.data,
      headers: response.headers,
      requestUrl: url,
      requestBody: request.body,
      options: { ...this.options },
    };
  }


  // ---------------------------------------------------------------------------------------------------
  //  Market
  // ---------------------------------------------------------------------------------------------------

  getExchangeInfo(): Promise<ExchangeInfo> { return {} as any; }

  getPriceTicker(symbol: SymbolType): Promise<MarketPrice> { return {} as any; }

  getKlines(params: KlinesRequest): Promise<MarketKline[]> { return {} as any; }

  // getOrderBookTicker(params: OrderBookTickerRequest): Promise<OrderBookTicker | OrderBookTicker[]> { return {} as any; }


  // ---------------------------------------------------------------------------------------------------
  //  Account
  // ---------------------------------------------------------------------------------------------------

  /*
    {
      "marginCoin":"USDT",
      "locked":"0.31876482",
      "available":"10575.26735771",
      "crossMaxAvailable":"10580.56434289",
      "fixedMaxAvailable":"10580.56434289",
      "maxTransferOut":"10572.92904289",
      "equity":"10582.90265771",
      "usdtEquity":"10582.902657719473",
      "btcEquity":"0.204885807029"
    }
  */
  /** {@link https://bitgetlimited.github.io/apidoc/en/mix/#get-account-list Get Account List} */
  async getAccountInfo(): Promise<AccountInfo> {
    const { market } = this;
    const params = { productType: 'umcbl'};
    return this.get(`api/mix/v1/account/accounts`, { params }).then(response => {
      const data = response.data[0];
      const balances: AssetInfo[] = (response.data as any[]).map(d => ({ asset: d.marginCoin, locked: d.locked, free: d.available }));
      return {
        accountType: market,
        balances,
        // makerCommission: number;
        // takerCommission: number;
        // buyerCommission: number;
        // sellerCommission: number;
        // canTrade: boolean;
        // canWithdraw: boolean;
        // canDeposit: boolean;
        // updateTime: number;
        // permissions: MarketType[];
      } as any;
    });
  }

  getBalances(params?: { [key: string]: any }): Promise<Balance[]> { return {} as any; }

  getPositions(params?: { [key: string]: any }): Promise<Position[]> { return {} as any; }

  getLeverage(symbol: SymbolType, mode?: MarginMode): Promise<LeverageInfo> { return {} as any; }

  setLeverage(params: LeverageInfo): void { return {} as any; }


  //  Account Orders
  // ---------------------------------------------------------------------------------------------------

  getAllOrders(params: GetOrdersRequest): Promise<Order[]> { return {} as any; }

  getOpenOrders(params: GetOpenOrdersRequest): Promise<Order[]> { return {} as any; }

  getOrder(params: GetOrderRequest): Promise<Order> { return {} as any; }

  // getAccountTradeList(params: GetOrdersRequest): Promise<Order[]> { return {} as any; }


  //  Trade Orders
  // ---------------------------------------------------------------------------------------------------

  postOrder(params: PostOrderRequest): Promise<Order> { return {} as any; }

  cancelOrder(params: CancelOrderRequest): Promise<Order> { return {} as any; }

  cancelAllSymbolOrders(symbol: SymbolType): Promise<Order> { return {} as any; }


}