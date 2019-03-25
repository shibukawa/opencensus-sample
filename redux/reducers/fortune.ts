import { FortuneState } from '../states/fortune';
import { FortuneActions } from '../actiontypes/fortune';

export function fortuneReducer({fortune} : FortuneState = {fortune: ''}, action: FortuneActions): FortuneState {
    switch (action.type) {
        case "TELL_FORTUNE":
            fortune = action.result;
            break;
    }
    return {fortune};
}
