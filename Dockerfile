FROM node:18-alpine
# Without git installing the npm packages fails
RUN apk add git
RUN mkdir /app
WORKDIR /app
COPY . /app
# install python and other dependencies
RUN apk add python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev
# install pnpm
RUN npm i -g pnpm@9.0.4
RUN pnpm install
# only for prod
RUN pnpm run build
# ---
EXPOSE 8080
# uncomment for development
# EXPOSE 9090
# VOLUME /app/src
# VOLUME /app/prismarine-viewer
# ENTRYPOINT ["pnpm", "run", "run-all"]
# only for prod
ENTRYPOINT ["npm", "run", "prod-start"]
