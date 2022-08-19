//polkaholic api key `6a0e22fd642a64a1bd010ee59df669d6 `

import fs from 'fs';
import { strict as assert } from 'assert';
import _ from 'lodash';

import axios from 'axios';

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
    const req = await api.post('/search/extrinsics', {
        chainIdentifier: "acala",
        section: "xtokens",
        blockNumberStart: FROM_BLOCK,
        blockNumberEnd: END_BLOCK,
    });
    const data = req.data;

    const success = data.filter((val: any) => val.result != 0);

    let txInfo: any[] = [];
    for (const info of success) {
        const reqTx = await api.get(`/tx/${info.extrinsicHash}`);
        txInfo.push(reqTx.data);
    }

    const json = JSON.stringify(txInfo, null, 2);
    fs.writeFileSync('xtokens.json', json);
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
