import "isomorphic-fetch";
import Koa from "koa";
import dotenv from "dotenv";
import session from "koa-session";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import proxy, { ApiVersion } from "@shopify/koa-shopify-graphql-proxy";
import Router from "koa-router";

dotenv.config();

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  PORT = 3000,
  NODE_ENV = "development"
} = process.env;

const init = async () => {
  const app = new Koa();
  const router = new Router();

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

  router.get("/", (ctx, next) => {
    ctx.body = "Hello World";
  });

  router.get("/menu", (ctx, next) => {
    ctx.set("Content-Type", "application/liquid");
    ctx.body = `
		{%- layout none -%}
			{
				{% comment %}"menusHash": {
					{%- for linklist in linklists %}
						"{{ linklist.handle }}": {{ forloop.index0 }}{%- if forloop.last == false %},{% endif -%}
					{% endfor -%}
				},{% endcomment %}
				"menus": [{%- for linklist in linklists -%}
					{
						"handle": "{{ linklist.handle }}",
						"levels": {{ linklist.levels }},
						"title": "{{ linklist.title }}",
						"links": [{% for link in linklist.links %}{
								"title": "{{ link.title }}",
								"handle": "{{ link.handle }}",
								"linktype": "{{ link.type }}",
								"url": "{% if link.type != "http_link" %}{{ shop.url }}{% endif %}{{ link.url }}",
								"links": [
									{%- for linkLevel1 in link.links -%}
									{
										"title": "{{ linkLevel1.title }}",
										"handle": "{{ linkLevel1.handle }}",
										"url": "{% if linkLevel1.type != "http_link" %}{{ shop.url }}{% endif %}{{ linkLevel1.url }}",
										"links": [
											{%- for linkLevel2 in linkLevel1.links -%}
											{
												"title": "{{ linkLevel2.title }}",
												"url": "{% if linkLevel2.type != "http_link" %}{{ shop.url }}{% endif %}{{ linkLevel2.url }}"
											}
											{%- if forloop.last == false %},{% endif -%}
											{%- endfor -%}
										]
									}
									{%- if forloop.last == false %},{% endif -%}
									{%- endfor -%}
								]
							}
							{%- if forloop.last == false %},{% endif -%}
							{% endfor %}
						]
					}
					{%- if forloop.last == false -%},{%- endif -%}
					{%- endfor -%}
				]
			}
		`;
  });
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.listen(PORT, () => `Server is now listening on http://localhost:${PORT}`);
};

init();
