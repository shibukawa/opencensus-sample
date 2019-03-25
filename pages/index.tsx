import React, {Component} from 'react';
import { Store } from 'redux';
import { Provider, connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { NextContext} from 'next';

import { RootState } from '../redux/states';
import { tellFortune } from '../redux/actions/fortune';
import { RootActions } from '../redux/actiontypes';
import { configureStore } from '../redux/store';

type IndexProps = {
    fortune: string
};

type DispatchProp = {
    dispatch: ThunkDispatch<RootState, undefined, RootActions>;
}

class Index extends Component<DispatchProp & IndexProps> {
    private tellFortune = () => {
        this.props.dispatch(tellFortune());
    };

    render() {
        return (
            <p>
                <h3>占い</h3>
                <button onClick={this.tellFortune}>占う</button>
                <h1>{this.props.fortune}</h1>
            </p>
        );
    }
}

function mapStateToProps(state: RootState): IndexProps {
    return {
        fortune: state.fortune.fortune
    };
}

const ConnectedIndex = connect<IndexProps, {}, {}, RootState>(mapStateToProps)(Index);

type InitialProps = {
    initialState: Partial<RootState>;
    isServer: boolean;
}

export default class IndexRootPage extends Component<InitialProps> {
    private store: Store<RootState, RootActions>;
    static async getInitialProps(context: NextContext) {
        return {
            initialState: {},
            isServer: !!context.req
        }
    }

    constructor(props: InitialProps) {
        super(props);
        this.store = configureStore(props.initialState, props.isServer, []);
    }

    render() {
        return (
            <Provider store={this.store}>
                <ConnectedIndex></ConnectedIndex>
            </Provider>
        );
    }
}

