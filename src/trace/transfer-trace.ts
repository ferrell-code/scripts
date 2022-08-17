import { readFileSync } from 'fs'

import '@acala-network/types'
import '@acala-network/type-definitions'
import {
  AcalaPrimitivesCurrencyCurrencyId,
  AcalaPrimitivesTradingPair,
} from '@acala-network/types/interfaces/types-lookup'

import { FixedPointNumber, Token } from '@acala-network/sdk-core'
import { Wallet } from '@acala-network/sdk/wallet'

import { formatBalance, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala'])
  .atBlock()
  .withApiPromise()
  .run(async ({ api, apiAt}) => {
    console.log(`
    Accounts funded by 16 malicious wallets with AUSD
    `)


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

    const path = __dirname + '/currenciesEvents.json'

    const data: any[] = JSON.parse(readFileSync(path, 'utf8'))

    const result = data.map(({ id, token, sender, reciever, actualAmount }: any) => ({
      id,
      token,
      sender,
      reciever,
      amount: BigInt(actualAmount),
    }))

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

    // start of malicious transfer
    let maliciousTransfers = result.filter((data) => mintAddresses.includes(data.sender));

    let new_addresses = [] as string[];

    const moduleAccounts = [
      '23M5ttkmR6KcnxentoqchgBdUjzMDSzFoUyf5qMs7FsmRMvV',
      '23M5ttkmR6Kco7bReRDve6bQUSAcwqebatp3fWGJYb4hDSDJ',
      '23M5ttkmR6KcnxentoqchgBdUjzMDSzFoUyf5qMs7FsmRMvV', // dex module account
      '23M5ttkmR6Kco2CnDJKTSdBmBnYpbezUpTMeBsewEsjdui9F',  //aca/fees account
    ] as string[]

    // No multiple hops (don't need recursive search) these addresses only sent to Kucoin or module accounts
    // kucoin: 23DhqhsKDDpFnH2GreWy7Sk4dqUmGCCVPGk5Lpr84jxzBh5T
    for (const info of maliciousTransfers) {
      if (!new_addresses.includes(info.reciever.toString()) && !moduleAccounts.includes(info.reciever.toString())) {
        new_addresses.push(info.reciever);
      }
    }

    // This second filter will show amount sent to kucoin and module accounts
    let tracedAddresses = result.filter((data) => new_addresses.includes(data.sender));

    const kucoin = '23DhqhsKDDpFnH2GreWy7Sk4dqUmGCCVPGk5Lpr84jxzBh5T';

    let kucoinToBeBurned = BigInt(0);
    for (const data of tracedAddresses) {
      if (data.reciever == kucoin) {
        kucoinToBeBurned += data.amount;
      }
    }

    const queryData = async (block: number, address: string) => {
      const apiAt = await api.at(await api.rpc.chain.getBlockHash(block))
      let ausdData = await apiAt.query.tokens.accounts(address, stableCurrency.toCurrencyId(api));
      return BigInt(ausdData.free.toString())
    }

    // Addresses that recieved AUSD directly from 16 malicious addresses
    let tracedData: {who: string, before: bigint, now: bigint}[] = [];
    for (const address of new_addresses) {
      const beforeAmount = await queryData(beforeBlock, address);
      const currentAmount = await queryData(blockNow, address);
      if (beforeAmount != BigInt(0) || currentAmount != BigInt(0)) {
        tracedData.push({who: address, before: beforeAmount, now: currentAmount})
      }
    }

    const moonBeam = '23UvQ3ZQXJ5LfTUSYkcRPkQX2FHgcKxGmqdxYJe9j5e3Lwsi';
    console.log("List of malicious addresses that were sent minted AUSD from 16 original wallets:");
    console.log(new_addresses.filter((account) => account != moonBeam));
    console.log()

    console.log("Data relating to account that was funded by malicious account in AUSD\n");

    let totalBurned = BigInt(0);
    for (const val of tracedData) {
      const diff = (val.now) - (val.before);
      const printObj = {who: val.who, before: formatBalance(val.before), now: formatBalance(val.now), difference: formatBalance(diff)}
      if (val.who == moonBeam) {
        console.log("Moonbeam account: DO NOT BURN\n");
      }
      table(printObj);
      if (diff > BigInt(0) && val.who != moonBeam) {
        totalBurned += diff;
      }
    }

    // Dont burn moonbeam by accident
    console.log('Total AUSD to be Burned (Does not include Kucoin or Moonbeam account):', formatBalance(totalBurned), '\n');

    // AUSD sent to kucoin
    const kucoinBefore = await queryData(beforeBlock, kucoin);
    const kucoinNow = await queryData(blockNow, kucoin);
    const kucoinDiff = kucoinNow - kucoinBefore;
    console.log('Kucoin amount recieved directly from minting accounts:', formatBalance(kucoinToBeBurned));
    console.log('Kucoin AUSD Balance Now: ', formatBalance(kucoinNow));
    console.log('Kucoin AUSD Balance Before: ', formatBalance(kucoinBefore));
    // This will be different as some AUSD would be sent indirectly from minting accounts (dexs etc.)
    console.log('Kucoin Difference in AUSD: ', formatBalance(kucoinDiff));
  })
