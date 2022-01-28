import { flow, pipe } from 'fp-ts/function'

export type Request = [url: URL, init: RequestInit]

export const getRequest = flow(newRequest, withMethod('GET'))

export const postRequest = flow(newRequest, withMethod('POST'))

export const putRequest = flow(newRequest, withMethod('PUT'))

export function withMethod(method: string) {
  return modifyRequest(() => ({ method }))
}

export const withHeader = (key: string, value: string) => withHeaders({ [key]: value })

export const withHeaders = (headers: HeadersInit) => modifyRequest(() => ({ headers }))

export const withBody = (body: BodyInit, contentType: string) =>
  modifyRequest(() => ({
    body,
    headers: { 'Content-Type': contentType },
  }))

function newRequest(url: URL): Request {
  return [url, {}]
}

function modifyRequest(f: (request: Request) => RequestInit) {
  return (request: Request): Request =>
    pipe(f(request), init => [
      request[0],
      {
        ...request[1],
        ...init,
        headers: { ...request[1].headers, ...init.headers },
      },
    ])
}
