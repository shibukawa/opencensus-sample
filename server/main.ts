import * as next from "next";
import * as http from 'http';
import * as express from 'express'
import { json } from 'body-parser';
import { HeaderGetter } from '@opencensus/core';
import * as tracing from '@opencensus/nodejs';
import { JaegerTraceExporter } from '@opencensus/exporter-jaeger';
import { B3Format } from '@opencensus/propagation-b3';
import { traceClient } from './ocproxy';

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


async function main() {
    http.createServer(await initServer()).listen(8888, () => {
        console.log("start listing at 8888");
    });
    traceClient();
}

main();
