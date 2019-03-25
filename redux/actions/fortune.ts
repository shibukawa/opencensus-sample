import { Dispatch } from "redux";
import { ThunkAction } from 'redux-thunk';

import { RootState } from '../states';
import { RootActions } from '../actiontypes';
import { tracer } from './access';
import axios from 'axios';

async function sleep(duration: number) {
    return new Promise<number>((resolve) => {
        setTimeout(resolve, duration);
    })
}

export function tellFortune(): ThunkAction<void, RootState, undefined, RootActions> {
    return async function(dispatch: Dispatch<RootActions>) {
        const rootSpan = await tracer('tellFortune action @front');
        try {
            await sleep(500);
            const childSpan = await rootSpan.startChildSpan('waiting server response @front');
            const response = await axios.get('/api/fortune', {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...childSpan.propagate()
                },
                responseType: 'json'
            });
            await sleep(500);
            childSpan.end();
            dispatch({type: 'TELL_FORTUNE', result: response.data.fortune});
        } finally {
            rootSpan.end();
        }
    };
}
