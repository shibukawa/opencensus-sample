class Tracer {
    private promises = new Map<any, (span: Span) => void>();
    constructor(private ws: WebSocket) {
    }
    async startRootSpan(): Promise<Span> {
        return new Promise<Span>(resolve => {
            this.ws.addEventListener('message', (event: any) => {
                const data = JSON.parse(event.data) as Message;
                if (data.parentId === 'root') {
                    resolve(new Span(this, data.traceId, data.spanId));
                } else {
                    const spanResolve = this.promises.get(data.key)
                    if (spanResolve) {
                        spanResolve(new Span(this, data.traceId, data.spanId, data.parentId));
                        this.promises.delete(data.key);
                    }
                }
            });
        })
    }

    async startChildSpan(name: string, parentId: string): Promise<Span> {
        return new Promise<Span>(resolve => {
            const key = Date.now();
            this.promises.set(key, resolve);
            this.ws.send(JSON.stringify({type: 'start-child-span', key, name, parentId}))
        });
    }

    end(spanId: string) {
        console.log("send end-span");
        this.ws.send(JSON.stringify({type: 'end-span', spanId}));
    }

    close() {
        this.ws.close();
    }
}

export class Span {
    constructor(private tracer: Tracer, private traceId: string, private spanId: string, private parentId?: string) {
    }

    async startChildSpan(name: string): Promise<Span> {
        return this.tracer.startChildSpan(name, this.spanId);
    }

    end() {
        if (this.parentId === undefined) {
            this.tracer.close();
        } else {
            this.tracer.end(this.spanId);
        }
    }

    propagate(header: {[key: string]: string} = {}): {[key: string]: string} {
        header['X-B3-TraceId'] = this.traceId;
        header['X-B3-SpanId'] = this.spanId;
        /*if (this.parentId) {
            header['X-B3-ParentSpanId'] = this.parentId;
        }*/
        header['X-B3-Sampled'] = '1';
        return header;
    }
}

type Message = {
    parentId: string;
    spanId: string;
    traceId: string;
    key: any;
};

export async function tracer(name: string): Promise<Span> {
    return new Promise<Span>(async resolve => {
        const ws = new WebSocket('ws://localhost:8889');
        const tracer = new Tracer(ws);
        ws.addEventListener('open', () => {
            ws.send(JSON.stringify({type: 'start-root-span', name}));
        });
        resolve(await tracer.startRootSpan());
    });
}
