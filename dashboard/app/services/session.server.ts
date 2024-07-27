import { createCookieSessionStorage } from "@remix-run/node";
import { env } from "~/config/env.server";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session", // use any name you want here
    sameSite: "lax", // this helps with CSRF
    path: "/", // remember to add this so the cookie will work in all routes
    httpOnly: true, // for security reasons, make this cookie http only
    secrets: env.SESSION_SECRET, // replace this with an actual secret
    secure: env.NODE_ENV === "production", // enable this in prod only
  },
});
