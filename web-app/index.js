#! /usr/bin/env -S deno run --allow-net

import { serve } from "https://deno.land/std@0.141.0/http/server.ts";

const port = 8080;

function handler(req) {
  return new Response("Hello, World!");
}

await serve(handler, { port });
