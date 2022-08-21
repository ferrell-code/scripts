/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Wallet } from '@acala-network/sdk/wallet'
import { gql, request } from 'graphql-request'
import { u8aToHex } from '@polkadot/util'
import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import runner from '../runner'
import { readFileSync, writeFileSync } from 'fs'
import { formatBalance } from '../log'

const ss58Prefix = 10

runner()
  .requiredNetwork(['acala'])
  .withApiPromise()
  .run(async ({ api }) => {
    const beforeBlock = 1638215
    // const afterBlock = 1639493

    const account = u8aToHex(decodeAddress('23vQQqYeDQ47ZhtZ9bEaZjAyqKV1zPjaaqHaMhwZ4A7q7ity'));
    const query = gql`
      query q($acc: JSON, $evt: String) {
        events(
          where: {
            name_eq: $evt,
            args_jsonContains: $acc,
          }
        ) {
          name
          extrinsic {
            hash
          }
          block {
            height
            hash
          }
          call {
            name
          }
          args
        }
      }
    `
    const transResult = await request('https://acala.explorer.subsquid.io/graphql', query, {
        acc: { to: account },
        evt: 'Balances.Transfer'
    })
    console.log(transResult)

    let sum = BigInt(0);
    for (const res of transResult.events) {
        sum += BigInt(res.args.amount)
    }
    console.log("total inflow: ", formatBalance(sum))

  })

/*
  "data": {
    "events": [
      {
        "id": "0001638223-000010-6bdee",
        "args": {
          "amount": "1000000000000",
          "currencyId": {
            "__kind": "Token",
            "value": {
              "__kind": "AUSD"
            }
          },
          "from": "0x6d6f646c6163612f6465786d0000000000000000000000000000000000000000",
          "to": "0xe2b3e8fbe72cfe9ab375f8d0751770160889ecbe408a7896c2841b5e10b61c10"
        }
      }*/
