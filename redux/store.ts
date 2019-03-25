

import { Store, createStore, applyMiddleware } from 'redux';
import ReduxThunk, { ThunkMiddleware } from 'redux-thunk';
import { RootState } from './states';
import { RootActions } from './actiontypes';
import { rootReducer } from './reducers';

interface Window { store: Store<RootState, RootActions> }
declare var window: Window;

export const configureStore = (initialState: Partial<RootState>, isServer: boolean, overwrite: Array<keyof RootState>) => {
    if (isServer && typeof window === "undefined") {
        return createStore<RootState, RootActions, {}, {}>(
            rootReducer,
            initialState,
            applyMiddleware(ReduxThunk as ThunkMiddleware<RootState, RootActions>)
        );
    } else {
        if (!window.store) {
            window.store = createStore<RootState, RootActions, {}, {}>(
                rootReducer,
                initialState,
                applyMiddleware(ReduxThunk as ThunkMiddleware<RootState, RootActions>)
            );
        } else {
            window.store.dispatch({
                type: "INIT_STORE",
                initialState,
                overwrite
            });
        }
        return window.store;
    }
};
