# PREreview display prototype

This project is an experiment in using
[Zenodo](https://zenodo.org/) as a database for reviews, using its API to maintain and display them.

It's deliberately simplistic and doesn't cover aspects such as authorisation.

## Running it

1. Install [Node.js 16](https://nodejs.org/)
2. Get a [personal access token on the Zenodo sandbox](https://sandbox.zenodo.org/account/settings/applications/) with `deposit:actions` and `deposit:write` scopes
3. Create a `.env` file based on `.env.dist` and paste in the token
4. Run `npm ci`
5. Run `npm start`
6. Open `http://localhost:3000/` in your browser.

## Technology

It also has been a chance to try some new technologies. Like [Sciety](https://github.com/sciety/sciety) it makes heavy use of [`fp-ts`](https://gcanti.github.io/fp-ts/), but also tries out:

- [`hyper-ts`](https://denisfrezzato.github.io/hyper-ts/)
- [`fp-ts-routing`](https://gcanti.github.io/fp-ts-routing/)
- [`io-ts`](https://gcanti.github.io/io-ts/) experimental modules (`Decoder`, `Encoder` and `Codec`)
- [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces) (for incubating potential libraries)
