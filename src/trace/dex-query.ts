//polkaholic api key `6a0e22fd642a64a1bd010ee59df669d6 `

import fs from 'fs';
import _ from 'lodash';
import promisify from 'util';

import axios from 'axios';

const sleep = (milliseconds: number) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const END_POINT = 'https://api.polkaholic.io';

export const api = axios.create({
    baseURL: END_POINT,
    headers: {
        'Authorization': '6a0e22fd642a64a1bd010ee59df669d6 ',
    }
});

const FROM_BLOCK = 1638215;
const END_BLOCK = 1639493;

const fetch_incentives_events = async () => {
    const row = 100
    const req = await api.post('/search/events?limit=10000', {
        chainIdentifier: "acala",
        section: "dex",
        blockNumberStart: FROM_BLOCK,
        result: 1,
    });
    const data = req.data;
    console.log(data.length)


    let txInfo: any[] = [];
    for (const info of data) {
        await sleep(250);
        const reqTx = await api.get(`/tx/${info.extrinsicHash}`);
        txInfo.push(reqTx.data);
    }

    const json = JSON.stringify(txInfo, null, 2);
    fs.writeFileSync('dex-events.json', json);
}

const main = async () => {
    try {
        await fetch_incentives_events();

        process.exit(0);
    } catch (err) {
        console.log('>>> err: ', err);
    }
};
main();
