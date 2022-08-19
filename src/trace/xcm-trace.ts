import { readFileSync } from 'fs'

import '@acala-network/types'
import '@acala-network/type-definitions'

import { Wallet } from '@acala-network/sdk/wallet'

import { formatBalance, table } from '../log'
import runner from '../runner'
import { assert } from 'console'

runner()
  .requiredNetwork(['acala'])
  .atBlock()
  .withApiPromise()
  .run(async ({ api, apiAt}) => {
    console.log(`
    Xtokens trace
    `)

    const tokenDecimal = {
        'ACA': 12,
        'AUSD': 12,
        'DOT': 10,
        'INTR': 10,
        'IBTC': 8,
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
      '263cUSPicxPXUD1CgHn81KjLpeCFubzm1EqsFu6bpPZKrpDp'
    ] as string[]

    const parachain = {
        'Moonbeam': '23UvQ3ZQXJ5LfTUSYkcRPkQX2FHgcKxGmqdxYJe9j5e3Lwsi',
        'Astar': '',
        'Interlay': '',
    } as Record<string, string>

    const path = __dirname + '/xtokens.json'

    const data: any = JSON.parse(readFileSync(path, 'utf8'))

    const xcmData = data.map((tx: any) => {
        return {chain: tx.xcmdest.chainIDDestName, sender: tx.xcmdest.fromAddress, reciever: tx.xcmdest.destAddress, token: tx.xcmdest.symbol, amountSent: tx.params.amount}
    });

    const dotXcm = xcmData.filter((tx: any) => tx.chain === 'Polkadot');
    const moonXcm = xcmData.filter((tx: any) => tx.chain=== 'Moonbeam');
    const interXcm = xcmData.filter((tx: any) => tx.chain === 'Interlay');
    const astarXcm = xcmData.filter((tx: any) => tx.chain === 'Astar');

    assert(xcmData.length === (dotXcm.length + moonXcm.length + interXcm.length + astarXcm.length))

    const sortedData = [dotXcm, moonXcm, interXcm, astarXcm];

    const totalAmountSent = (xcm: any[]) => {
        const tokenSum = {} as Record<string, bigint>
        for (const tx of xcm) {
            tokenSum[tx.token.toString()] =  (tokenSum[tx.token.toString()] || 0n) + BigInt(tx.amountSent);
        }
        return tokenSum
    }

    for (const data of sortedData) {
        console.log("Destination Chain: ", data[0].chain)
        const sums = totalAmountSent(data);
        const formatSums = Object.entries(sums).map(([token]) => ({
            token,
            "Sum": formatBalance(sums[token], tokenDecimal[token]),
        }))

        table(formatSums);

    }

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
