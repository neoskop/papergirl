FROM node:22.22.0-bullseye-slim as base
RUN mkdir -p /home/papergirl && chown www-data:www-data /home/papergirl
USER www-data
WORKDIR /home/papergirl
RUN mkdir -p nginx/pid && \
    mkdir -p nginx/conf.d && \
    mkdir -p nginx/sites.d && \
    mkdir -p nginx/redirects.d && \
    mkdir -p nginx/www/black && \
    mkdir -p nginx/www/red && \
    mkdir -p app
ENV FORCE_COLOR=1
VOLUME [ "/home/papergirl/nginx" ]

FROM base AS build
USER root
RUN apt-get update && \
    apt-get install -y build-essential
WORKDIR /home/papergirl/app
COPY --chown=www-data package*.json ./
RUN npm install
COPY --chown=www-data . ./

FROM base as development
RUN mkdir -p /home/papergirl/app
WORKDIR /home/papergirl/app
COPY --from=build --chown=www-data /home/papergirl/app ./
ENV NODE_ENV=development
CMD ["node_modules/.bin/nodemon", "-w", "src/**/*", "-e", "ts", "--exec", "node --experimental-specifier-resolution=node --loader ts-node/esm -r tsconfig-paths/register ./src/main.ts"]
EXPOSE 8080

FROM development as production
USER www-data
RUN node_modules/.bin/tsc
USER root
RUN npm prune --production && \
    npm cache clean --force >/dev/null 2>&1
USER www-data
ENV NODE_ENV=production
CMD ["node","--experimental-specifier-resolution=node","dist/main.js"]
EXPOSE 8080