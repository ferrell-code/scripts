/* eslint-disable @typescript-eslint/no-misused-promises */

import '@polkadot/api-augment'

import async from 'async'

import { fetchEntriesToArray } from '@open-web3/util'

import { formatBalance, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['polkadot', 'kusama'])
  .withApiPromise()
  .run(async ({ api }) => {
    const maxCommission = 0.07

    const currentEra = (await api.query.staking.currentEra()).unwrap().toNumber()
    const historyDepth = (await api.query.staking.historyDepth()).toNumber()

    const allPoints = {} as Record<string, Record<number, number> & { sum: number }>

    const removed: Set<string> = new Set()

    const queue = async.queue(async (i: number) => {
      const era = currentEra - i
      const eraValidators = await fetchEntriesToArray((startKey) =>
        api.query.staking.erasValidatorPrefs.entriesPaged({
          args: [era],
          pageSize: 500,
          startKey,
        })
      )

      for (const [key, data] of eraValidators) {
        const address = (key.toHuman() as any)[1] as string
        const commission = data.commission.toNumber() / 1e9
        const blocked = data.blocked.toHuman()

        if (commission > maxCommission) {
          removed.add(address)
          continue
        }

        if (blocked) {
          removed.add(address)
          continue
        }

        allPoints[address] = allPoints[address] || { sum: 0 }
        allPoints[address][i] = 0
      }

      const points = await api.query.staking.erasRewardPoints(era)
      for (const [addr, v] of points.individual) {
        const address = addr.toHuman()
        allPoints[address] = allPoints[address] || { sum: 0 }
        allPoints[address][i] = v.toNumber()
        allPoints[address].sum = allPoints[address].sum + v.toNumber()
      }
    }, 20)

    for (let i = 0; i <= historyDepth; i++) {
      void queue.push(i)
    }

    await queue.empty()

    // must be top 30% for overall performance
    const overallPoints = Object.entries(allPoints).map(([addr, { sum }]) => ({ addr, sum }))
    overallPoints.sort((a, b) => (b.sum || 0) - (a.sum || 0))
    overallPoints.length = Math.floor(overallPoints.length * 0.3)

    const final = overallPoints.map((x) => x.addr).filter((x) => !removed.has(x))

    table(
      await async.mapLimit(final, 20, async (x: string): Promise<any> => {
        const iden = await api.derive.accounts.identity(x)
        const seflStake = (await api.query.staking.ledger(x)).unwrapOrDefault().active.toBigInt()
        return {
          address: x,
          display: iden.displayParent ? `${iden.displayParent}/${iden.display || ''}` : iden.display,
          comission: (await api.query.staking.validators(x)).commission.toNumber() / 1e9,
          seflStake: formatBalance(seflStake),
        }
      })
    )
  })
