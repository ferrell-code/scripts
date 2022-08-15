import { readFileSync } from 'fs'

import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import { FixedPointNumber } from '@acala-network/sdk-core'
import { WalletPromise } from '@acala-network/sdk-wallet'
import { fetchEntriesToArray } from '@open-web3/util'

import { formatBalance, log, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala'])
  .withApiPromise()
  .run(async ({ api }) => {
    const path = __dirname + '/events.json'

    const data: any[] = JSON.parse(readFileSync(path, 'utf8'))

    const result = data.map(({ id, who, actualAmount }: any) => ({
      id,
      who,
      amount: BigInt(actualAmount),
    }))

    const all = {} as Record<string, bigint>
    let sum = 0n

    for (const { who, amount } of result) {
      all[who] = (all[who] || 0n) + amount
      sum += amount
    }

    const beforeBlock = 1638215
    const afterBlock = 1639493

    const wallet = new WalletPromise(api)

    const tokenNames = {
      '{"token":"ACA"}': 'ACA',
      '{"token":"AUSD"}': 'AUSD',
      '{"token":"DOT"}': 'DOT',
      '{"token":"LDOT"}': 'LDOT',
      '{"liquidCrowdloan":13}': 'LDOT',
      '{"foreignAsset":3}': 'INTR',
      '{"foreignAsset":4}': 'iBTC',
      '{"stableAssetPoolToken":0}': 'tDOT',
      '{"dexShare":[{"token":"AUSD"},{"foreignAsset":3}]}': 'AUSD/INTR',
      '{"dexShare":[{"token":"AUSD"},{"foreignAsset":4}]}': 'AUSD/iBTC',
    } as Record<string, string>

    const stableCurrency = wallet.getToken(api.consts.cdpEngine.getStableCurrencyId)

    const queryData = async (block: number, addresses: string[]) => {
      const apiAt = await api.at(await api.rpc.chain.getBlockHash(block))

      const collaterals = await Promise.all(
        (
          await api.query.cdpEngine.collateralParams.keys()
        ).map(async (x) => {
          const currency = x.args[0]
          const rateValue = (await apiAt.query.cdpEngine.debitExchangeRate(currency)).unwrapOr(
            apiAt.consts.cdpEngine.defaultDebitExchangeRate
          )
          const rate = FixedPointNumber.fromInner(rateValue.toString(), 18)
          return {
            currency,
            rate,
          }
        })
      )

      return Promise.all(
        addresses.map(async (address) => {
          const native = (await apiAt.query.system.account(address)).data.free
          const tokens = await fetchEntriesToArray((startKey) =>
            apiAt.query.tokens.accounts.entriesPaged({
              args: [address],
              pageSize: 100,
              startKey,
            })
          )
          const nativeToken = wallet.getNativeToken()
          const data = [{ name: nativeToken.display, token: wallet.getNativeToken(), free: native.toBigInt() }]
          for (const [key, value] of tokens) {
            const token = wallet.getToken(key.args[1])
            const name = tokenNames[JSON.stringify(key.args[1])] || token.display
            data.push({
              name,
              token,
              free: value.free.toBigInt(),
            })
          }
          for (const { currency, rate } of collaterals) {
            const pos = await apiAt.query.loans.positions(currency, address)
            const debit = FixedPointNumber.fromInner(pos.debit.toString(), stableCurrency.decimals).mul(rate)
            if (!pos.debit.eqn(0)) {
              const token = stableCurrency
              data.push({
                name: 'Debit ' + (tokenNames[currency.toString()] || currency.toString()),
                token,
                free: BigInt(debit.toChainData()),
              })
            }
            data.push({
              name: 'Collateral ' + (tokenNames[currency.toString()] || currency.toString()),
              token: wallet.getToken(currency),
              free: pos.collateral.toBigInt(),
            })
          }
          return {
            name: address,
            data,
          }
        })
      )
    }

    const blockNow = (await api.query.system.number()).toNumber()

    const addresses = Object.keys(all)
    const dataBefore = await queryData(beforeBlock, addresses)
    const dataAfter = await queryData(afterBlock, addresses)
    const dataNow = await queryData(blockNow, addresses)

    let amountToReclaimFromBalance = 0n
    let amountToReclaimFromDebit = 0n
    const reclaimAusd = {} as Record<string, bigint>

    for (let i = 0; i < addresses.length; i++) {
      const name = addresses[i]
      const beofre = dataBefore[i]
      const after = dataAfter[i]
      const now = dataNow[i]
      const free = {} as { [key: string]: { name: string; token: any; now?: any; before?: any; after?: any } }
      for (const { name, token, free: f } of now.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }
        free[name].now = f
      }
      for (const { name, token, free: f } of beofre.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }
        free[name].before = f
      }
      for (const { name, token, free: f } of after.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }
        free[name].after = f
      }

      for (const { name: token, after, before } of Object.values(free)) {
        const diff = BigInt(after ?? 0n) - BigInt(before ?? 0n)
        if (diff > 0n) {
          if (token === 'AUSD') {
            amountToReclaimFromBalance += diff
            reclaimAusd[name] = (reclaimAusd[name] || 0n) + diff
          } else if (token.startsWith('Collateral')) {
            amountToReclaimFromDebit += diff
          }
        }
      }

      reclaimAusd[name] = reclaimAusd[name] > all[name] ? all[name] : reclaimAusd[name]

      console.log(name, formatBalance(all[name]))
      table(
        Object.values(free).map(({ name, token, now, before, after }) => ({
          name,
          now: formatBalance(now, token.decimals),
          before: formatBalance(before, token.decimals),
          after: formatBalance(after, token.decimals),
          'before diff': formatBalance((now ?? 0n) - BigInt(before ?? 0n), token.decimals),
          'after diff': formatBalance((now ?? 0n) - BigInt(after ?? 0n), token.decimals),
        }))
      )
    }

    log({
      amountToReclaimFromBalance: formatBalance(amountToReclaimFromBalance),
      amountToReclaimFromDebit: formatBalance(amountToReclaimFromDebit),
      total: formatBalance(amountToReclaimFromBalance + amountToReclaimFromDebit),
    })

    console.log('Total', formatBalance(sum))
    table(
      Object.entries(all).map(([who, amount]) => ({
        who,
        amount: formatBalance(amount, stableCurrency.decimals),
        reclaim: formatBalance(reclaimAusd[who]),
        remain: formatBalance(amount - (reclaimAusd[who] || 0n)),
      }))
    )

    const honzonTreasury = '23M5ttkmR6KcnvsNJdmYTpLo9xfc54g8uCk55buDfiJPon69'

    const proposal = api.tx.utility.batchAll(
      Object.entries(reclaimAusd).map(([who, amount]) =>
        api.tx.utility.dispatchAs(
          { system: { signed: who } },
          api.tx.currencies.transfer(honzonTreasury, stableCurrency.toChainData(), amount)
        )
      )
    )

    const proposalHash = proposal.hash

    console.log({
      proposal: proposal.toHex(),
      proposalHash: proposalHash.toHex(),
    })
  })
