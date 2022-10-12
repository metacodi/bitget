import axios, { AxiosError, AxiosRequestConfig } from "axios";

import { Terminal } from "@metacodi/node-utils";


class TestErr {

  async axiosRequest(symbol: string) {
    const method = 'GET';
    const url = `https://api.bitget.com/api/spot/v1/public/product?symbol=${symbol}`;
    const config: AxiosRequestConfig<any> = {
      method,
      url,
      headers: {
        ['Content-Type']: 'application/json',
        ['Locale']: 'en-US',
      },
      // timeout: 1000 * 60 * 5, // 5 min.
    };

    return axios(config).then(response => {
      // console.log(config.url, response);
      if (response.status !== 200) { throw response; }
      return response.data;
    }).catch(e => {
      return this.parseException(e, url);
    });

  }

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
    };
  }

  errMethod() {
    throw 'Excepció provocada per errMethod!';
  }

  metode(): Promise<any> {
    return new Promise<any>(async (resolve: any, reject: any) => {
      try {
        const results: any[] = await Promise.all(['BTCUSDT_SPBL', 'BTCUSDT_SPBL'].map(async symbol => {
          const response = await this.axiosRequest(symbol);
          return response.data;
        }));
        resolve(results);

      } catch (error) {
        reject(error);
      }
    });
  }
}

const testApi = async () => {
  try {

    Terminal.title(`Test captura d'errors`)

    const test = new TestErr();

    const res = await test.metode();
    // const res = await test.axiosRequest();
    console.log(res);

    // throw `Excepció provocada!`;

  } catch (error) {
    Terminal.error(error);
  }
};

testApi();
