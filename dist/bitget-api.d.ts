import { GetOpenOrdersRequest } from '@metacodi/abstract-exchange';
import { ExchangeApi, MarketType, HttpMethod, ApiOptions, ApiRequestOptions, AccountInfo } from '@metacodi/abstract-exchange';
import { ExchangeInfo, SymbolType, MarketPrice, MarketKline, KlinesRequest, MarginMode } from '@metacodi/abstract-exchange';
import { LeverageInfo, Order, GetOrderRequest, PostOrderRequest, CancelOrderRequest, MarketSymbol } from '@metacodi/abstract-exchange';
import { SetLeverage, GetHistoryOrdersRequest } from '@metacodi/abstract-exchange';
import { ApiClient } from '@metacodi/node-api-client';
export declare class BitgetApi extends ApiClient implements ExchangeApi {
    options: ApiOptions;
    user_id: String;
    limits: any[];
    currencies: any[];
    symbols: any[];
    constructor(options?: ApiOptions);
    baseUrl(): string;
    request(method: HttpMethod, endpoint: string, options?: ApiRequestOptions): Promise<any>;
    protected getAuthHeaders(method: HttpMethod, endpoint: string, params: any): Promise<{
        [header: string]: string | number;
    }>;
    get market(): MarketType;
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
    getApiKeyInfo(): Promise<AccountInfo>;
    getAccountInfo(): Promise<AccountInfo>;
    getLeverage(symbol: SymbolType, mode?: MarginMode): Promise<LeverageInfo>;
    setLeverage(request: SetLeverage): Promise<void>;
    getHistoryOrders(request: GetHistoryOrdersRequest): Promise<Order[]>;
    getOpenOrders(request: GetOpenOrdersRequest): Promise<Partial<Order>[]>;
    getOrder(request: GetOrderRequest): Promise<Partial<Order>>;
    postOrder(request: PostOrderRequest): Promise<Order>;
    cancelOrder(request: CancelOrderRequest): Promise<any>;
}
//# sourceMappingURL=bitget-api.d.ts.map