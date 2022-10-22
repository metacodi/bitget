import { AxiosError } from "axios";
import { ExchangeApi, MarketType, HttpMethod, ApiOptions, ApiRequestOptions, AccountInfo } from '@metacodi/abstract-exchange';
import { ExchangeInfo, SymbolType, MarketPrice, MarketKline, KlinesRequest, MarginMode } from '@metacodi/abstract-exchange';
import { LeverageInfo, Order, GetOrderRequest, PostOrderRequest, CancelOrderRequest, MarketSymbol } from '@metacodi/abstract-exchange';
import { SetLeverage, GetHistoryOrdersRequest } from '@metacodi/abstract-exchange';
export declare class BitgetApi implements ExchangeApi {
    baseUrl(): string;
    options: ApiOptions;
    user_id: String;
    currencies: any[];
    symbols: any[];
    constructor(options?: ApiOptions);
    get market(): MarketType;
    get apiKey(): string;
    get apiSecret(): string;
    get apiPassphrase(): string;
    get isTest(): boolean;
    get defaultOptions(): Partial<ApiOptions>;
    setCredentials(data: {
        apiKey: string;
        apiSecret: string;
        apiPassphrase: string;
    }): void;
    get(endpoint: string, options?: ApiRequestOptions): Promise<any>;
    post(endpoint: string, options?: ApiRequestOptions): Promise<any>;
    put(endpoint: string, options?: ApiRequestOptions): Promise<any>;
    delete(endpoint: string, options?: ApiRequestOptions): Promise<any>;
    request(method: HttpMethod, endpoint: string, options?: ApiRequestOptions): Promise<any>;
    protected resolveData(method: HttpMethod, data?: {
        [key: string]: any;
    }, options?: {
        encodeValues?: boolean;
        strictValidation?: boolean;
    }): {
        query: string;
        body: string;
    };
    protected getAuthHeaders(method: string, endpoint: string, params: any): Promise<{
        [header: string]: string | number;
    }>;
    protected formatQuery(params: any): string;
    protected serialiseParams(request?: {
        [key: string]: any;
    }, options?: {
        encodeValues?: boolean;
        strictValidation?: boolean;
    }): string;
    signMessage(message: string, secret: string): Promise<string>;
    protected parseException(e: AxiosError, url: string, error: ApiRequestOptions['error']): any;
    getExchangeInfo(): Promise<ExchangeInfo>;
    getMarketSymbol(symbol: SymbolType): Promise<MarketSymbol>;
    resolveAssets(symbol: SymbolType): SymbolType;
    getSymbolProduct(symbol: SymbolType): string;
    getProductType(symbol: SymbolType): string;
    getInstrumentId(symbol: SymbolType): string;
    parseInstrumentId(instId: string): SymbolType;
    parseSymbolProduct(symbol: string): SymbolType;
    getPriceTicker(symbol: SymbolType): Promise<MarketPrice>;
    getKlines(request: KlinesRequest): Promise<MarketKline[]>;
    getAccountInfo(): Promise<AccountInfo>;
    getLeverage(symbol: SymbolType, mode?: MarginMode): Promise<LeverageInfo>;
    setLeverage(request: SetLeverage): Promise<void>;
    getHistoryOrders(request: GetHistoryOrdersRequest): Promise<Order[]>;
    getOpenOrders(symbol: SymbolType): Promise<Partial<Order>[]>;
    getOrder(request: GetOrderRequest): Promise<Partial<Order>>;
    postOrder(request: PostOrderRequest): Promise<Order>;
    cancelOrder(request: CancelOrderRequest): Promise<any>;
}
//# sourceMappingURL=bitget-api.d.ts.map