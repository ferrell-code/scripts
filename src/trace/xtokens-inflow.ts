/* eslint-disable @typescript-eslint/no-unsafe-return */
import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { gql, request } from 'graphql-request'
import { u8aToHex } from '@polkadot/util'
import { WalletPromise } from '@acala-network/sdk-wallet'

import { Token } from '@acala-network/sdk-core'
import { formatBalance, table } from '../log'
import runner from '../runner'
import { AcalaPrimitivesCurrencyCurrencyId } from '@acala-network/types/interfaces/types-lookup'

const ss58Prefix = 10

runner()
  .requiredNetwork(['acala'])
  .withApiPromise()
  .run(async ({ api }) => {
    const beforeBlock = 1638215
    // const afterBlock = 1639493
    const tokenNames = {
      '{"token":"ACA"}': 'ACA',
      '{"token":"AUSD"}': 'AUSD',
      '{"token":"DOT"}': 'DOT',
      '{"token":"LDOT"}': 'LDOT',
      '{"liquidCrowdloan":13}': 'LCDOT',
      '{"foreignAsset":3}': 'iBTC',
      '{"foreignAsset":4}': 'INTR',
      '{"stableAssetPoolToken":0}': 'tDOT',
      '{"dexShare":[{"token":"AUSD"},{"foreignAsset":3}]}': 'AUSD/iBTC',
      '{"dexShare":[{"token":"AUSD"},{"foreignAsset":4}]}': 'AUSD/INTR',
      '{"dexShare":[{"token":"AUSD"},{"liquidCrowdloan":13}]}': 'AUSD/LCDOT',
      '{"dexShare":[{"token":"ACA"},{"token":"AUSD"}]}': 'ACA/AUSD',
      '{"dexShare":[{"token":"AUSD"},{"token":"LDOT"}]}': 'AUSD/LDOT',
      '{"dexShare":[{"token":"DOT"},{"liquidCrowdloan":13}]}': 'DOT/LCDOT',
    } as Record<string, string>

    const query = gql`
        query q($evt: String, $name: String) {
            events(
            where: {
                name_eq: $evt,
                block: {height_gte: ${beforeBlock}},
                call: {name_eq: $name}
            }
            ) {
            extrinsic {
                hash
            }
            block {
                height
                hash
            }
            args
            }
        }
    `

    const wallet = new WalletPromise(api)
    const nativeCurrency = wallet.getToken(api.consts.currencies.getNativeCurrencyId)

    const inflowTokens = await request('https://acala.explorer.subsquid.io/graphql', query, {
        evt: 'Tokens.Deposited',
        name: 'ParachainSystem.set_validation_data'
    })
    const inflowTokensEvents = inflowTokens.events;

    const inflowNative = await request('https://acala.explorer.subsquid.io/graphql', query, {
        evt: 'Balances.Deposit',
        name: 'ParachainSystem.set_validation_data'
    })
    const inflowNativeEvents = inflowNative.events;

    type inflow = {who: string, amount: bigint, token: string}
    const inflowNativeFormat: inflow[] = inflowNativeEvents.map((val: any) => {
        return {
            who: encodeAddress(val.args.who, ss58Prefix),
            amount: BigInt(val.args.amount),
            token: '{"token":"ACA"}',
        }
    })

    const inflowTokenFormat: inflow[] = inflowTokensEvents.map((val: any) => {
        return {
            who: encodeAddress(val.args.who, ss58Prefix),
            amount: BigInt(val.args.amount),
            token: convertToId(val.args.currencyId.__kind, val.args.currencyId.value)
        }
    })

    function convertToId(kind: string, value: any) {
        if (kind == 'Token') {
            return `{"token":"${value.__kind}"}`
        } else if (kind == 'ForeignAsset') {
            return `{"foreignAsset":${value}}`
        } else {
            return 'error'
        }
    }

    // hardcode length of address
    const lengthAddress = 48;
    const totalInflow = {} as Record<string, bigint>;

    for (const inflowObj of inflowTokenFormat) {
        totalInflow[inflowObj.who + inflowObj.token] = (totalInflow[inflowObj.who + inflowObj.token] || 0n) + inflowObj.amount
    }

    const totalInflowObj = Object.entries(totalInflow).map(([info, amount]) => {
        return {
            who: info.substring(0, info.indexOf("{")),
            token: info.slice(info.indexOf("{")),
            amount: amount
        }
    })

    const ausdTotalInfo = totalInflowObj.filter((val) => val.token.includes("AUSD"));
    const sortedAusd = sortAmounts(ausdTotalInfo);
    const totalAUSDIn = sortedAusd.reduce((num, curr) => num + curr.amount, 0n)

    console.log("Total AUSD Bridged In: ", formatBalance(totalAUSDIn))

    table(sortedAusd.map((val) => {
        return {
            "Who": val.who,
            "Token": tokenNames[val.token],
            "Amount": formatBalance(val.amount),
        }
    }))


    function sortAmounts(value: {who: string, token: string, amount: bigint}[]) {
        return value.sort((a, b) => {
            if (a.amount < b.amount) {
                return 1;
            } else if (a.amount > b.amount) {
                return -1;
            } else {
                return 0;
            }
        })
    }
})
