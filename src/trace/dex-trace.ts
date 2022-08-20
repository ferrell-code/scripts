import { readFileSync, writeFileSync } from 'fs'

import '@acala-network/types'
import '@acala-network/type-definitions'

import { Wallet } from '@acala-network/sdk/wallet'

import { formatBalance, table } from '../log'
import runner from '../runner'
import { assert } from 'console'
import util from 'util'
import { Json } from '@polkadot/types-codec'

runner()
  .requiredNetwork(['acala'])
  .atBlock()
  .withApiPromise()
  .run(async ({ api, apiAt }) => {
    console.log(`
    iBTC trace
    `)

    const beforeBlock = 1638215
    const afterBlock = 1639493
    const blockNow = (await apiAt.query.system.number()).toNumber()

    const wallet = new Wallet(api)
    const stableCurrency = await wallet.getToken(api.consts.cdpEngine.getStableCurrencyId)

    const tokenDecimal = {
      ACA: 12,
      AUSD: 12,
      DOT: 10,
      INTR: 10,
      IBTC: 8,
    } as Record<string, number>

    const mintAddresses = [
      '24QGpzBVqBi1Tvhsc3Ma6W3zGx8qLspeQRcP7vxZgu7FC6vD',
      '25T7sudwmcreZicVx21j3pfdchfQmd6eksa6Y1fP8ABxfP5H',
      '21qmc3rRScZyH5JyiUntmM5GaRfef3rgQQPFUNY9R6seCeNC',
      '24MdTYGN3BDVNRGowPva9tvewYFSUTJ3gxhpBQhxYGu8TJwS',
      '24zbvu8D2iPdB1bmTMjLKDgmLFphWmrsXfFfdMFmJkw3FB7D',
      'zvELhACn7LNjQ8UtSQj6qdiqWCi5TAVTD7e4pK47tJzpFVB',
      '23eCXs2tg7xv2btSHtb3m79eiN96KZtQ6GMpWpg6EKDQnKB2',
      '23YqfEJB8zMWi8egFcYmCwa6cv4xQQVQdonAwqH9b5NPbWeK',
      '24ruSUsgoPMRZxcdTiBagt45HdJbHGgcAsaU82ozy4PXb3CJ',
      '26JmEcghNmggvT46sojckg34Py9zFRKkCcFy3gr49hrFgT2k',
      '24JxgR7Qph4h1JE2rarvcjLAuJ5ZCRRU3UDHBF8Swuan8YW1',
      '253pFTg22JqHbLeLZupexGMDUuXAJLfEriTYkFqvGWPuwcFi',
      '23bmUgSeKMD8Y9triphPw5YHuiz3QUJNqcbmb3Eg9QMQDMWN',
      '21S9fju5jSp4FWeT1RNQs6MmvfLUc1PoqRivaPNVku6K64oJ',
      '23zjkju8pxHtm8b26ntsZHjWUaV3LNRc5YDoYAz6ZfVKHUmn',
      '21NfhGCx9suuJAtQeC8eSCggFsfvDcysyNvgWXV5Sag6owAS',
    ] as string[]

    const linkedAddresses = [
      '21BZxNXVHK7JymKGnPPW9wNmQNJYTXhM2CftUsoGPpbfXtks',
      '26MJJCHK6NrnRfxNDXyQfiK6ksUCV7VsHf7jhnmhBp2kv3g5',
      '24at2teh82wYYrYfRy24wbLXzsx6PsbwknRARtJWhfP7D8nG',
      '24iqn1Y3EP5qEYNsn3xa5RViDkuqZ96vRUcdyXzCPsvhAiWS',
      '23vadonBVJHVcmvFxKFJk9wMrJovrZX872bUoCpu1HUSppLL',
      'zup4jAepDp2W6qG7NbRsoPa8hXdqiS27sqR2rwWZQ6t5PBi',
      '21pmwLgPfRhiyRkTzhdLhn8hvQwdeEcLcRUYpfRNGg36wxRj',
      '21L82ErDqiroU6SLx8ymeS5zaZxykH8bA5cQnhvWSL46a2GQ',
      '25op15Gh4hS2NvYRhxiC2j44q2mfGJUiFyz42XY9qqQT8jCM',
      '24Y9vLUXwKL8wWGaJjYiJ8nEhjEPC61TFHT1mYJKHSvoS4uc',
      '22vfFfhbVhoynjPYHEvg1QRpozx78r6PvNC16aQKDP1fA6rQ',
      '26YvA4eQkGf6NtTYDQ53VhpGgPq1wY2yp9iXP3PY8yTeY4nC',
      '23WGC8YAapwLxz1jpw44NW4VhaQ851KA8d165yahhdWkRJRx',
      '263cUSPicxPXUD1CgHn81KjLpeCFubzm1EqsFu6bpPZKrpDp',
    ] as string[]

    const parachain = {
      Moonbeam: '23UvQ3ZQXJ5LfTUSYkcRPkQX2FHgcKxGmqdxYJe9j5e3Lwsi',
      Astar: '',
      Interlay: '',
    } as Record<string, string>

    const pathDex = __dirname + '/dex-events.json'
    const pathIncentives = __dirname + '/incentives-events.json'

    const dexData: any[] = JSON.parse(readFileSync(pathDex, 'utf8'))
    const incentivesData: any[] = JSON.parse(readFileSync(pathIncentives, 'utf-8'))
    const successfulDex = dexData.filter((val) => val.result != 0)
    const successfulIncentives = incentivesData.filter((val) => val.result != 0)
    const allTx = successfulDex.concat(successfulIncentives)

    const accountList = new Set<string>()
    for (const info of allTx) {
      if (info.signer != undefined) {
        accountList.add(info.signer)
      }
    }

    const queryData = async (block: number, address: string) => {
      const apiAt = await api.at(await api.rpc.chain.getBlockHash(block))
      let ausdData = await apiAt.query.tokens.accounts(address, stableCurrency.toCurrencyId(api))
      return BigInt(ausdData.free.toString())
    }

    let accountsAUSD = [] as { who: string; after: bigint; before: bigint; diff: bigint }[]
    for (const who of accountList) {
      const beforeAUSD = await queryData(beforeBlock, who)
      const nowAUSD = await queryData(blockNow, who)
      const diffAUSD = nowAUSD - beforeAUSD
      console.log(diffAUSD)
      accountsAUSD.push({ who: who, after: nowAUSD, before: beforeAUSD, diff: diffAUSD })
    }

    const totalDiffAUSD = accountsAUSD.reduce((prev, curr) => {
      return prev + curr.diff
    }, BigInt(0))

    table(accountsAUSD)
    console.log('totalAUSD accounted for: ', formatBalance(totalDiffAUSD))

    const json = JSON.stringify(accountList, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2)
    writeFileSync('ausdAccounts.json', json)

    /*
    // Clean all calls into their respective modules
    const dexTxs = successfulDex.filter((val) => val.section == 'dex');
    const transactionFeeTxs = successfulDex.filter((val) => val.section == 'transactionPayment');
    const aggregatedDexTxs = successfulDex.filter((val) => val.section == 'aggregatedDex');
    const honzonTxs = successfulDex.filter((val) => val.section == 'honzon');
    const cdpEngineTxs = successfulDex.filter((val) => val.section == 'cdpEngine');
    const utilityTxs = successfulDex.filter((val) => val.section == 'utility');
    const democracyTxs = successfulDex.filter((val) => val.section == 'democracy');
    const vestingTxs = successfulDex.filter((val) => val.section == 'vesting');

    //console.log(util.inspect(transactionFeeTxs, {showHidden: false, depth: null, colors: true}))
    const filteredTxs = [dexTxs, transactionFeeTxs, aggregatedDexTxs, honzonTxs, cdpEngineTxs, utilityTxs, democracyTxs, vestingTxs]

    let lenSum = 0
    for (const i of filteredTxs) {
        //console.log("section:",i[0].section);
        //console.log(i.length, "\n");
        lenSum += i.length;
    }
    //console.log("Total calls that emitted dex events:", lenSum)
    assert(lenSum == successfulDex.length);

    // dex module data
    const swapExactSupplyCalls = dexTxs.filter((val) => val.method == 'swapWithExactSupply')
    const swapExactTargetCalls = dexTxs.filter((val) => val.method == 'swapWithExactTarget')
    const addLiquidityCalls = dexTxs.filter((val) => val.method == 'addLiquidity')
    const removeLiquidityCalls = dexTxs.filter((val) => val.method == 'removeLiquidity')
    const endProvisioningCall = dexTxs.filter((val) => val.method == 'endProvisioning')
    const filteredDexCalls = [swapExactSupplyCalls, swapExactTargetCalls, addLiquidityCalls, removeLiquidityCalls, endProvisioningCall]

    const dexLen = filteredDexCalls.reduce(function (prev, curr) {
        return prev + curr.length
    }, 0)
    assert(dexLen == dexTxs.length);

    // Aggregated dex swap data
    const aggSwapSupply = aggregatedDexTxs.filter((val) => val.method == 'swapWithExactSupply');
    const aggSwapTarget = aggregatedDexTxs.filter((val) => val.method == 'swapWithExactTarget');
    const filteredAggCalls = [aggSwapSupply, aggSwapTarget]

    const aggLen = filteredAggCalls.reduce(function (prev, curr) {
        return prev + curr.length
    }, 0)
    assert(aggLen == aggregatedDexTxs.length);

    // Honzon data
    const honzonSwapDex = honzonTxs.filter((val) => val.method == 'closeLoanHasDebitByDex')
    assert(honzonSwapDex.length == honzonTxs.length)

    // Utility batch
    const batchAll = utilityTxs.filter((val) => val.method == 'batchAll');
    const batch = utilityTxs.filter((val) => val.method == 'batch');

    const batchSwapExactSupply = batch.filter((val) => val.params.calls[0].method == 'swapWithExactSupply')
    const batchAddLiquidity = batch.filter((val) => val.params.calls[0].method == 'addLiquidity')
    const batchAllSwapExactSupply = batchAll.filter((val) => val.params.calls[0].method == 'swapWithExactSupply')
    const batchAllSwapExactTarget = batchAll.filter((val) => val.params.calls[0].method == 'swapWithExactTarget')
    const batchAllAddLiquidity = batchAll.filter((val) => val.params.calls[0].method == 'addLiquidity')
    const batchAllWithdrawDexShare = batchAll.filter((val) => val.params.calls[0].method == 'withdrawDexShare')
    const batchAllRequestRedeem = batchAll.filter((val) => val.params.calls[0].method == 'requestRedeem')
    const filteredBatch = [batchSwapExactSupply, batchAddLiquidity, batchAllSwapExactSupply, batchAllAddLiquidity, batchAllWithdrawDexShare, batchAllSwapExactTarget, batchAllRequestRedeem]

    const batchLen = filteredBatch.reduce(function (prev, curr) {
        return prev + curr.length
    }, 0)
    assert(batchLen == utilityTxs.length);

    // Transaction Payment Calls data
    const withFeePath = transactionFeeTxs.filter((val) => val.method == 'withFeePath');
    const withFeeCurrency = transactionFeeTxs.filter((val) => val.method == 'withFeeCurrency');

    // Both transactions are addLiquidity
    const feeCurrencyAddLiquidity = withFeeCurrency;

    const feePathCurrenciesTransfer = withFeePath.filter((val) => val.params.call.section == 'currencies' && val.params.call.method == 'transfer')
    const feePathDexSwapSupply = withFeePath.filter((val) => val.params.call.section == 'dex' && val.params.call.method == 'swapWithExactSupply')
    const feePathUtilities = withFeePath.filter((val) => val.params.call.section == 'utility')
    // Three are swap with exact supply and then add Liquidity
    const feePathUtilitiesSwap = feePathUtilities;

    const filteredFeeTx = [feePathCurrenciesTransfer, feePathDexSwapSupply, feePathUtilitiesSwap, feeCurrencyAddLiquidity];

    const feeTxLen = filteredFeeTx.reduce((prev, curr) => {
        return prev + curr.length
    }, 0)
    assert(feeTxLen == transactionFeeTxs.length);

    /*
    const beforeBlock = 1638215
    const afterBlock = 1639493
    const blockNow = (await apiAt.query.system.number()).toNumber()

    const wallet = new Wallet(api)

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

    const stableCurrency = await wallet.getToken(api.consts.cdpEngine.getStableCurrencyId)

    const queryData = async (block: number, address: string) => {
      const apiAt = await api.at(await api.rpc.chain.getBlockHash(block))
      let ausdData = await apiAt.
      return BigInt(ausdData.free.toString())
    }*/
  })
