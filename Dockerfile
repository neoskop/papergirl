FROM node:12.13.0-buster as base
RUN adduser --uid 101 --system papergirl
USER papergirl
WORKDIR /home/papergirl
RUN mkdir -p nginx/pid && \
    mkdir -p nginx/conf.d && \
    mkdir -p nginx/www/black && \
    mkdir -p nginx/www/red && \
    echo "root /home/papergirl/nginx/www/black;" > root.conf
VOLUME [ "/home/papergirl/nginx" ]

FROM base AS build
USER root
RUN apt-get update && \
    apt-get install -y build-essential
WORKDIR /home/papergirl/app
COPY package.json yarn.lock ./
RUN yarn
COPY --chown=node . ./

FROM base as development
RUN mkdir -p /home/papergirl/app
WORKDIR /home/papergirl/app
COPY --from=build --chown=node /home/papergirl/app ./
CMD yarn start:nodemon

FROM base as production
RUN mkdir -p /home/papergirl/app
WORKDIR /home/papergirl/app
COPY --from=build --chown=node /home/papergirl/app/*.json /home/papergirl/app/yarn.lock ./
RUN yarn --only=production && \
    yarn cache clean --force >/dev/null 2>&1
COPY src ./src
RUN yarn build
COPY config ./config
CMD ["node", "dist/main.js"]