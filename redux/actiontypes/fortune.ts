import { Action } from 'redux';

export interface TellFortuneAction extends Action {
    type: 'TELL_FORTUNE';
    result: string;
}

export type FortuneActions = TellFortuneAction;
