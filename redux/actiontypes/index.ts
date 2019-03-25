import { Action } from 'redux';
import { TellFortuneAction } from "./fortune";
import { RootState } from "redux/states";

export interface InitialAction extends Action {
    type: 'INIT_STORE';
    initialState: Partial<RootState>;
    overwrite: string[];
}


export type RootActions = TellFortuneAction | InitialAction;
