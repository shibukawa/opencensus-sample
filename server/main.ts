import * as next from "next";
import * as http from 'http';
import * as express from 'express'
import { json } from 'body-parser';
import { Span, SpanKind, RootSpan, HeaderGetter } from '@opencensus/core';
import * as tracing from '@opencensus/nodejs';
import { JaegerTraceExporter } from '@opencensus/exporter-jaeger';
import { B3Format } from '@opencensus/propagation-b3';
import * as WebSocket from 'ws';

const options = {
  serviceName: 'fortune-server',
  //logger: logger.logger('debug'),
  //logLevel: 4
}
const exporter = new JaegerTraceExporter(options);
tracing.start({
    exporter,
    propagation: new B3Format()
});

function fortune() {
    const index = Math.floor(Math.random() * 7);
    const fortunes = ["大吉", "中吉", "小吉", "吉", "末吉", "凶", "大凶"];
    return fortunes[index];
}

async function sleep(duration: number) {
    return new Promise<number>((resolve) => {
        setTimeout(resolve, duration);
    })
}

function headGatter(headers: http.IncomingHttpHeaders): HeaderGetter {
return {
    getHeader(name: string): string | string[] | undefined {
      return headers[name];
    }
  };
};


function apiRouter() {
    const router = express.Router();
    router.use(json());

    router.get('/fortune', (req, res) => {
        const context = tracing.tracer.propagation.extract(headGatter(req.headers));
        tracing.tracer.startRootSpan({
            name: '/api/fortune @server',
            spanContext: context ? context : undefined
        }, async rootSpan => {
            //tracing.tracer.logger.error("test");
            await sleep(100);
            const childSpan = tracing.tracer.startChildSpan('thinking @server');
            await sleep(100);
            const result = fortune();
            //tracing.tracer.logger.warn(result);
            childSpan.end();
            await sleep(100);
            res.send({fortune: result});
            rootSpan.end();
        });
    })

    return router;
}

async function initServer() {
    const app = next({dev: true});
    const handle = app.getRequestHandler();
    await app.prepare();
    const server = express();
    server.use('/api', apiRouter())
    server.get("*", (req, res) => {
        return handle(req, res);
    });
    return server;
}

type Message = {
    type: string,
    name: string,
    key: string,
    parentId?: string,
    spanId?: string
}

function traceClient() {
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
                    ws.send(JSON.stringify(
                        {
                            parentId: 'root',
                            traceId: rootSpan.traceId,
                            spanId: rootSpan.id
                        }
                    ));
                    spans.set(rootSpan.id, rootSpan);
                    console.log(message.type, {
                        parentId: 'root',
                        traceId: rootSpan.traceId,
                        spanId: rootSpan.id
                    });
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
                    console.log(message.type, {
                        key: message.key,
                        traceId: span.traceId,
                        spanId: span.id,
                        parentId: message.parentId
                    })
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

async function main() {
    http.createServer(await initServer()).listen(8888, () => {
        console.log("start listing at 8888");
    });
    traceClient();
}

main();
