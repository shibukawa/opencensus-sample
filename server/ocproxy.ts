import { Span, SpanKind, RootSpan } from '@opencensus/core';
import * as tracing from '@opencensus/nodejs';
import * as WebSocket from 'ws';

type Message = {
    type: string,
    name: string,
    key: string,
    parentId?: string,
    spanId?: string
}

export function traceClient() {
    const wss = new WebSocket.Server({ port: 8889 });
    wss.on('connection', (ws) => {
        const spans = new Map<string, Span>();
        let rootSpan: RootSpan;
        ws.on('message', (rawMessage: string) => {
            const message = JSON.parse(rawMessage) as Message;
            switch (message.type) {
            case 'start-root-span':
            tracing.tracer.startRootSpan({name: message.name}, async newRootSpan => {
                    rootSpan = newRootSpan;
                    ws.send(JSON.stringify({
                            parentId: 'root',
                            traceId: rootSpan.traceId,
                            spanId: rootSpan.id
                        }
                    ));
                    spans.set(rootSpan.id, rootSpan);
                });
                break;
            case 'start-child-span': {
                try {
                    const span = rootSpan.startChildSpan(message.name, SpanKind.CLIENT);
                    ws.send(JSON.stringify(
                        {
                            key: message.key,
                            traceId: span.traceId,
                            spanId: span.id,
                            parentId: message.parentId
                        }
                    ));
                    spans.set(span.id, span);
                } catch (e) {
                    console.log(e);
                }
                break;
            }
            case 'end-span': {
                const span = spans.get(message.spanId as string);
                if (span !== undefined) {
                    span.end();
                    spans.delete(message.spanId as string);
                }
                break;
            }
            }
        });
        ws.on('close', () => {
            rootSpan.end();
        });
    });
}
