FROM node:14.14.0-buster-slim as base
RUN mkdir -p /home/papergirl && chown www-data:www-data /home/papergirl
USER www-data
WORKDIR /home/papergirl
RUN mkdir -p nginx/pid && \
    mkdir -p nginx/conf.d && \
    mkdir -p nginx/www/black && \
    mkdir -p nginx/www/red && \
    echo "root /home/papergirl/nginx/www/black;" > /home/papergirl/nginx/conf.d/root.conf && \
    echo "error_page 404 /404/index.html;" > /home/papergirl/nginx/conf.d/errors.conf
VOLUME [ "/home/papergirl/nginx" ]

FROM base AS build
USER root
RUN apt-get update && \
    apt-get install -y build-essential
WORKDIR /home/papergirl/app
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile
COPY --chown=node . ./

FROM base as development
RUN mkdir -p /home/papergirl/app
WORKDIR /home/papergirl/app
COPY --from=build --chown=node /home/papergirl/app ./
CMD yarn start:nodemon
EXPOSE 8080

FROM base as production
RUN mkdir -p /home/papergirl/app
WORKDIR /home/papergirl/app
COPY --from=build --chown=node /home/papergirl/app/*.json /home/papergirl/app/yarn.lock ./
RUN yarn --only=production --frozen-lockfile && \
    yarn cache clean --force >/dev/null 2>&1
COPY src ./src
RUN yarn build
COPY config ./config
CMD ["node", "dist/main.js"]
EXPOSE 8080