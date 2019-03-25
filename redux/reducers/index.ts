import { combineReducers, Reducer } from 'redux';

import { RootState } from '../states';
import { RootActions } from '../actiontypes';
import { fortuneReducer } from './fortune';

function initialReducer(state: RootState | undefined, action: RootActions): RootState {
    if (action.type === "INIT_STORE") {
        const newState: any = {};
        for (const [key, value] of Object.entries(action.initialState)) {
            if (action.overwrite.includes(key)) {
                newState[key] = value;
            }
        }
        state = Object.assign({}, state, newState);
    }
    return state as RootState;
};

const combinedReducer = combineReducers({
    fortune: fortuneReducer
})

export const rootReducer = (state: RootState | undefined, action: RootActions): RootState => {
    state = combinedReducer(state, action);
    state = initialReducer(state, action);
    return state;
};
