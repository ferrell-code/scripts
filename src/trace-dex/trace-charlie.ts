
import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'


import { formatBalance, table } from '../log'
import runner from '../runner'
import { BN } from 'bn.js'
import { Wallet } from '@acala-network/sdk'

runner()
  .requiredNetwork(['acala'])
  .withApiPromise()
  .run(async ({ api }) => {
    console.log(`
    Pools diff pre and post incident
`)
    const beforeBlock = 1638215;
    const afterBlock = 1639493;
    const wallet = new Wallet(api);

    const queryData = async (block: number) => {
        const apiAt = await api.at(await api.rpc.chain.getBlockHash(block))

        const liquidity = await apiAt.query.dex.liquidityPool.entriesPaged({args:[], pageSize: 50});
        let data = [];

        for (const [tradingPair, pool] of liquidity) {
            const tokens = tradingPair.args[0];

            const token1Liquid = pool[0];
            const token2Liquid = pool[1];
            data.push({tokens, amount1: token1Liquid, amount2: token2Liquid});
        }

        return data;
    }

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

    const blockNow = (await api.query.system.number()).toNumber();


    const poolDataNow = await queryData(blockNow);
    const poolDataBefore = await queryData(beforeBlock);
    const poolDataAfter = await queryData(afterBlock);

    let ausdSum = new BN(0);
    let iBTCPool = new BN(0);
    for (let i = 0; i < poolDataNow.length; i++) {
        const poolNow = poolDataNow[i];
        const now1 = poolNow.amount1;
        const now2 = poolNow.amount2;

        const poolBefore = poolDataBefore[i];
        const before1 = poolBefore.amount1;
        const before2 = poolBefore.amount2;

        const diff1 = now1.sub(before1);
        const diff2 = now2.sub(before2);

        const token1 = poolNow.tokens[0];
        const token2 = poolNow.tokens[1];

        if (token1.toString() == '{"token":"AUSD"}') {
            if (token2.toString() != '{"foreignAsset":3}') {
                ausdSum = ausdSum.add(diff1);
            }
        } else if (token2.toString() == '{"token":"AUSD"}') {
            ausdSum = ausdSum.add(diff2);
        }

        console.log(`Pool Id: ${tokenNames[poolNow.tokens[0].toString()]} and ${tokenNames[poolNow.tokens[1].toString()]}`);
        /*console.log("Current state")
        console.log(`${tokenNames[poolNow.tokens[0].toString()]}: ${formatBalance(now1)}`);
        console.log(`${tokenNames[poolNow.tokens[1].toString()]}: ${formatBalance(now2)}\n`);
        console.log("Before state");
        console.log(`${tokenNames[poolBefore.tokens[0].toString()]}: ${formatBalance(before1)}`);
        console.log(`${tokenNames[poolBefore.tokens[1].toString()]}: ${formatBalance(before2)}\n`);
        console.log("Diff of state")
        console.log(`${tokenNames[poolNow.tokens[0].toString()]}: ${formatBalance(now1.sub(before1))}`);
        console.log(`${tokenNames[poolNow.tokens[1].toString()]}: ${formatBalance(now2.sub(before2))}\n`);*/

        const id1 = await wallet.getToken(poolNow.tokens[0]);
        const id2 = await wallet.getToken(poolNow.tokens[1]);

        const data = [
            ['Now', id1.display, formatBalance(now1, id1.decimals)],
            ['Now', id2.display, formatBalance(now2, id2.decimals)],
            ['Before', id1.display, formatBalance(before1, id1.decimals)],
            ['Before', id2.display, formatBalance(before2, id2.decimals)],
            ['Diff', id1.display, formatBalance(now1.sub(before1), id1.decimals)],
            ['Diff', id2.display, formatBalance(now2.sub(before2), id2.decimals)],
        ] as [string, string, string][]

        table(
            data
        )
    }

    console.log();
    console.log("Net flow of AUSD to dexs excluding AUSD/iBTC: ", formatBalance(ausdSum));
})
