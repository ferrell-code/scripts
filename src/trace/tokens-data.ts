import { readFileSync, writeFileSync } from 'fs'

import '@acala-network/types'
import '@acala-network/type-definitions'

import { Wallet } from '@acala-network/sdk/wallet'
import { encodeAddress } from '@polkadot/util-crypto'
import { fetchEntriesToArray } from '@open-web3/util'

import { formatBalance, table } from '../log'
import runner from '../runner'
import { assert } from 'console'
import util from 'util'

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
    const acalaSS58 = 10;

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

    const hexModules = [
        "0x6d6f646c6163612f6c6f616e0000000000000000000000000000000000000000",
        "0x6d6f646c6163612f636470650000000000000000000000000000000000000000",
        "0x6d6f646c6163612f636470740000000000000000000000000000000000000000",
        "0x6d6f646c6163612f63706f740000000000000000000000000000000000000000",
        "0x6d6f646c6163612f6465786d0000000000000000000000000000000000000000",
        "0x6d6f646c6163612f686f6d610000000000000000000000000000000000000000",
        "0x6d6f646c6163612f686d74720000000000000000000000000000000000000000",
        "0x6d6f646c6163612f687a74720000000000000000000000000000000000000000",
        "0x6d6f646c6163612f696e63740000000000000000000000000000000000000000",
        "0x6d6f646c6163612f747273790000000000000000000000000000000000000000",
        "0x6d6f646c6163612f726576650000000000000000000000000000000000000000",
        "0x6d6f646c6163612f75726c730000000000000000000000000000000000000000",
        "0x6d6f646c6e7574732f7374610000000000000000000000000000000000000000"
    ] as string[]

    const moduleAccounts = hexModules.map((val) => encodeAddress(val, acalaSS58))

    const parachain = {
      Moonbeam: '23UvQ3ZQXJ5LfTUSYkcRPkQX2FHgcKxGmqdxYJe9j5e3Lwsi',
      Astar: '23UvQ3ZQvYBhhhL4C1Zsn7gfDWcWu3pWyG5boWyGufhyoPbc',
      Interlay: '23UvQ3ZW8hcRCoT3YMznntJVjwqLeS5hXjpxDHFtHJbBgj1A',
    } as Record<string, string>

    const exchanges = {
        Kucoin: '23DhqhsKDDpFnH2GreWy7Sk4dqUmGCCVPGk5Lpr84jxzBh5T',
        Binance: '26JqMKx4HJJcmb1kXo24HYYobiK2jURGCq6zuEzFBK3hQ9Ti',
        Cex1: '221r454cYfBePBwyMLL5QhdijGQaXrLvqKDp5cCBtMTTXWWH',
        Cex2: '24i2G8sM8Nqki95y5AafBZoS1EjvVrKSekA93sooNJ8sDtjJ',
        Cex3: '211Z8Zpc6Hg7y7dXHzDoYxQHUJJFanesdLe7vaCDJZRDPnXJ',
        Cex4: '25dmVuiPEJVLBkzqVGmjyLQhGNTJq3LaQpwJsTg8dS5z2yGL'
    }

    const generalCouncil = [
        '23RDJ7SyVgpKqC6M9ad8wvbBsbSr3R4Xqr5NQAKEhWPHbLbs',
        '249QskFMEcb5WcgHF7BH5MesVGHq3imsUACq2RPgtBBdCPMa',
        '263KsUutx8qhRmG7hq6fEaSKE3fdi3KeeEKafkAMJ1cg1AYc',
        '26QUMaYNWGyZVJhGCq22wLAkTA2YEx3LrVo1FExJsrjHgrvX',
        '26SUM8AN5MKefKCFiPDapUcQwHNfNzWYMyfUSVcqiFV2JYWc',
        '26VNG6LyuRag3xfuck7eoAjKk4ZLg9GeN6LDjxMw4ib3E8yg',
    ] as string[]

    const masterList = moduleAccounts.concat(Object.values(parachain)).concat(Object.values(exchanges)).concat(generalCouncil)

    const hardcodedMasterList = [
        '23M5ttkmR6KcoCvrNZsA97DQMPxQmqktF8DHYZSDW4HLcEDw', // Module accounts
        '23M5ttkmR6KcnvsNJKoKoYzMBRX23jj5m7qcExWfe5hsGBEJ',
        '23M5ttkmR6KcnvsNJdmYTpLo9xfc54g8uCk55buDfiJPon69',
        '23M5ttkmR6KcnvxCGaueuxSnUmxG9ruKBibH6i1yszogd348',
        '23M5ttkmR6KcnxentoqchgBdUjzMDSzFoUyf5qMs7FsmRMvV',
        '23M5ttkmR6Kco5pqN691bGfU3BhfU6QPG9arw6SR1XpNuQqu',
        '23M5ttkmR6Kco5p3LFGKMpMv4zvLkKdUQWW1wGGoV8zDX3am',
        '23M5ttkmR6Kco5uGj64jEZbG6PYyZSwvjeoeUVTMqQEG71yu',
        '23M5ttkmR6Kco7bReRDve6bQUSAcwqebatp3fWGJYb4hDSDJ',
        '23M5ttkmR6KcoTAAE6gcmibnKFtVaTP5yxnY8HF1BmrJ2A1i',
        '23M5ttkmR6KcoPWv3spZT4dLSyv87w8fQ8EzBjbyXUZXwmze',
        '23M5ttkmR6KcoUwA7NqBjLuMJFWCvobsD9Zy95MgaAECEhit',
        '23M5ttkp2zdM8qa6LFak4BySWZDsAVByjepAfr7kt929S1U9',
        '23UvQ3ZQXJ5LfTUSYkcRPkQX2FHgcKxGmqdxYJe9j5e3Lwsi',// Moonbeam
        '23UvQ3ZQvYBhhhL4C1Zsn7gfDWcWu3pWyG5boWyGufhyoPbc',// Astar
        '23UvQ3ZW8hcRCoT3YMznntJVjwqLeS5hXjpxDHFtHJbBgj1A',// interlay
        '23DhqhsKDDpFnH2GreWy7Sk4dqUmGCCVPGk5Lpr84jxzBh5T',// Kucoin
        '26JqMKx4HJJcmb1kXo24HYYobiK2jURGCq6zuEzFBK3hQ9Ti',// Binance
        '221r454cYfBePBwyMLL5QhdijGQaXrLvqKDp5cCBtMTTXWWH',// CEX
        '24i2G8sM8Nqki95y5AafBZoS1EjvVrKSekA93sooNJ8sDtjJ',// CEX
        '211Z8Zpc6Hg7y7dXHzDoYxQHUJJFanesdLe7vaCDJZRDPnXJ',// CEX
        '25dmVuiPEJVLBkzqVGmjyLQhGNTJq3LaQpwJsTg8dS5z2yGL',// CEX
    ]

    const accountsFile = __dirname + '/accountsInterest.json'

    const accountsList: any[] = JSON.parse(readFileSync(accountsFile, 'utf8'))
    const filteredAccounts = accountsList.filter((val) => !masterList.includes(val));


    const queryData = async (block: number, addresses: string[]) => {
       const apiAt = await api.at(await api.rpc.chain.getBlockHash(block))

       const tokenVals = addresses.map(async (address) => {
          const native = (await apiAt.query.system.account(address)).data.free

          return {address, native: formatBalance(native)}
        });

        return Promise.all(tokenVals)
    }

});
