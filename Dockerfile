FROM node:18.2.0-buster-slim as base
RUN mkdir -p /home/papergirl && chown www-data:www-data /home/papergirl
USER www-data
WORKDIR /home/papergirl
RUN mkdir -p nginx/pid && \
    mkdir -p nginx/conf.d && \
    mkdir -p nginx/sites.d && \
    mkdir -p nginx/redirects.d && \
    mkdir -p nginx/www/black && \
    mkdir -p nginx/www/red
ENV FORCE_COLOR=1
VOLUME [ "/home/papergirl/nginx" ]

FROM base AS build
USER root
RUN apt-get update && \
    apt-get install -y build-essential
WORKDIR /home/papergirl/app
COPY package*.json ./
RUN npm install
COPY --chown=node . ./

FROM base as development
RUN mkdir -p /home/papergirl/app
WORKDIR /home/papergirl/app
COPY --from=build --chown=node /home/papergirl/app ./
CMD npm run start:nodemon
EXPOSE 8080

FROM development as production
RUN npm run build
USER root
RUN npm prune --production && \
    npm cache clean --force >/dev/null 2>&1
USER www-data
CMD ["node", "dist/main"]
EXPOSE 8080