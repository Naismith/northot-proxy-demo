import "isomorphic-fetch";
import Koa from "koa";
import dotenv from "dotenv";
import session from "koa-session";
import serve from "koa-static";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import proxy, { ApiVersion } from "@shopify/koa-shopify-graphql-proxy";
dotenv.config();

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  PORT = 3000,
  NODE_ENV = "development"
} = process.env;
const isProduction = NODE_ENV === "production";

const init = async () => {
  const app = new Koa();

  app.keys = [SHOPIFY_API_SECRET];

  app.use(session(app));
  app.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET,
      scopes: ["read_products", "write_products"],
      afterAuth(ctx) {
        const { shop, accessToken } = ctx.session;
        ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
        ctx.redirect("/");
      }
    })
  );

  app.use(proxy({ version: ApiVersion.January20 }));
  app.use(verifyRequest());
  app.use(async (ctx, next) => {
    ctx.body = "Hello World";
    // await next();
  });
  app.listen(PORT, () => `Server is now listening on http://localhost:${PORT}`);
};

init();
